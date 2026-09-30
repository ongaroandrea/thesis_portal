import time
from io import BytesIO

import httpx
from fastapi.testclient import TestClient
from fastapi.routing import APIRoute
from PIL import Image

from app.main import app, settings
from app.config import Settings
from app.security import create_signature


def test_development_mode_parses_boolean_environment_values() -> None:
    common = {"hmac_secret": "x" * 32}

    assert Settings(**common, development_mode="true").development_mode is True
    assert Settings(**common, development_mode="False").development_mode is False


def test_delete_job_declares_an_empty_204_response() -> None:
    route = next(
        route
        for route in app.routes
        if isinstance(route, APIRoute)
        and route.path == "/v1/jobs/{job_id}"
        and "DELETE" in route.methods
    )

    assert route.status_code == 204
    assert route.response_model is None
    assert route.response_class.__name__ == "Response"


def test_signed_multipart_upload_can_read_body_after_form_parsing() -> None:
    image_buffer = BytesIO()
    Image.new("RGB", (1, 1), color="white").save(image_buffer, format="PNG")

    unsigned_request = httpx.Request(
        "POST",
        "http://testserver/v1/jobs",
        data={"type": "camera"},
        files={
            "image": ("test.png", image_buffer.getvalue(), "image/png"),
            "reference_image": ("reference.png", image_buffer.getvalue(), "image/png"),
        },
    )
    body = unsigned_request.read()
    timestamp = str(int(time.time()))
    nonce = "multipart-regression-test"
    signature = create_signature(
        settings.hmac_secret,
        "POST",
        "/v1/jobs",
        timestamp,
        nonce,
        body,
    )

    with TestClient(app) as client:
        response = client.post(
            "/v1/jobs",
            content=body,
            headers={
                "Content-Type": unsigned_request.headers["Content-Type"],
                "X-Request-Timestamp": timestamp,
                "X-Request-Nonce": nonce,
                "X-Request-Signature": signature,
            },
        )

    assert response.status_code == 202
