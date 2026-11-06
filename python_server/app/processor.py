from __future__ import annotations

import asyncio

from .config import get_settings
from .models import ImageJobRequest
from .ollama.main import process_ollama


async def process_image(request: ImageJobRequest) -> dict:
    """Run the requested image comparison without blocking the queue event loop.

    This is the ``SerialJobQueue`` processor. The blocking Ollama HTTP call
    runs in a worker thread via ``asyncio.to_thread``. In development mode
    Ollama is skipped and an empty result with the same shape is returned
    (``analyses`` per category for ``general`` jobs, otherwise ``analysis``),
    so the portal can be exercised without a GPU.

    Returns the model's JSON object merged with job metadata (type, image
    formats, model, prompt version and hash) that SvelteKit stores with the
    attempt. Any exception propagates and marks the job as failed.
    """
    category = request.type.value

    if get_settings().development_mode:
        empty_analysis = {
            "general_description": "Development mode: Ollama was not called.",
            "changed_parameters": [],
            "summary": {},
        }
        mock_result = (
            {"analyses": {name: empty_analysis for name in ("camera", "light", "material", "texture")}}
            if category == "general"
            else {"analysis": empty_analysis}
        )
        return {
            **mock_result,
            "message": "Development mode is enabled; Ollama was not called.",
            "type": category,
            "image_format": request.image_format,
            "reference_image_format": request.reference_image_format,
            "model": request.model,
            "promptVersion": request.prompt_version,
            "promptHash": request.prompt_hash,
        }

    result = await asyncio.to_thread(
        process_ollama,
        request.reference_image,  # Image A: instructor reference
        request.image,  # Image B: student submission
        model=request.model,
        system_prompt=request.system_prompt,
        user_prompt=request.user_prompt,
        output_schema=request.output_schema,
        timeout_seconds=get_settings().ollama_timeout_seconds,
    )
    return {
        **result,
        "type": category,
        "image_format": request.image_format,
        "reference_image_format": request.reference_image_format,
        "provider": "ollama",
        "model": request.model,
        "promptVersion": request.prompt_version,
        "promptHash": request.prompt_hash,
    }
