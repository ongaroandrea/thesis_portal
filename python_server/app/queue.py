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
    """A bounded FIFO work list consumed by exactly one background task.

    Only one job is processed at a time because the target machine has a
    single GPU. All state (pending ids, jobs, results) lives in memory, so a
    process restart loses every job. Finished jobs, including their image
    bytes, are kept until ``completed_job_limit`` is exceeded, then the oldest
    terminal jobs are pruned.

    Args:
        processor: async callable that turns an ``ImageJobRequest`` into a
            result dict; exceptions it raises mark the job as failed.
        max_size: maximum number of *pending* jobs (the active one excluded).
        completed_job_limit: how many completed/failed jobs to retain.
    """

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
        """Start the single consumer task. Calling it twice is a no-op."""
        if self._consumer is None:
            self._stopping = False
            self._consumer = asyncio.create_task(
                self._consume(), name="single-gpu-job-consumer"
            )

    async def stop(self) -> None:
        """Drop pending jobs and wait for the active job (if any) to finish."""
        self._stopping = True
        async with self._condition:
            # Queued work is ephemeral and must not make application shutdown
            # drain a potentially hours-long backlog.
            while self._pending:
                self._jobs.pop(self._pending.popleft(), None)
            self._condition.notify_all()
        if self._consumer is not None:
            await self._consumer
            self._consumer = None

    async def submit(self, request: ImageJobRequest) -> tuple[Job, int]:
        """Enqueue a request.

        Returns a deep copy of the new job and its 1-based queue position.
        Raises ``QueueFullError`` when ``max_size`` pending jobs already exist
        and ``RuntimeError`` while the queue is shutting down.
        """
        async with self._condition:
            if self._stopping:
                raise RuntimeError("The job queue is stopping")
            if len(self._pending) >= self._max_size:
                raise QueueFullError
            job = Job(id=uuid4(), status=JobStatus.QUEUED, request=request)
            self._jobs[job.id] = job
            self._pending.append(job.id)
            position = len(self._pending)
            self._condition.notify(1)
            return job.model_copy(deep=True), position

    async def get(self, job_id: UUID) -> Job | None:
        """Return a copy of the job (so callers cannot mutate queue state)."""
        async with self._condition:
            job = self._jobs.get(job_id)
            return job.model_copy(deep=True) if job else None

    async def snapshot(self) -> list[Job]:
        async with self._condition:
            return [job.model_copy(deep=True) for job in self._jobs.values()]

    async def destroy(self, job_id: UUID) -> bool:
        """Remove a job and discard an active job's result when it finishes.

        The production processor uses ``asyncio.to_thread``. Cancelling its
        asyncio task does not stop the underlying thread and would let the
        consumer start another GPU job concurrently. Active work is therefore
        hidden immediately but allowed to finish before the FIFO advances.
        """
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
                del self._jobs[job_id]
            else:
                del self._jobs[job_id]
            return True

    @property
    def queued_count(self) -> int:
        return len(self._pending)

    @property
    def capacity(self) -> int:
        return self._max_size

    async def _consume(self) -> None:
        """Consumer loop: take the oldest pending job, run it, store the outcome.

        The condition lock is held only while mutating shared state, never
        while the processor runs, so status/submit calls stay responsive.
        A job destroyed while active has its result discarded here instead of
        being cancelled (see ``destroy``).
        """
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
        """Keep only the newest ``completed_job_limit`` completed/failed jobs.

        ``_jobs`` is insertion ordered, so slicing off the tail keeps the most
        recently submitted terminal jobs. Must be called with the lock held.
        """
        terminal_ids = [
            job_id
            for job_id, job in self._jobs.items()
            if job.status in {JobStatus.COMPLETED, JobStatus.FAILED}
        ]
        for job_id in terminal_ids[: -self._completed_job_limit]:
            del self._jobs[job_id]
