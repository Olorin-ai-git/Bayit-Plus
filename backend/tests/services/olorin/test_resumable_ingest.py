from unittest.mock import AsyncMock
import pytest
from app.models.ingest_job import IngestJob
from app.models.pipeline_stage import StageName, StageStatus
from app.services.olorin.resumable_ingest import ResumablePipelineRunner


def _make_handlers():
    """Return a dict with an AsyncMock for each of the 8 pipeline stages."""
    return {name: AsyncMock() for name in StageName}


def _make_job():
    """Create an IngestJob without triggering Beanie's pymongo collection access."""
    job = IngestJob.model_construct(
        job_id="j1",
        partner_id="p",
        content_id="c1",
        video_url="https://example.com/x.mp4",
        capabilities={},
        stages=[],
    )
    # Pydantic v2 blocks setting non-field attributes via normal assignment.
    # Use object.__setattr__ to inject an AsyncMock without MongoDB.
    object.__setattr__(job, "save", AsyncMock())
    return job


@pytest.mark.asyncio
async def test_run_all_executes_all_stages_in_declaration_order():
    handlers = _make_handlers()
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()

    await runner.run_all(job)

    for handler in handlers.values():
        handler.assert_awaited_once()
    for stage in job.stages:
        assert stage.status == StageStatus.COMPLETED


@pytest.mark.asyncio
async def test_run_all_skips_already_completed_stages():
    handlers = _make_handlers()
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()
    # Pre-mark TRANSCRIPTION as completed
    t = job.get_or_create_stage(StageName.TRANSCRIPTION)
    t.mark_completed()

    await runner.run_all(job)

    handlers[StageName.TRANSCRIPTION].assert_not_awaited()
    handlers[StageName.CHARACTER_EXTRACTION].assert_awaited_once()
    handlers[StageName.FINALIZATION].assert_awaited_once()


@pytest.mark.asyncio
async def test_run_all_stops_at_first_failure():
    handlers = _make_handlers()
    handlers[StageName.FACE_EXTRACTION].side_effect = RuntimeError("yunet boom")
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()

    await runner.run_all(job)

    assert job.get_stage(StageName.TRANSCRIPTION).status == StageStatus.COMPLETED
    assert job.get_stage(StageName.CHARACTER_EXTRACTION).status == StageStatus.COMPLETED
    failed = job.get_stage(StageName.FACE_EXTRACTION)
    assert failed.status == StageStatus.FAILED
    assert "yunet boom" in failed.error
    handlers[StageName.VOICE_CLONING].assert_not_awaited()
    handlers[StageName.FINALIZATION].assert_not_awaited()


@pytest.mark.asyncio
async def test_resume_picks_up_from_first_non_completed_stage():
    handlers = _make_handlers()
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()
    # Simulate prior run: transcription + character done, face failed
    for name in (StageName.TRANSCRIPTION, StageName.CHARACTER_EXTRACTION):
        s = job.get_or_create_stage(name)
        s.mark_completed()
    face = job.get_or_create_stage(StageName.FACE_EXTRACTION)
    face.mark_failed("timeout")

    await runner.resume(job)

    handlers[StageName.TRANSCRIPTION].assert_not_awaited()
    handlers[StageName.CHARACTER_EXTRACTION].assert_not_awaited()
    handlers[StageName.FACE_EXTRACTION].assert_awaited_once()
    handlers[StageName.VOICE_CLONING].assert_awaited_once()
    handlers[StageName.FINALIZATION].assert_awaited_once()


