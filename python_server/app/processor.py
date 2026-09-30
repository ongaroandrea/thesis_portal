from __future__ import annotations

import asyncio

from .config import get_settings
from .models import ImageJobRequest
from .ollama.main import process_ollama


async def process_image(request: ImageJobRequest) -> dict:
    """Run the requested image comparison without blocking the queue event loop."""
    category = request.type.value

    if get_settings().development_mode:
        return {
            "analysis": None,
            "message": "Development mode is enabled; Ollama was not called.",
            "type": category,
            "image_format": request.image_format,
            "reference_image_format": request.reference_image_format,
        }

    result = await asyncio.to_thread(
        process_ollama,
        request.reference_image,  # Image A: instructor reference
        request.image,  # Image B: student submission
        category,
    )
    return {
        **result,
        "type": category,
        "image_format": request.image_format,
        "reference_image_format": request.reference_image_format,
    }
