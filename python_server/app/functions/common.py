import base64
import math
import json
import mimetypes
import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from zoneinfo import ZoneInfo


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
_PRINTED_CONTEXT_ESTIMATE_KEYS = set()
CONTEXT_LENGTH_EXIT_CODE = 125
DEFAULT_MODEL_PROVIDER = "ollama"
DEFAULT_QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
REPORT_DIR_NAMES = {
    "camera": "camera_data",
    "lights": "lights_chat",
    "material": "material_chat",
    "texture": "texture_chat",
}


def load_env_file(path=None):
    """Load a simple .env file without overriding exported variables."""
    env_path = Path(path) if path else Path(__file__).resolve().parents[1] / ".env"

    if not env_path.is_file():
        return False

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip()

        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
            continue

        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]

        os.environ.setdefault(name, value)

    return True


load_env_file()


def _int_env(name, default):
    value = os.getenv(name)
    if value is None:
        return default

    try:
        return int(value)
    except ValueError:
        return default


def required_positive_int_env(name):
    """Read a positive integer that must be configured in the environment."""
    value = os.getenv(name)

    if value is None or not value.strip():
        raise RuntimeError(
            f"{name} must be set in 2_generate/.env (see .env.sample)."
        )

    try:
        parsed = int(value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a positive integer, got {value!r}.") from exc

    if parsed <= 0:
        raise RuntimeError(f"{name} must be greater than zero, got {parsed}.")

    return parsed


def _float_env(name, default):
    value = os.getenv(name)
    if value is None:
        return default

    try:
        return float(value)
    except ValueError:
        return default


def parse_bool_env(name, default=False):
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() not in {"0", "false", "no", "off", ""}


@dataclass(frozen=True)
class RunnerConfig:
    input_dir: Path
    prompts_dir: Path
    report_base_dir: Path
    ollama_chat_url: str
    models: tuple[str, ...]


def configured_models():
    """Return the model list from the single deploy-time source: .env."""
    raw_models = os.getenv("MODELS", "")
    models = tuple(model.strip() for model in raw_models.split(",") if model.strip())

    if not models:
        raise RuntimeError("MODELS must list at least one model in 2_generate/.env.")

    return models


def runner_config(category):
    """Build the shared filesystem and provider configuration for a runner."""
    category = str(category).strip().lower()

    try:
        report_dir_name = REPORT_DIR_NAMES[category]
    except KeyError as exc:
        supported = ", ".join(sorted(REPORT_DIR_NAMES))
        raise ValueError(
            f"Unknown runner category {category!r}; expected one of: {supported}."
        ) from exc

    input_dir = Path("input")
    return RunnerConfig(
        input_dir=input_dir,
        prompts_dir=input_dir / "prompts" / category,
        report_base_dir=Path("output") / "reports" / report_dir_name,
        ollama_chat_url=ollama_chat_url(),
        models=configured_models(),
    )


def chat_provider_name():
    return os.getenv(
        "MODEL_PROVIDER",
        os.getenv("CHAT_PROVIDER", DEFAULT_MODEL_PROVIDER),
    ).strip().lower()


def using_openai_api():
    return chat_provider_name() == "openai"


def should_check_model_gpu():
    return chat_provider_name() == "ollama"


def ollama_chat_url():
    explicit_chat_url = os.getenv("OLLAMA_CHAT_URL")
    if explicit_chat_url:
        return explicit_chat_url.rstrip("/")

    base_url = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434").rstrip("/")
    parts = urlsplit(base_url)
    path = parts.path.rstrip("/")

    if path.endswith("/api/chat"):
        return base_url

    if path.endswith("/api/generate"):
        path = path[: -len("/generate")] + "/chat"
        return urlunsplit(parts._replace(path=path))

    return base_url + "/api/chat"


def build_ollama_options():
    return {
        "num_ctx": required_positive_int_env("OLLAMA_NUM_CTX"),
        "num_predict": required_positive_int_env("OLLAMA_NUM_PREDICT"),
        "num_gpu": _int_env("OLLAMA_NUM_GPU", -1),
    }


def _estimate_text_tokens(text):
    # A tokenizer-free estimate: English/code-ish prompts usually land near
    # 3-4 chars/token. This intentionally errs slightly high.
    return max(1, math.ceil(len(str(text or "")) / 3.5))


def is_qwen_model(model):
    return str(model or "").strip().lower().startswith("qwen")


def _provider_max_output_tokens(provider, model=None):
    if provider == "openai":
        if is_qwen_model(model):
            return None
        return _int_env("OPENAI_MAX_OUTPUT_TOKENS", 4096)

    return required_positive_int_env("OLLAMA_NUM_PREDICT")


def _provider_context_window(provider):
    if provider == "openai":
        return _int_env("OPENAI_CONTEXT_LENGTH", 0)

    return required_positive_int_env("OLLAMA_NUM_CTX")


def estimate_context_length(prompt, image_count=0, model=None):
    provider = chat_provider_name()
    text_tokens = _estimate_text_tokens(prompt)
    image_tokens = image_count * _int_env("IMAGE_TOKENS_PER_IMAGE", 576)
    output_tokens = _provider_max_output_tokens(provider, model=model)
    reserved_output_tokens = output_tokens or 0

    return {
        "provider": provider,
        "text_tokens": text_tokens,
        "image_count": image_count,
        "image_tokens": image_tokens,
        "input_tokens": text_tokens + image_tokens,
        "max_output_tokens": output_tokens,
        "required_context_tokens": text_tokens + image_tokens + reserved_output_tokens,
        "configured_context_tokens": _provider_context_window(provider),
    }


def estimate_context_length_from_payload(payload):
    text_parts = []
    image_count = 0

    for message in payload.get("messages", []):
        content = message.get("content", "")
        if isinstance(content, str):
            text_parts.append(content)
        elif isinstance(content, list):
            for part in content:
                if not isinstance(part, dict):
                    continue
                if part.get("type") == "text":
                    text_parts.append(str(part.get("text") or ""))
                elif part.get("type") == "image_url":
                    image_count += 1

        images = message.get("images", [])
        if isinstance(images, list):
            image_count += len(images)

    return estimate_context_length(
        "\n".join(text_parts),
        image_count=image_count,
        model=payload.get("model"),
    )


def print_context_estimate(estimate, model=None, category=None):
    if not parse_bool_env("PRINT_CONTEXT_ESTIMATE", default=True):
        return

    key = (
        estimate.get("provider"),
        str(model or "").strip(),
        str(category or "unknown").strip(),
    )

    if key in _PRINTED_CONTEXT_ESTIMATE_KEYS:
        return

    _PRINTED_CONTEXT_ESTIMATE_KEYS.add(key)

    configured = estimate.get("configured_context_tokens") or 0
    configured_text = f", configured_ctx≈{configured}" if configured else ""
    warning_text = ""
    if configured and estimate["required_context_tokens"] > configured:
        warning_text = " WARNING: estimated context exceeds configured context"

    max_output_text = (
        str(estimate["max_output_tokens"])
        if estimate["max_output_tokens"] is not None
        else "provider-managed (no requested limit)"
    )

    print(
        "Context estimate before request: "
        f"provider={estimate['provider']}, "
        f"model={model or 'unknown'}, "
        f"category={category or 'unknown'}, "
        f"text≈{estimate['text_tokens']} tokens, "
        f"images={estimate['image_count']}×≈{_int_env('IMAGE_TOKENS_PER_IMAGE', 576)} "
        f"({estimate['image_tokens']} tokens), "
        f"input≈{estimate['input_tokens']}, "
        f"max_output={max_output_text}, "
        f"needed≈{estimate['required_context_tokens']}"
        f"{configured_text}"
        f"{warning_text}"
    )


def enforce_context_budget(estimate, model=None, category=None):
    configured = estimate.get("configured_context_tokens") or 0

    if not configured:
        return

    needed = estimate["required_context_tokens"]
    if needed <= configured:
        return

    print(
        "Stopping before request: estimated context length exceeds available "
        f"context for provider={estimate['provider']}, "
        f"model={model or 'unknown'}, category={category or 'unknown'} "
        f"(needed≈{needed}, configured_ctx≈{configured})."
    )

    raise SystemExit(CONTEXT_LENGTH_EXIT_CODE)


@dataclass
class DatasetSpec:
    name: str
    root: Path
    professor_dir: Path
    student_dir: Path
    dataset_type: str = ""


def encode_image(image_path: Path) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def image_data_uri(image_path: Path) -> str:
    mime_type, _ = mimetypes.guess_type(str(image_path))
    if not mime_type:
        mime_type = "image/png"

    return f"data:{mime_type};base64,{encode_image(image_path)}"


def build_chat_payload(model, prompt, professor_image, student_image, think=True):
    provider = chat_provider_name()

    if provider == "ollama":
        context_estimate = estimate_context_length(
            prompt,
            image_count=2,
            model=model,
        )
        ollama_options = build_ollama_options()
        context_estimate["configured_context_tokens"] = ollama_options["num_ctx"]

        return {
            "_context_estimate": context_estimate,
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                    "images": [
                        encode_image(professor_image),
                        encode_image(student_image),
                    ],
                }
            ],
            "stream": False,
            "think": think,
            "format": "json",
            "keep_alive": "5m",
            "options": ollama_options,
        }

    if provider == "openai":
        payload = {
            "_context_estimate": estimate_context_length(
                prompt,
                image_count=2,
                model=model,
            ),
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": image_data_uri(professor_image)},
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": image_data_uri(student_image)},
                        },
                    ],
                }
            ],
            "stream": False,
        }

        if not is_qwen_model(model):
            payload["max_completion_tokens"] = _int_env(
                "OPENAI_MAX_OUTPUT_TOKENS",
                4096,
            )

        if os.getenv("OPENAI_TEMPERATURE") is not None:
            payload["temperature"] = _float_env("OPENAI_TEMPERATURE", 0.0)

        if parse_bool_env("OPENAI_JSON_MODE", default=True):
            payload["response_format"] = {"type": "json_object"}

        if is_qwen_model(model):
            reasoning_effort = os.getenv("QWEN_REASONING_EFFORT", "").strip()
            #TODO: Change across models
            if reasoning_effort:
                payload["extra_body"] = {
                    "enable_thinking": True,
                }
            else:
                payload["extra_body"] = {
                    "enable_thinking": parse_bool_env(
                        "QWEN_ENABLE_THINKING",
                        default=False,
                    )
                }

        return payload

    raise ValueError(f"Unsupported MODEL_PROVIDER={provider!r}; use 'ollama' or 'openai'.")


