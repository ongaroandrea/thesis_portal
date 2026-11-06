"""Transport-only Ollama client for immutable SvelteKit analysis jobs."""

from __future__ import annotations

import base64
import json
import os
import re
import urllib.error
import urllib.request
from typing import Any


def _ollama_chat_url() -> str:
    return os.getenv(
        "OLLAMA_CHAT_URL", "http://host.docker.internal:11434/api/chat"
    ).rstrip("/")


def _required_text(value: str, name: str, maximum: int = 50_000) -> str:
    normalized = str(value).strip()
    if not normalized:
        raise ValueError(f"{name} cannot be empty.")
    if len(normalized) > maximum:
        raise ValueError(f"{name} cannot exceed {maximum} characters.")
    return normalized


def _image_base64(image: bytes | bytearray | memoryview) -> str:
    if not image:
        raise ValueError("Ollama images cannot be empty.")
    return base64.b64encode(bytes(image)).decode("ascii")


def build_ollama_payload(
    image_a: bytes,
    image_b: bytes,
    *,
    model: str,
    system_prompt: str,
    user_prompt: str,
    output_schema: dict[str, Any],
) -> dict[str, Any]:
    """Build a model request from the complete, server-authored job payload.

    Both images go in the single user message, in order A (reference) then B
    (submission). ``OLLAMA_NUM_CTX`` / ``OLLAMA_NUM_PREDICT`` env vars, when
    set, are forwarded as Ollama ``options``. Raises ``ValueError`` on empty
    or oversized text fields, empty images or a non-object schema.
    """
    if not isinstance(output_schema, dict) or not output_schema:
        raise ValueError("output_schema must be a non-empty JSON object.")
    payload: dict[str, Any] = {
        "model": _required_text(model, "model", 200),
        "messages": [
            {"role": "system", "content": _required_text(system_prompt, "system_prompt")},
            {
                "role": "user",
                "content": _required_text(user_prompt, "user_prompt"),
                "images": [_image_base64(image_a), _image_base64(image_b)],
            },
        ],
        "format": output_schema,
        "stream": False,
    }
    options: dict[str, Any] = {}
    if os.getenv("OLLAMA_NUM_CTX"):
        options["num_ctx"] = int(os.environ["OLLAMA_NUM_CTX"])
    if os.getenv("OLLAMA_NUM_PREDICT"):
        options["num_predict"] = int(os.environ["OLLAMA_NUM_PREDICT"])
    if options:
        payload["options"] = options
    return payload


def _extract_json_object(response_data: dict[str, Any]) -> dict[str, Any]:
    """Pull the model's JSON answer out of an Ollama /api/chat response.

    Accepts ``message.content`` either as an object or as a string; a string
    may be wrapped in a Markdown code fence, which is stripped before parsing.
    Raises ``ValueError`` if no JSON object can be recovered.
    """
    message = response_data.get("message", {})
    content = message.get("content") if isinstance(message, dict) else None
    if isinstance(content, dict):
        return content
    if not isinstance(content, str) or not content.strip():
        raise ValueError("Ollama response does not contain message.content.")
    text = content.strip()
    fenced_match = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if fenced_match:
        text = fenced_match.group(1)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError("Ollama returned invalid JSON in message.content.") from exc
    if not isinstance(parsed, dict):
        raise ValueError("Ollama response JSON must be an object.")
    return parsed


def process_ollama(
    image_a: bytes,
    image_b: bytes,
    *,
    model: str,
    system_prompt: str,
    user_prompt: str,
    output_schema: dict[str, Any],
    timeout_seconds: float,
) -> dict[str, Any]:
    """Send one blocking, non-streaming chat request to Ollama.

    ``image_a`` is the instructor reference and ``image_b`` the student
    submission; the order matters because the prompts refer to "Image A" and
    "Image B". The JSON schema is passed as Ollama's ``format`` so the model
    is constrained to structured output. Runs in a worker thread (see
    ``processor.process_image``). Network and HTTP errors are re-raised as
    ``RuntimeError`` so the queue records them as the job error.
    """
    payload = build_ollama_payload(
        image_a,
        image_b,
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        output_schema=output_schema,
    )
    request = urllib.request.Request(
        _ollama_chat_url(),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace").strip()
        suffix = f": {details}" if details else ""
        raise RuntimeError(f"Ollama request failed with HTTP {exc.code}{suffix}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(
            f"Could not reach Ollama at {_ollama_chat_url()}: {exc.reason}"
        ) from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError("Ollama returned a non-JSON HTTP response.") from exc
    return _extract_json_object(response_data)
