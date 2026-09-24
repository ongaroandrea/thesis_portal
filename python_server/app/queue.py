from __future__ import annotations

import asyncio
from collections import OrderedDict, deque
from collections.abc import Awaitable, Callable
from uuid import UUID, uuid4

from .models import ImageJobRequest, Job, JobStatus, utc_now

Processor = Callable[[ImageJobRequest], Awaitable[dict]]


class QueueFullError(Exception):
    pass


class SerialJobQueue:
    """A bounded FIFO work list consumed by exactly one background task."""

    def __init__(
        self,
        processor: Processor,
        max_size: int,
        completed_job_limit: int,
    ) -> None:
        self._processor = processor
        self._max_size = max_size
        self._completed_job_limit = completed_job_limit
        self._pending: deque[UUID] = deque()
        self._jobs: OrderedDict[UUID, Job] = OrderedDict()
        self._condition = asyncio.Condition()
        self._consumer: asyncio.Task[None] | None = None
        self._active_processor: asyncio.Task[dict] | None = None
        self._destroy_requested: set[UUID] = set()
        self._stopping = False
        self.processing_job_id: UUID | None = None

    async def start(self) -> None:
        if self._consumer is None:
            self._stopping = False
            self._consumer = asyncio.create_task(
                self._consume(), name="single-gpu-job-consumer"
            )

    async def stop(self) -> None:
        self._stopping = True
        async with self._condition:
            self._condition.notify_all()
        if self._consumer is not None:
            await self._consumer
            self._consumer = None

    async def submit(self, request: ImageJobRequest) -> tuple[Job, int]:
        async with self._condition:
            if len(self._pending) >= self._max_size:
                raise QueueFullError
            job = Job(id=uuid4(), status=JobStatus.QUEUED, request=request)
            self._jobs[job.id] = job
            self._pending.append(job.id)
            position = len(self._pending)
            self._condition.notify(1)
            return job.model_copy(deep=True), position

    async def get(self, job_id: UUID) -> Job | None:
        async with self._condition:
            job = self._jobs.get(job_id)
            return job.model_copy(deep=True) if job else None

    async def snapshot(self) -> list[Job]:
        async with self._condition:
            return [job.model_copy(deep=True) for job in self._jobs.values()]

    async def destroy(self, job_id: UUID) -> bool:
        """Remove a queued job or cancel and remove the active job."""
        processor: asyncio.Task[dict] | None = None
        async with self._condition:
            job = self._jobs.get(job_id)
            if job is None:
                return False
            if job_id in self._pending:
                self._pending.remove(job_id)
                del self._jobs[job_id]
                return True
            if self.processing_job_id == job_id:
                self._destroy_requested.add(job_id)
                processor = self._active_processor
            else:
                del self._jobs[job_id]
                return True
        if processor is not None:
            processor.cancel()
        return True

    @property
    def queued_count(self) -> int:
        return len(self._pending)

    @property
    def capacity(self) -> int:
        return self._max_size

    async def _consume(self) -> None:
        while True:
            async with self._condition:
                await self._condition.wait_for(
                    lambda: bool(self._pending) or self._stopping
                )
                if self._stopping and not self._pending:
                    return
                job_id = self._pending.popleft()
                job = self._jobs[job_id]
                job.status = JobStatus.PROCESSING
                job.started_at = utc_now()
                self.processing_job_id = job_id
                self._active_processor = asyncio.create_task(self._processor(job.request))

            try:
                result = await self._active_processor
            except asyncio.CancelledError:
                async with self._condition:
                    if job_id not in self._destroy_requested:
                        raise
                    self._destroy_requested.discard(job_id)
                    self._jobs.pop(job_id, None)
            except Exception as error:  # processor failures belong to the job
                async with self._condition:
                    if job_id in self._destroy_requested:
                        self._destroy_requested.discard(job_id)
                        self._jobs.pop(job_id, None)
                    else:
                        job.status = JobStatus.FAILED
                        job.error = str(error)
                        job.completed_at = utc_now()
            else:
                async with self._condition:
                    if job_id in self._destroy_requested:
                        self._destroy_requested.discard(job_id)
                        self._jobs.pop(job_id, None)
                    else:
                        job.status = JobStatus.COMPLETED
                        job.result = result
                        job.completed_at = utc_now()
            finally:
                async with self._condition:
                    self._active_processor = None
                    self.processing_job_id = None
                    self._prune_completed()

    def _prune_completed(self) -> None:
        terminal_ids = [
            job_id
            for job_id, job in self._jobs.items()
            if job.status in {JobStatus.COMPLETED, JobStatus.FAILED}
        ]
        for job_id in terminal_ids[: -self._completed_job_limit]:
            del self._jobs[job_id]