@pytest.mark.asyncio
async def test_handler_using_subtasks_completes_when_all_subtasks_done():
    handlers = _make_handlers()

    async def vc_handler(job, resume_subtask=None):
        stage = job.get_or_create_stage(StageName.VOICE_CLONING)
        stage.add_subtask("alice")
        stage.start_subtask("alice")
        stage.complete_subtask("alice")
        stage.add_subtask("bob")
        stage.start_subtask("bob")
        stage.complete_subtask("bob")

    handlers[StageName.VOICE_CLONING].side_effect = vc_handler
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()

    await runner.run_all(job)

    vc = job.get_stage(StageName.VOICE_CLONING)
    assert vc.status == StageStatus.COMPLETED
    # All downstream stages should also run
    handlers[StageName.FINALIZATION].assert_awaited_once()


@pytest.mark.asyncio
async def test_handler_with_failed_subtask_fails_the_stage():
    handlers = _make_handlers()

    async def vc_handler(job, resume_subtask=None):
        stage = job.get_or_create_stage(StageName.VOICE_CLONING)
        stage.add_subtask("alice")
        stage.start_subtask("alice")
        stage.complete_subtask("alice")
        stage.add_subtask("bob")
        stage.start_subtask("bob")
        stage.fail_subtask("bob", "elevenlabs 429")

    handlers[StageName.VOICE_CLONING].side_effect = vc_handler
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()

    await runner.run_all(job)

    vc = job.get_stage(StageName.VOICE_CLONING)
    assert vc.status == StageStatus.FAILED
    handlers[StageName.FINALIZATION].assert_not_awaited()


@pytest.mark.asyncio
async def test_retry_subtask_runs_only_that_subtask_then_continues():
    handlers = _make_handlers()
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()

    # Simulate prior state: all stages through VOICE_CLONING completed except
    # bob's voice clone, which failed
    for name in (
        StageName.TRANSCRIPTION,
        StageName.CHARACTER_EXTRACTION,
        StageName.FACE_EXTRACTION,
    ):
        s = job.get_or_create_stage(name)
        s.mark_completed()

    vc = job.get_or_create_stage(StageName.VOICE_CLONING)
    vc.add_subtask("alice")
    vc.start_subtask("alice")
    vc.complete_subtask("alice")
    vc.add_subtask("bob")
    vc.start_subtask("bob")
    vc.fail_subtask("bob", "elevenlabs 429")
    vc.mark_failed("one subtask failed")

    async def vc_retry_handler(job, resume_subtask=None):
        stage = job.get_or_create_stage(StageName.VOICE_CLONING)
        if resume_subtask == "bob":
            stage.start_subtask("bob")
            stage.complete_subtask("bob")

    handlers[StageName.VOICE_CLONING].side_effect = vc_retry_handler

    await runner.retry_subtask(job, StageName.VOICE_CLONING, "bob")

    vc_after = job.get_stage(StageName.VOICE_CLONING)
    assert vc_after.status == StageStatus.COMPLETED
    assert vc_after.subtasks["alice"].status == StageStatus.COMPLETED
    assert vc_after.subtasks["bob"].status == StageStatus.COMPLETED
    # After the subtask succeeds, the runner should continue through
    # the remaining forward stages
    handlers[StageName.SUBTITLES].assert_awaited_once()
    handlers[StageName.FINALIZATION].assert_awaited_once()


@pytest.mark.asyncio
async def test_retry_subtask_raises_if_subtask_not_registered():
    handlers = _make_handlers()
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()
    vc = job.get_or_create_stage(StageName.VOICE_CLONING)
    # No subtasks registered

    with pytest.raises(ValueError, match="not found"):
        await runner.retry_subtask(job, StageName.VOICE_CLONING, "ghost")


@pytest.mark.asyncio
async def test_constructor_rejects_missing_handlers():
    with pytest.raises(ValueError, match="missing"):
        ResumablePipelineRunner(stage_handlers={
            StageName.TRANSCRIPTION: AsyncMock(),
            # Missing all other handlers
        })


