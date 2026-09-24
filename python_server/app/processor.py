from __future__ import annotations

import asyncio

from .models import ImageJobRequest


async def process_image(request: ImageJobRequest) -> dict:
    """Placeholder for the future Ollama call; only one call runs at a time."""
    await asyncio.sleep(180)
    return {
        "answer": "The image was processed by the placeholder image worker.",
        "type": request.type.value,
        "image_format": request.image_format,
        "reference_image_format": request.reference_image_format,
    }
