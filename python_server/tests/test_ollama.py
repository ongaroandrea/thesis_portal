import base64
import json

import pytest

from app.ollama import main as ollama


def test_camera_payload_reads_prompt_and_uses_camera_configuration(monkeypatch) -> None:
    monkeypatch.setattr(
        ollama,
        "MODELS",
        {
            **ollama.MODELS,
            "camera": {
                "model": "camera-vision-model",
                "prompt": "prompt.txt",
                "parameter_explanation": True,
                "magnitude": True,
                "think": False,
            },
        },
    )

    payload = ollama.build_ollama_payload(b"reference", b"submission", "camera")

    assert payload["model"] == "camera-vision-model"
    assert payload["think"] is False
    assert "Dataset camera-operation conventions" in payload["messages"][0]["content"]
    assert "ABSOLUTE EXCLUSIONS" in payload["messages"][1]["content"]
    assert "Magnitude estimation is enabled" in payload["messages"][1]["content"]
    assert payload["messages"][1]["images"] == [
        base64.b64encode(b"reference").decode("ascii"),
        base64.b64encode(b"submission").decode("ascii"),
    ]


def test_camera_prompt_can_disable_explanation_and_magnitude() -> None:
    system_prompt, user_prompt = ollama.build_prompt(
        "camera",
        {
            "prompt": "prompt.txt",
            "parameter_explanation": False,
            "magnitude": False,
        }
    )

    assert "Dataset camera-operation conventions" not in system_prompt
    assert "Magnitude estimation is disabled" in user_prompt


def test_light_category_uses_lights_prompt_directory() -> None:
    system_prompt, user_prompt = ollama.build_prompt(
        "light",
        {
            "prompt": "prompt.txt",
            "parameter_explanation": True,
            "magnitude": True,
        },
    )

    assert "lighting" in system_prompt.lower()
    assert "lighting" in user_prompt.lower()


def test_prompt_filename_cannot_escape_category_directory() -> None:
    with pytest.raises(ValueError, match="Invalid prompt filename"):
        ollama.read_prompt_file("camera", "../texture/prompt.txt")


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

    assert ollama.process_ollama(b"reference", b"submission", "camera") == expected


def test_disabled_magnitude_is_enforced_on_model_output(monkeypatch) -> None:
    monkeypatch.setattr(
        ollama,
        "MODELS",
        {
            **ollama.MODELS,
            "camera": {
                **ollama.MODELS["camera"],
                "magnitude": False,
            },
        },
    )
    model_result = {
        "analysis": {
            "changed_parameters": [
                {"parameter": "yaw", "magnitude": "high"},
                {"parameter": "pitch", "magnitude": "small"},
            ]
        }
    }
    response_body = json.dumps(
        {"message": {"content": json.dumps(model_result)}}
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

    result = ollama.process_ollama(b"reference", b"submission", "camera")
    assert [
        item["magnitude"] for item in result["analysis"]["changed_parameters"]
    ] == ["none", "none"]
