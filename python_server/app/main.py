from __future__ import annotations

from contextlib import asynccontextmanager
from io import BytesIO
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
    """Cache the raw body before FastAPI consumes multipart form data."""

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
) -> JobAccepted:
    allowed_formats = {
        "JPEG": "image/jpeg",
        "PNG": "image/png",
        "WEBP": "image/webp",
    }

    async def read_image(upload: UploadFile, label: str):
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