class OpenAIResponseAdapter:
    """Expose the response attributes used by the existing chat runners."""

    def __init__(self, response):
        self._data = response.model_dump(mode="json")
        self.text = response.model_dump_json(indent=2)

    def json(self):
        return self._data

    def raise_for_status(self):
        return None


def send_chat_request(ollama_chat_url, payload, timeout_seconds, metadata=None):
    import requests

    provider = chat_provider_name()
    context_estimate = payload.get("_context_estimate") if isinstance(payload, dict) else None
    request_payload = {
        key: value
        for key, value in payload.items()
        if key != "_context_estimate"
    }

    estimate = context_estimate or estimate_context_length_from_payload(request_payload)
    model = request_payload.get("model")
    category = (metadata or {}).get("prompt_category") or (metadata or {}).get("category")

    print_context_estimate(
        estimate,
        model=model,
        category=category,
    )
    enforce_context_budget(
        estimate,
        model=request_payload.get("model"),
        category=category,
    )

    if provider == "openai":
        try:
            import openai
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError(
                "MODEL_PROVIDER=openai requires the 'openai' Python package."
            ) from exc

        api_key = (
            os.getenv("OPENAI_API_KEY")
            or os.getenv("DASHSCOPE_API_KEY")
            or os.getenv("QWEN_API")
        )
        if not api_key:
            raise RuntimeError(
                "MODEL_PROVIDER=openai requires OPENAI_API_KEY (or "
                "DASHSCOPE_API_KEY) in the environment or .env."
            )

        client_options = {"api_key": api_key, "timeout": timeout_seconds}
        base_url = (
            os.getenv("OPENAI_BASE_URL")
            or os.getenv("DASHSCOPE_BASE_URL")
            or os.getenv("QWEN_BASE_URL")
        )
        if not base_url and is_qwen_model(request_payload.get("model")):
            base_url = DEFAULT_QWEN_BASE_URL
        if base_url:
            client_options["base_url"] = base_url

        try:
            response = OpenAI(**client_options).chat.completions.create(
                **request_payload
            )
        except openai.APITimeoutError as exc:
            raise requests.Timeout(str(exc)) from exc
        except openai.APIError as exc:
            raise requests.RequestException(str(exc)) from exc

        return OpenAIResponseAdapter(response)

    return requests.post(ollama_chat_url, json=request_payload, timeout=timeout_seconds)