@pytest.mark.asyncio
async def test_retry_stage_reruns_stage_then_continues():
    handlers = _make_handlers()
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()
    # Simulate: everything done, but VOICE_CLONING now failed
    for name in (
        StageName.TRANSCRIPTION,
        StageName.CHARACTER_EXTRACTION,
        StageName.FACE_EXTRACTION,
    ):
        s = job.get_or_create_stage(name)
        s.mark_completed()
    vc = job.get_or_create_stage(StageName.VOICE_CLONING)
    vc.mark_failed("transient")

    await runner.retry_stage(job, StageName.VOICE_CLONING)

    handlers[StageName.VOICE_CLONING].assert_awaited_once()
    handlers[StageName.SUBTITLES].assert_awaited_once()
    handlers[StageName.FINALIZATION].assert_awaited_once()
    assert job.get_stage(StageName.VOICE_CLONING).status == StageStatus.COMPLETED


@pytest.mark.asyncio
async def test_retry_stage_increments_retry_count():
    handlers = _make_handlers()
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()
    vc = job.get_or_create_stage(StageName.VOICE_CLONING)
    vc.mark_failed("first attempt failed")
    assert vc.retry_count == 0

    await runner.retry_stage(job, StageName.VOICE_CLONING)

    vc_after = job.get_stage(StageName.VOICE_CLONING)
    assert vc_after.retry_count == 1
    assert vc_after.status == StageStatus.COMPLETED


@pytest.mark.asyncio
async def test_retry_stage_clears_stale_subtasks():
    """retry_stage should wipe subtask state so handlers start fresh."""
    handlers = _make_handlers()
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()
    vc = job.get_or_create_stage(StageName.VOICE_CLONING)
    vc.add_subtask("alice")
    vc.start_subtask("alice")
    vc.fail_subtask("alice", "old failure")
    vc.mark_failed("stale")

    await runner.retry_stage(job, StageName.VOICE_CLONING)

    # The empty handler didn't repopulate subtasks, so the stage should
    # still be reachable — the key assertion is that the OLD stale subtask
    # is gone.
    assert "alice" not in job.get_stage(StageName.VOICE_CLONING).subtasks


@pytest.mark.asyncio
async def test_retry_subtask_exception_marks_stage_failed_with_new_error():
    handlers = _make_handlers()

    async def failing_handler(job, resume_subtask=None):
        raise RuntimeError("retry also failed")

    handlers[StageName.VOICE_CLONING].side_effect = failing_handler
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()
    vc = job.get_or_create_stage(StageName.VOICE_CLONING)
    vc.add_subtask("bob")
    vc.start_subtask("bob")
    vc.fail_subtask("bob", "original error")
    vc.mark_failed("original stage error")

    await runner.retry_subtask(job, StageName.VOICE_CLONING, "bob")

    vc_after = job.get_stage(StageName.VOICE_CLONING)
    assert vc_after.status == StageStatus.FAILED
    assert "retry also failed" in vc_after.error
    assert vc_after.subtasks["bob"].status == StageStatus.FAILED
    assert "retry also failed" in vc_after.subtasks["bob"].error


@pytest.mark.asyncio
async def test_stage_fails_when_handler_leaves_subtasks_non_terminal():
    """A buggy handler that adds a subtask but forgets to complete it
    should cause the stage to be marked FAILED, not silently advance."""
    handlers = _make_handlers()

    async def buggy_handler(job, resume_subtask=None):
        stage = job.get_or_create_stage(StageName.VOICE_CLONING)
        stage.add_subtask("alice")
        stage.start_subtask("alice")
        # Oops — never completed alice

    handlers[StageName.VOICE_CLONING].side_effect = buggy_handler
    runner = ResumablePipelineRunner(stage_handlers=handlers)
    job = _make_job()

    await runner.run_all(job)

    vc = job.get_stage(StageName.VOICE_CLONING)
    assert vc.status == StageStatus.FAILED
    assert "non-terminal" in vc.error
    # Subsequent stages should NOT run
    handlers[StageName.SUBTITLES].assert_not_awaited()
    handlers[StageName.FINALIZATION].assert_not_awaited()
