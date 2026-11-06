from __future__ import annotations

import asyncio
import hashlib
import hmac
import time
from collections import OrderedDict

from fastapi import HTTPException, Request, status

from .config import Settings

TIMESTAMP_HEADER = "X-Request-Timestamp"
NONCE_HEADER = "X-Request-Nonce"
SIGNATURE_HEADER = "X-Request-Signature"


def canonical_request(
    method: str,
    path_with_query: str,
    timestamp: str,
    nonce: str,
    body: bytes,
) -> bytes:
    """Build the exact byte string that is signed.

    Format: METHOD, path+query, timestamp, nonce and the SHA-256 hex digest of
    the raw body, joined by newlines. The SvelteKit client must build the same
    string byte for byte, otherwise every signature check fails.
    """
    body_hash = hashlib.sha256(body).hexdigest()
    return "\n".join(
        (method.upper(), path_with_query, timestamp, nonce, body_hash)
    ).encode("utf-8")


def create_signature(
    secret: str,
    method: str,
    path_with_query: str,
    timestamp: str,
    nonce: str,
    body: bytes,
) -> str:
    """Return the ``v1=<hex HMAC-SHA256>`` value expected in the signature header."""
    digest = hmac.new(
        secret.encode("utf-8"),
        canonical_request(method, path_with_query, timestamp, nonce, body),
        hashlib.sha256,
    ).hexdigest()
    return f"v1={digest}"


class HmacVerifier:
    """Validate signatures and reject nonce reuse inside the allowed time window."""

    def __init__(self, settings: Settings) -> None:
        self._secret = settings.hmac_secret
        self._max_age = settings.hmac_max_age_seconds
        self._seen_nonces: OrderedDict[str, int] = OrderedDict()
        self._nonce_lock = asyncio.Lock()

    async def verify(self, request: Request) -> None:
        """Authenticate a request or raise ``HTTPException``.

        Checks, in order: required headers present and plausibly sized,
        timestamp within ``hmac_max_age_seconds`` of now, signature matches
        (constant-time compare), and nonce not seen within the window
        (409 on replay). Relies on ``BodyCachingRoute`` so the raw body is
        still readable after multipart parsing.
        """
        timestamp = request.headers.get(TIMESTAMP_HEADER, "")
        nonce = request.headers.get(NONCE_HEADER, "")
        provided = request.headers.get(SIGNATURE_HEADER, "")

        if not timestamp or not nonce or not provided:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Permission denied"
            )

        if len(timestamp) > 20 or len(nonce) > 128 or len(provided) != 67:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication headers",
            )

        try:
            timestamp_number = int(timestamp)
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid request timestamp",
            ) from error

        now = int(time.time())
        if abs(now - timestamp_number) > self._max_age:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Request timestamp is outside the allowed window",
            )

        body = await request.body()
        path_with_query = request.url.path
        if request.url.query:
            path_with_query = f"{path_with_query}?{request.url.query}"
        expected = create_signature(
            self._secret,
            request.method,
            path_with_query,
            timestamp,
            nonce,
            body,
        )
        if not hmac.compare_digest(provided, expected):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid request signature",
            )

        # Check and store atomically so simultaneous replays cannot both pass.
        async with self._nonce_lock:
            self._remove_expired_nonces(now)
            if nonce in self._seen_nonces:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Request nonce has already been used",
                )
            self._seen_nonces[nonce] = now

    def _remove_expired_nonces(self, now: int) -> None:
        """Forget nonces older than the timestamp window (oldest first)."""
        cutoff = now - self._max_age
        while self._seen_nonces:
            _, seen_at = next(iter(self._seen_nonces.items()))
            if seen_at >= cutoff:
                break
            self._seen_nonces.popitem(last=False)
