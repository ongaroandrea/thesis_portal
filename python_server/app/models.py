from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ImageType(str, Enum):
    CAMERA = "camera"
    TEXTURE = "texture"
    LIGHT = "light"
    MATERIAL = "material"
    GENERAL = "general"


class ImageJobRequest(BaseModel):
    type: ImageType
    model: str
    system_prompt: str = Field(exclude=True, repr=False)
    user_prompt: str = Field(exclude=True, repr=False)
    output_schema: dict = Field(exclude=True, repr=False)
    prompt_version: str
    prompt_hash: str
    image: bytes = Field(exclude=True, repr=False)
    image_format: str
    content_type: str
    size_bytes: int
    width: int
    height: int
    reference_image: bytes = Field(exclude=True, repr=False)
    reference_image_format: str
    reference_content_type: str
    reference_size_bytes: int
    reference_width: int
    reference_height: int


class Job(BaseModel):
    id: UUID
    status: JobStatus
    request: ImageJobRequest
    result: dict | None = None
    error: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    started_at: datetime | None = None
    completed_at: datetime | None = None


class JobAccepted(BaseModel):
    id: UUID
    status: JobStatus
    position: int


class QueueStatus(BaseModel):
    queued: int
    processing_job_id: UUID | None
    capacity: int