def find_images(folder: Path):
    if not folder.exists():
        return []

    return sorted(
        p for p in folder.rglob("*")
        if p.suffix.lower() in IMAGE_EXTENSIONS
    )


def load_annotations(path: Path):
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8")

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        data, _ = json.JSONDecoder().raw_decode(text)

    if isinstance(data, list):
        return data

    if not isinstance(data, dict):
        raise ValueError(f"Invalid annotation format in {path}: expected object or list.")

    annotations = data.get("annotations") or []

    if not isinstance(annotations, list):
        raise ValueError(f"Invalid annotation format in {path}: annotations must be a list.")

    return annotations


def annotation_image_id(annotation):
    if not isinstance(annotation, dict):
        return None

    if annotation.get("image_id"):
        return annotation["image_id"]

    if annotation.get("image"):
        return Path(annotation["image"]).stem

    return None


def annotation_camera_name(annotation):
    if not isinstance(annotation, dict):
        return ""

    params = annotation.get("params", {})
    if not isinstance(params, dict):
        params = {}

    camera = annotation.get("camera", {})
    if not isinstance(camera, dict):
        camera = {}

    return (
        annotation.get("camera_name")
        or params.get("camera_name")
        or camera.get("name")
        or ""
    )


def relative_path(path: Path):
    return str(path).replace("\\", "/")


