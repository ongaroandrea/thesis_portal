import base64
import json

import pytest

from app.ollama import main as ollama


PROMPT_ARGS = {
    "model": "qwen3.8:27b",
    "system_prompt": "System evaluation rules",
    "user_prompt": "Compare Image B with Image A",
    "output_schema": {"type": "object"},
}


def test_payload_uses_complete_server_authored_prompt() -> None:
    payload = ollama.build_ollama_payload(
        b"reference", b"submission", **PROMPT_ARGS
    )

    assert payload["model"] == "qwen3.8:27b"
    assert payload["format"] == {"type": "object"}
    assert payload["messages"][0]["content"] == "System evaluation rules"
    assert payload["messages"][1]["content"] == "Compare Image B with Image A"
    assert payload["messages"][1]["images"] == [
        base64.b64encode(b"reference").decode("ascii"),
        base64.b64encode(b"submission").decode("ascii"),
    ]


def test_payload_rejects_empty_prompt_and_schema() -> None:
    with pytest.raises(ValueError, match="system_prompt cannot be empty"):
        ollama.build_ollama_payload(
            b"reference", b"submission", **{**PROMPT_ARGS, "system_prompt": " "}
        )
    with pytest.raises(ValueError, match="output_schema"):
        ollama.build_ollama_payload(
            b"reference", b"submission", **{**PROMPT_ARGS, "output_schema": {}}
        )


def test_process_ollama_returns_parsed_assistant_json(monkeypatch) -> None:
    expected = {"analysis": {"general_description": "camera result"}}
    response_body = json.dumps(
        {"message": {"content": json.dumps(expected)}}
    ).encode("utf-8")

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def read(self) -> bytes:
            return response_body

    monkeypatch.setattr(
        ollama.urllib.request,
        "urlopen",
        lambda *_args, **_kwargs: FakeResponse(),
    )

    assert ollama.process_ollama(
        b"reference", b"submission", timeout_seconds=10, **PROMPT_ARGS
    ) == expected
