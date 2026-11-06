import asyncio

import pytest

from app.models import ImageJobRequest, ImageType, JobStatus
from app.queue import SerialJobQueue


def image_request(image: bytes, image_type: ImageType) -> ImageJobRequest:
    return ImageJobRequest(
        type=image_type,
        model="qwen3.8:27b",
        system_prompt="system",
        user_prompt="user",
        output_schema={"type": "object"},
        prompt_version="test-v1",
        prompt_hash="a" * 64,
        image=image,
        image_format="png",
        content_type="image/png",
        size_bytes=len(image),
        width=1,
        height=1,
        reference_image=b"reference",
        reference_image_format="png",
        reference_content_type="image/png",
        reference_size_bytes=9,
        reference_width=1,
        reference_height=1,
    )


@pytest.mark.asyncio
async def test_jobs_are_processed_in_fifo_order_by_one_consumer() -> None:
    order: list[str] = []

    async def processor(request: ImageJobRequest) -> dict:
        order.append(request.type.value)
        await asyncio.sleep(0.01)
        return {"answer": request.type.value}

    queue = SerialJobQueue(processor, max_size=10, completed_job_limit=10)
    await queue.start()
    first_request = image_request(b"first", ImageType.CAMERA)
    second_request = image_request(b"second", ImageType.TEXTURE)
    first, _ = await queue.submit(first_request)
    second, _ = await queue.submit(second_request)

    for _ in range(100):
        second_state = await queue.get(second.id)
        if second_state and second_state.status == JobStatus.COMPLETED:
            break
        await asyncio.sleep(0.01)

    await queue.stop()
    assert order == ["camera", "texture"]
    assert (await queue.get(first.id)).status == JobStatus.COMPLETED
    assert (await queue.get(second.id)).status == JobStatus.COMPLETED


@pytest.mark.asyncio
async def test_destroy_removes_a_queued_job() -> None:
    gate = asyncio.Event()

    async def processor(_: ImageJobRequest) -> dict:
        await gate.wait()
        return {"answer": "done"}

    queue = SerialJobQueue(processor, max_size=10, completed_job_limit=10)
    await queue.start()
    request = image_request(b"image", ImageType.CAMERA)
    first, _ = await queue.submit(request)
    second, _ = await queue.submit(request)
    await asyncio.sleep(0)

    assert await queue.destroy(second.id) is True
    assert await queue.get(second.id) is None

    gate.set()
    await queue.stop()
    assert (await queue.get(first.id)).status == JobStatus.COMPLETED


@pytest.mark.asyncio
async def test_destroy_hides_the_processing_job_and_discards_its_result() -> None:
    started = asyncio.Event()
    release = asyncio.Event()

    async def processor(_: ImageJobRequest) -> dict:
        started.set()
        await release.wait()
        return {"answer": "discarded"}

    queue = SerialJobQueue(processor, max_size=10, completed_job_limit=10)
    await queue.start()
    request = image_request(b"image", ImageType.CAMERA)
    job, _ = await queue.submit(request)
    await started.wait()

    assert await queue.destroy(job.id) is True
    for _ in range(20):
        if await queue.get(job.id) is None:
            break
        await asyncio.sleep(0)

    assert await queue.get(job.id) is None
    release.set()
    await queue.stop()


@pytest.mark.asyncio
async def test_destroyed_active_job_finishes_before_next_job_starts() -> None:
    first_started = asyncio.Event()
    release_first = asyncio.Event()
    calls: list[str] = []

    async def processor(request: ImageJobRequest) -> dict:
        calls.append(request.type.value)
        if request.type == ImageType.CAMERA:
            first_started.set()
            await release_first.wait()
        return {"answer": request.type.value}

    queue = SerialJobQueue(processor, max_size=10, completed_job_limit=10)
    await queue.start()
    first, _ = await queue.submit(image_request(b"first", ImageType.CAMERA))
    second, _ = await queue.submit(image_request(b"second", ImageType.TEXTURE))
    await first_started.wait()

    assert await queue.destroy(first.id) is True
    assert await queue.get(first.id) is None
    await asyncio.sleep(0)
    assert calls == ["camera"]

    release_first.set()
    for _ in range(100):
        second_state = await queue.get(second.id)
        if second_state and second_state.status == JobStatus.COMPLETED:
            break
        await asyncio.sleep(0.01)

    await queue.stop()
    assert calls == ["camera", "texture"]


@pytest.mark.asyncio
async def test_stop_drops_queued_work_instead_of_draining_backlog() -> None:
    first_started = asyncio.Event()
    release_first = asyncio.Event()
    calls: list[str] = []

    async def processor(request: ImageJobRequest) -> dict:
        calls.append(request.type.value)
        first_started.set()
        await release_first.wait()
        return {"answer": request.type.value}

    queue = SerialJobQueue(processor, max_size=10, completed_job_limit=10)
    await queue.start()
    await queue.submit(image_request(b"first", ImageType.CAMERA))
    queued, _ = await queue.submit(image_request(b"second", ImageType.TEXTURE))
    await first_started.wait()

    stopping = asyncio.create_task(queue.stop())
    await asyncio.sleep(0)
    assert await queue.get(queued.id) is None
    assert calls == ["camera"]

    release_first.set()
    await stopping
    assert calls == ["camera"]