def safe_filename(value):
    value = "" if value is None else str(value)
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value.strip())
    return value.strip("_") or "unknown"


def safe_dataset_name(dataset_root: Path, dataset_dir: Path):
    try:
        rel = dataset_dir.relative_to(dataset_root)
    except ValueError:
        rel = dataset_dir

    return "__".join(rel.parts)


def discover_dataset_specs(dataset_root: Path):
    specs = []
    seen = set()

    for dataset_dir in sorted([dataset_root, *dataset_root.rglob("*")]):
        if not dataset_dir.is_dir():
            continue

        professor_dir = dataset_dir / "professor"
        student_dir = dataset_dir / "student"

        if not student_dir.exists():
            student_dir = dataset_dir / "students"

        if not professor_dir.exists() or not student_dir.exists():
            continue

        key = dataset_dir.resolve()

        if key in seen:
            continue

        seen.add(key)

        try:
            rel_parts = dataset_dir.relative_to(dataset_root).parts
        except ValueError:
            rel_parts = dataset_dir.parts

        specs.append(
            DatasetSpec(
                name=safe_dataset_name(dataset_root, dataset_dir),
                root=dataset_dir,
                professor_dir=professor_dir,
                student_dir=student_dir,
                dataset_type=rel_parts[0] if len(rel_parts) > 1 else "",
            )
        )

    return specs


def build_professor_image_index(professor_dir: Path):
    annotations = load_annotations(professor_dir / "annotations.json")
    by_camera = {
        annotation_camera_name(a): a
        for a in annotations
        if annotation_camera_name(a)
    }
    images = {}
    image_dir = professor_dir / "images"

    for image_path in find_images(image_dir if image_dir.exists() else professor_dir):
        name = image_path.stem

        if name.lower().startswith("professor_"):
            name = name[len("professor_"):]

        images[name] = image_path

    return images, by_camera


def build_student_annotation_index(camera_dir: Path):
    annotations = load_annotations(camera_dir / "annotations.json")
    return {
        annotation_image_id(a): a
        for a in annotations
        if annotation_image_id(a)
    }


def iter_student_camera_dirs(student_dir: Path):
    for item in sorted(student_dir.iterdir()):
        if item.is_dir():
            yield item


def find_student_images(camera_dir: Path):
    image_dir = camera_dir / "images"
    return find_images(image_dir if image_dir.exists() else camera_dir)


def preview_text(value, max_length=500):
    text = str(value or "").replace("\n", "\\n")
    return text[:max_length] + "..." if len(text) > max_length else text


