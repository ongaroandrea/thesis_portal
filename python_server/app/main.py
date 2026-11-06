from __future__ import annotations

from contextlib import asynccontextmanager
from io import BytesIO
import json
import re
from uuid import UUID

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.routing import APIRoute
from PIL import Image, UnidentifiedImageError

from .config import get_settings
from .models import ImageJobRequest, ImageType, Job, JobAccepted, QueueStatus
from .processor import process_image
from .queue import QueueFullError, SerialJobQueue
from .security import HmacVerifier


class BodyCachingRoute(APIRoute):
    """Cache the raw body before FastAPI consumes multipart form data.

    The HMAC signature covers the exact body bytes, but once FastAPI parses
    ``File``/``Form`` parameters the stream is consumed. Awaiting
    ``request.body()`` first stores the bytes on the request so
    ``HmacVerifier.verify`` can hash them afterwards.
    """

    def get_route_handler(self):
        route_handler = super().get_route_handler()

        async def cached_body_route_handler(request: Request):
            await request.body()
            return await route_handler(request)

        return cached_body_route_handler


settings = get_settings()
verifier = HmacVerifier(settings)
job_queue = SerialJobQueue(
    processor=process_image,
    max_size=settings.queue_max_size,
    completed_job_limit=settings.completed_job_limit,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Start the queue consumer on startup and drain it on shutdown."""
    await job_queue.start()
    yield
    await job_queue.stop()


app = FastAPI(
    title="Image Queue API",
    version="0.1.0",
    lifespan=lifespan,
)
app.router.route_class = BodyCachingRoute


async def require_signature(request: Request) -> None:
    await verifier.verify(request)


signed_request = Depends(require_signature)


@app.get("/health/live", include_in_schema=False)
async def health() -> dict[str, str]:
    # This endpoint exposes no application data and exists for Docker health checks.
    return {"status": "ok"}


@app.post(
    "/v1/jobs",
    response_model=JobAccepted,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[signed_request],
)
async def create_job(
    image: UploadFile = File(...),
    reference_image: UploadFile = File(...),
    type: ImageType = Form(...),
    model: str = Form(..., min_length=1, max_length=200),
    system_prompt: str = Form(..., min_length=1, max_length=50_000),
    user_prompt: str = Form(..., min_length=1, max_length=50_000),
    output_schema: str = Form(..., min_length=2, max_length=50_000),
    prompt_version: str = Form(..., min_length=1, max_length=100),
    prompt_hash: str = Form(..., min_length=64, max_length=64),
) -> JobAccepted:
    """Validate a signed multipart job and enqueue it.

    The request carries the student image, the reference image and the full
    prompt snapshot authored by SvelteKit. Both images are fully read into
    memory, size-checked, decoded with Pillow to confirm the real format and
    pixel count, and the declared content type must match the detected
    format. Returns 202 with the job id and queue position, or 503 when the
    queue is full. Images are never written to disk by this service.
    """
    allowed_formats = {
        "JPEG": "image/jpeg",
        "PNG": "image/png",
        "WEBP": "image/webp",
    }
    if model not in settings.allowed_models:
        raise HTTPException(status_code=422, detail="The requested model is not allowed")
    if not re.fullmatch(r"[0-9a-f]{64}", prompt_hash):
        raise HTTPException(status_code=422, detail="prompt_hash must be a SHA-256 hex digest")
    try:
        parsed_output_schema = json.loads(output_schema)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=422, detail="output_schema must be valid JSON") from error
    if not isinstance(parsed_output_schema, dict):
        raise HTTPException(status_code=422, detail="output_schema must be a JSON object")

    async def read_image(upload: UploadFile, label: str):
        """Read one upload and return (bytes, format, content type, width, height).

        Reads at most ``max_image_bytes + 1`` bytes so oversize files are
        detected without buffering them entirely.
        """
        image_bytes = await upload.read(settings.max_image_bytes + 1)
        await upload.close()
        if not image_bytes:
            raise HTTPException(status_code=422, detail=f"The {label} image file is empty")
        if len(image_bytes) > settings.max_image_bytes:
            raise HTTPException(status_code=413, detail=f"The {label} image file is too large")
        try:
            with Image.open(BytesIO(image_bytes)) as candidate:
                actual_format = candidate.format
                width, height = candidate.size
                if width <= 0 or height <= 0 or width * height > settings.max_image_pixels:
                    raise HTTPException(
                        status_code=422, detail=f"The {label} image dimensions are not allowed"
                    )
                candidate.verify()
        except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as error:
            raise HTTPException(
                status_code=422, detail=f"The {label} file is not a valid image"
            ) from error
        if actual_format not in allowed_formats:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported {label} image format; use JPEG, PNG, or WEBP",
            )
        expected_content_type = allowed_formats[actual_format]
        if upload.content_type not in {expected_content_type, "application/octet-stream"}:
            raise HTTPException(
                status_code=415,
                detail=f"The declared content type does not match the {actual_format} {label} image",
            )
        return image_bytes, actual_format, expected_content_type, width, height

    image_bytes, actual_format, expected_content_type, width, height = (
        await read_image(image, "submitted")
    )
    (
        reference_bytes,
        reference_format,
        reference_content_type,
        reference_width,
        reference_height,
    ) = await read_image(reference_image, "reference")

    payload = ImageJobRequest(
        type=type,
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        output_schema=parsed_output_schema,
        prompt_version=prompt_version,
        prompt_hash=prompt_hash,
        image=image_bytes,
        image_format=actual_format.lower(),
        content_type=expected_content_type,
        size_bytes=len(image_bytes),
        width=width,
        height=height,
        reference_image=reference_bytes,
        reference_image_format=reference_format.lower(),
        reference_content_type=reference_content_type,
        reference_size_bytes=len(reference_bytes),
        reference_width=reference_width,
        reference_height=reference_height,
    )
    try:
        job, position = await job_queue.submit(payload)
    except QueueFullError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The image queue is full",
        ) from error
    return JobAccepted(id=job.id, status=job.status, position=position)


@app.get(
    "/v1/jobs/{job_id}",
    response_model=Job,
    dependencies=[signed_request],
)
async def get_job(job_id: UUID) -> Job:
    job = await job_queue.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.delete(
    "/v1/jobs/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
    dependencies=[signed_request],
)
async def destroy_job(job_id: UUID) -> Response:
    destroyed = await job_queue.destroy(job_id)
    if not destroyed:
        raise HTTPException(status_code=404, detail="Job not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get(
    "/v1/jobs",
    response_model=list[Job],
    dependencies=[signed_request],
)
async def list_jobs() -> list[Job]:
    return await job_queue.snapshot()


@app.get(
    "/v1/queue",
    response_model=QueueStatus,
    dependencies=[signed_request],
)
async def queue_status() -> QueueStatus:
    return QueueStatus(
        queued=job_queue.queued_count,
        processing_job_id=job_queue.processing_job_id,
        capacity=job_queue.capacity,
    )
