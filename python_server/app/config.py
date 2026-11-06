from __future__ import annotations

from functools import lru_cache
from os import environ

from pydantic import BaseModel, Field, field_validator


class Settings(BaseModel):
    hmac_secret: str = Field(min_length=32)
    development_mode: bool = False
    hmac_max_age_seconds: int = Field(default=300, ge=10, le=3600)
    queue_max_size: int = Field(default=100, ge=1, le=10_000)
    completed_job_limit: int = Field(default=500, ge=1, le=100_000)
    max_image_bytes: int = Field(default=5 * 1024 * 1024, ge=1)
    max_image_pixels: int = Field(default=40_000_000, ge=1)
    allowed_models: frozenset[str] = frozenset({"qwen3.8:27b"})
    ollama_timeout_seconds: int = Field(default=15 * 60, ge=1, le=3600)

    @field_validator("hmac_secret")
    @classmethod
    def reject_example_secret(cls, value: str) -> str:
        if value != value.strip() or not value.strip():
            raise ValueError("HMAC_SECRET cannot be blank or surrounded by whitespace")
        if value in {"change-me", "replace-with-a-long-random-secret"}:
            raise ValueError("HMAC_SECRET must be replaced with a random secret")
        return value


def _max_image_bytes() -> int:
    """Per-image limit from ``MAX_IMAGE_MB`` (shared with the web app via
    docker.env). ``MAX_IMAGE_BYTES`` is still honoured when set explicitly."""
    if environ.get("MAX_IMAGE_BYTES"):
        return int(environ["MAX_IMAGE_BYTES"])
    return int(float(environ.get("MAX_IMAGE_MB", "5")) * 1024 * 1024)


@lru_cache
def get_settings() -> Settings:
    """Read settings from environment variables once and cache them.

    ``OLLAMA_ALLOWED_MODELS`` is a comma-separated allow list; jobs naming any
    other model are rejected with 422. Because the result is cached (and
    ``app.main`` reads it at import time), environment changes made after
    startup are not picked up.
    """
    return Settings(
        hmac_secret=environ.get("HMAC_SECRET", ""),
        development_mode=environ.get("DEVELOPMENT_MODE", "false"),
        hmac_max_age_seconds=int(environ.get("HMAC_MAX_AGE_SECONDS", "300")),
        queue_max_size=int(environ.get("QUEUE_MAX_SIZE", "100")),
        completed_job_limit=int(environ.get("COMPLETED_JOB_LIMIT", "500")),
        max_image_bytes=_max_image_bytes(),
        max_image_pixels=int(environ.get("MAX_IMAGE_PIXELS", "40000000")),
        allowed_models=frozenset(
            model.strip()
            for model in environ.get("OLLAMA_ALLOWED_MODELS", "qwen3.8:27b").split(",")
            if model.strip()
        ),
        ollama_timeout_seconds=int(environ.get("OLLAMA_TIMEOUT_SECONDS", "900")),
    )