def parse_model_json(raw_answer):
    if not isinstance(raw_answer, str):
        return raw_answer

    raw_answer = raw_answer.strip()

    if not raw_answer:
        raise ValueError("Model response was empty")

    if raw_answer.startswith("```"):
        lines = raw_answer.splitlines()

        if lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        raw_answer = "\n".join(lines).strip()

    try:
        return json.loads(raw_answer)
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()

        for start in sorted(
            i for i in (raw_answer.find("{"), raw_answer.find("["))
            if i != -1
        ):
            try:
                parsed, _ = decoder.raw_decode(raw_answer[start:])
                return parsed
            except json.JSONDecodeError:
                continue

        raise


def make_raw_response_saver(raw_response_dir: Path):
    def save_raw_response(metadata, http_body, raw_answer=None, answer_source=None):
        raw_response_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(ZoneInfo("Europe/Rome")).strftime("%Y%m%d_%H%M%S_%f")
        name = "__".join(
            safe_filename(metadata.get(key))
            for key in (
                "test_name",
                "camera_name",
                "student_name",
                "model",
                "prompt_code",
                "prompt_name",
            )
        )
        path = raw_response_dir / f"{timestamp}__{name}.json"
        path.write_text(
            json.dumps(
                {
                    "saved_at": datetime.now(ZoneInfo("Europe/Rome")).isoformat(timespec="seconds"),
                    "metadata": metadata,
                    "answer_source": answer_source,
                    "raw_response_field": raw_answer,
                    "raw_http_body": http_body,
                },
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        return relative_path(path)

    return save_raw_response


def extract_chat_answer(data):
    message = data.get("message", {}) if isinstance(data, dict) else {}
    choices = data.get("choices", []) if isinstance(data, dict) else []
    choice_message = {}

    if choices and isinstance(choices[0], dict):
        choice_message = choices[0].get("message", {}) or {}

    for source, value in [
        ("message.content", message.get("content")),
        ("message.thinking", message.get("thinking")),
        ("choices.0.message.content", choice_message.get("content")),
        ("choices.0.message.reasoning_content", choice_message.get("reasoning_content")),
        ("response", data.get("response") if isinstance(data, dict) else None),
        ("thinking", data.get("thinking") if isinstance(data, dict) else None),
    ]:
        if isinstance(value, str) and value.strip():
            return value, source

    return "{}", "empty"


def read_text_file(path: Path):
    raw = path.read_bytes()

    for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(encoding).strip()
        except UnicodeDecodeError:
            continue

    return raw.decode("utf-8", errors="replace").strip()


def ensure_model_on_gpu(model, ollama_chat_url, _ollama_ps_url, timeout_seconds=30):
    import requests
    import sys
    """
    Warm up `model` in Ollama with a trivial request (forcing it to load),
    then query /api/ps to check GPU placement. Stops the whole run with
    sys.exit(1) if the model is loaded entirely on CPU/RAM (size_vram == 0).
    """
    print(f"Checking GPU placement for '{model}'…")
    try:
        warm = requests.post(
            ollama_chat_url,
            json={
                "model": model,
                "messages": [{"role": "user", "content": "ping"}],
                "stream": False,
                "keep_alive": "5m",
                "options": build_ollama_options(),
            },
            timeout=timeout_seconds,
        )
        warm.raise_for_status()
    except requests.RequestException as e:
        print(f"ERROR: Could not warm up model '{model}' via {ollama_chat_url}: {e}")
        sys.exit(1)

    try:
        ps = requests.get(_ollama_ps_url(), timeout=timeout_seconds)
        ps.raise_for_status()
        loaded = ps.json().get("models", [])
    except requests.RequestException as e:
        print(f"WARNING: Could not query {_ollama_ps_url()} to verify GPU placement ({e}); continuing without the check.")
        return

    entry = next((m for m in loaded if m.get("model") == model or m.get("name") == model), None)
    if entry is None:
        print(f"WARNING: '{model}' not found in Ollama's loaded-model list after warm-up; continuing without the check.")
        return

    size      = entry.get("size", 0)
    size_vram = entry.get("size_vram", 0)
    pct_gpu   = (size_vram / size * 100) if size else 0

    if size_vram == 0 and size > 0:
        print(f"ERROR: '{model}' is loaded entirely on CPU/RAM (size_vram=0, size={size / 1e9:.2f} GB). Stopping run.")
        sys.exit(1)

    print(f"'{model}' is on GPU: {pct_gpu:.0f}% ({size_vram / 1e9:.2f} GB / {size / 1e9:.2f} GB).")
