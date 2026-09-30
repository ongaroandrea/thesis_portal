"""Ollama integration used by the image-analysis queue.

The per-category settings intentionally live in this file so changing the
camera model or prompt behaviour does not require editing the API processor.
"""

from __future__ import annotations

import base64
import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from ..functions.common import read_text_file
from ..functions.prompts import compose_instruction_prompt


BASE_DIR = Path(__file__).resolve().parents[1]
PROMPTS_DIR = BASE_DIR / "input" / "prompts"
PROMPT_DOMAINS = {
    "camera": "camera",
    "texture": "texture",
    "light": "lights",
    "material": "material",
}

# Edit these values to select the model and camera prompt behaviour.
MODELS: dict[str, dict[str, Any] | str] = {
    "camera": {
        "model": "qwen3.8:27b",
        "prompt": "prompt.txt",
        "parameter_explanation": True,
        "magnitude": True,
        "think": True,
        "timeout_seconds": 15 * 60,
    },
    "texture": {
        "model": "qwen3.8:27b",
        "prompt": "prompt.txt",
        "parameter_explanation": True,
        "magnitude": True,
        "think": True,
        "timeout_seconds": 15 * 60,
    },
    "light": {
        "model": "qwen3.8:27b",
        "prompt": "prompt.txt",
        "parameter_explanation": True,
        "magnitude": True,
        "think": True,
        "timeout_seconds": 15 * 60,
    },
    "material": {
        "model": "qwen3.8:27b",
        "prompt": "prompt.txt",
        "parameter_explanation": True,
        "magnitude": True,
        "think": True,
        "timeout_seconds": 15 * 60,
    },
}


def _ollama_chat_url() -> str:
    return os.getenv(
        "OLLAMA_CHAT_URL", "http://host.docker.internal:11434/api/chat"
    ).rstrip("/")


def _category_config(category: str) -> dict[str, Any]:
    category = str(category).strip().lower()
    raw_config = MODELS.get(category)
    if raw_config is None:
        supported = ", ".join(sorted(MODELS))
        raise ValueError(
            f"Unsupported analysis type {category!r}; expected one of: {supported}."
        )

    if isinstance(raw_config, str):
        return {"model": raw_config}
    if not isinstance(raw_config, dict):
        raise TypeError(f"Invalid model configuration for {category!r}.")

    config = dict(raw_config)
    model = str(config.get("model", "")).strip()
    if not model:
        raise ValueError(f"No model configured for analysis type {category!r}.")
    config["model"] = model
    return config


def read_prompt_file(category: str, filename: str) -> str:
    """Read a category prompt and reject paths outside its prompt directory."""
    category_dir = (PROMPTS_DIR / category).resolve()
    prompt_path = (category_dir / filename).resolve()

    if prompt_path.parent != category_dir:
        raise ValueError(f"Invalid prompt filename {filename!r}.")
    if not prompt_path.is_file():
        raise FileNotFoundError(f"Prompt file not found: {prompt_path}")

    prompt = read_text_file(prompt_path)
    if not prompt:
        raise ValueError(f"Prompt file is empty: {prompt_path}")
    return prompt


def build_prompt(
    category: str,
    config: dict[str, Any] | None = None,
) -> tuple[str, str]:
    """Return the configured system and evaluation prompts for a category."""
    category = str(category).strip().lower()
    config = dict(config or _category_config(category))
    try:
        prompt_domain = PROMPT_DOMAINS[category]
    except KeyError as exc:
        supported = ", ".join(sorted(PROMPT_DOMAINS))
        raise ValueError(
            f"Unsupported prompt category {category!r}; expected one of: {supported}."
        ) from exc
    include_explanation = bool(config.get("parameter_explanation", False))
    include_magnitude = bool(config.get("magnitude", True))

    system_prompt = compose_instruction_prompt(
        prompt_domain,
        include_parameter_explanation=include_explanation,
    )
    evaluation_prompt = read_prompt_file(
        prompt_domain, str(config.get("prompt", "prompt.txt"))
    )

    if include_magnitude:
        magnitude_instruction = (
            "Magnitude estimation is enabled. For every detected change, return "
            "small, medium, or high; every unchanged parameter must use none."
        )
    else:
        magnitude_instruction = (
            "Magnitude estimation is disabled. Preserve the required JSON field, "
            "but set magnitude to none for every parameter."
        )

    user_prompt = (
        "Image A is the first image and is the reference render. Image B is the "
        "second image and is the submitted render.\n\n"
        f"Evaluation instruction:\n\n{evaluation_prompt}\n\n"
        f"Magnitude setting:\n\n{magnitude_instruction}"
    )
    return system_prompt, user_prompt


def _image_base64(image: bytes | bytearray | memoryview) -> str:
    if not image:
        raise ValueError("Ollama images cannot be empty.")
    return base64.b64encode(bytes(image)).decode("ascii")


def build_ollama_payload(
    image_a: bytes,
    image_b: bytes,
    category: str = "camera",
) -> dict[str, Any]:
    """Build the Ollama chat payload without performing network I/O."""
    category = str(category).strip().lower()
    config = _category_config(category)
    system_prompt, user_prompt = build_prompt(category, config)
    payload: dict[str, Any] = {
        "model": config["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": user_prompt,
                "images": [_image_base64(image_a), _image_base64(image_b)],
            },
        ],
        "format": "json",
        "stream": False,
        "think": bool(config.get("think", True)),
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


def _apply_output_settings(
    result: dict[str, Any], config: dict[str, Any]
) -> dict[str, Any]:
    """Enforce switches that must not depend on model instruction-following."""
    if bool(config.get("magnitude", True)):
        return result

    analysis = result.get("analysis")
    if not isinstance(analysis, dict):
        return result
    changed_parameters = analysis.get("changed_parameters")
    if not isinstance(changed_parameters, list):
        return result

    for parameter in changed_parameters:
        if isinstance(parameter, dict):
            parameter["magnitude"] = "none"
    return result


def process_ollama(
    image_a: bytes,
    image_b: bytes,
    category: str = "camera",
) -> dict[str, Any]:
    """Analyze Image B against reference Image A with the configured model."""
    config = _category_config(category)
    payload = build_ollama_payload(image_a, image_b, category)
    request = urllib.request.Request(
        _ollama_chat_url(),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=float(config.get("timeout_seconds", 15 * 60)),
        ) as response:
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

    return _apply_output_settings(_extract_json_object(response_data), config)
