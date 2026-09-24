import time

from app.security import canonical_request, create_signature


def test_signature_uses_the_exact_body_and_request_metadata() -> None:
    timestamp = str(int(time.time()))
    signature = create_signature(
        "a" * 32,
        "post",
        "/v1/jobs?source=web",
        timestamp,
        "test-nonce",
        b'{"prompt":"hello"}',
    )

    assert signature.startswith("v1=")
    assert len(signature) == 67
    assert canonical_request(
        "POST",
        "/v1/jobs?source=web",
        timestamp,
        "test-nonce",
        b'{"prompt":"hello"}',
    ).count(b"\n") == 4

