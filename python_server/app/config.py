from __future__ import annotations

from functools import lru_cache
from os import environ

from pydantic import BaseModel, Field, field_validator


class Settings(BaseModel):
    hmac_secret: str = Field(min_length=32)
    hmac_max_age_seconds: int = Field(default=300, ge=10, le=3600)
    queue_max_size: int = Field(default=100, ge=1, le=10_000)
    completed_job_limit: int = Field(default=500, ge=1, le=100_000)
    max_image_bytes: int = Field(default=12 * 1024 * 1024, ge=1)
    max_image_pixels: int = Field(default=40_000_000, ge=1)

    @field_validator("hmac_secret")
    @classmethod
    def reject_example_secret(cls, value: str) -> str:
        if value in {"change-me", "replace-with-a-long-random-secret"}:
            raise ValueError("HMAC_SECRET must be replaced with a random secret")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings(
        hmac_secret=environ.get("HMAC_SECRET", ""),
        hmac_max_age_seconds=int(environ.get("HMAC_MAX_AGE_SECONDS", "300")),
        queue_max_size=int(environ.get("QUEUE_MAX_SIZE", "100")),
        completed_job_limit=int(environ.get("COMPLETED_JOB_LIMIT", "500")),
        max_image_bytes=int(environ.get("MAX_IMAGE_BYTES", str(12 * 1024 * 1024))),
        max_image_pixels=int(environ.get("MAX_IMAGE_PIXELS", "40000000")),
    )
