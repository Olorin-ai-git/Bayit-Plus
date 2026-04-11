"""End-to-end integration tests for the resumable training video pipeline.

Exercises the full ``run_pipeline`` entry point through all 8 stages
(transcription → character_extraction → subtitles → face_extraction →
voice_cloning → trivia → search_index → finalization) with every
external I/O surface mocked — no MongoDB, no ElevenLabs, no Anthropic,
no YuNet, no GCS, no ffmpeg.

The goal is catching regressions in how stages wire together and how
``Content.processing_state`` transitions (PROCESSING → READY on success,
PROCESSING → FAILED on any stage failure, FAILED → READY on retry
success) — none of which is covered by the per-handler unit tests in
``test_new_stage_handlers.py`` or the runner-level tests in
``test_resumable_ingest.py``.

Each test patches the legacy stage helpers that live inside
``ingest_orchestrator`` itself (``_run_transcription`` etc.), plus
``Content.get`` and ``_fetch_partner``. The stage-handler adapters
(``_stage_transcription`` etc.) call through to those helpers directly,
so patching at that layer catches both the adapter wiring and the
stage-order contract.
"""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.content import ProcessingState
from app.models.ingest_job import IngestJob
from app.models.pipeline_stage import StageName, StageStatus

pytestmark = pytest.mark.asyncio


def _make_character(name: str, frame_url: str | None = None):
    char = MagicMock()
    char.name = name
    char.frame_url = frame_url
    char.voice_id = None
    return char


def _make_content(characters=None, content_id="content-e2e-1"):
    content = MagicMock()
    content.id = content_id
    content.content_id = content_id
    content.title = "E2E Test Video"
    content.transcript = ""
    content.transcript_segments = []
    content.interactive_characters = characters or []
    content.processing_state = ProcessingState.READY  # initial default
    content.save = AsyncMock()
    return content


def _make_partner():
    partner = MagicMock()
    partner.partner_id = "training-e2e-partner"
    partner.training_config = {"org_tier": "organization"}  # unlimited tier
    return partner


def _make_job(content_id="content-e2e-1"):
    job = IngestJob.model_construct(
        job_id="job-e2e-1",
        partner_id="training-e2e-partner",
        content_id=content_id,
        video_url="https://example.com/e2e.mp4",
        capabilities={
            "characters": "pending",
            "subtitles": "pending",
        },
        stages=[],
        direct=True,
        error_detail=None,
    )
    object.__setattr__(job, "save", AsyncMock())
    object.__setattr__(job, "update_capability", AsyncMock())
    return job


@pytest.fixture
def e2e_patches():
    """Patch every external I/O surface the pipeline touches.

    Yields a dict where the named-mock entries are the LIVE mock
    objects (the return values of ``patcher.start()``) so tests can
    set side_effects / assert call counts directly.
    """
    alice = _make_character("Alice")
    content = _make_content(characters=[alice])
    partner = _make_partner()

    # Map each name to a started patcher. Ordering irrelevant — no
    # dependencies between patches.
    patch_specs = [
        ("content_get", "Content.get", {"return_value": content}),
        ("fetch_partner", "_fetch_partner", {"return_value": partner}),
        ("run_transcription", "_run_transcription",
            {"return_value": "hello world transcript"}),
        ("run_characters", "_run_characters", {}),
        ("run_subtitles", "_run_subtitles", {}),
        ("run_trivia", "_run_trivia", {}),
        ("run_search", "_run_search", {}),
        ("run_finalization", "_run_finalization", {}),
        ("run_face_extraction", "_run_face_extraction", {}),
        ("run_voice_cloning", "_run_voice_cloning", {}),
    ]

    started_patchers = []
    mocks: dict = {
        "content": content,
        "alice": alice,
        "partner": partner,
    }
    for name, attr, kwargs in patch_specs:
        target = f"app.services.olorin.ingest_orchestrator.{attr}"
        p = patch(target, new_callable=AsyncMock, **kwargs)
        started_patchers.append(p)
        mocks[name] = p.start()

    yield mocks

    for p in reversed(started_patchers):
        p.stop()


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


async def test_e2e_full_pipeline_happy_path(e2e_patches):
    """All 8 stages complete. Content flips PROCESSING → READY via the
    _run_finalization handler, and every handler is invoked exactly once
    in declaration order."""
    from app.services.olorin.ingest_orchestrator import run_pipeline

    content = e2e_patches["content"]
    job = _make_job()

    # _run_finalization is what flips processing_state to READY — since
    # we're mocking it, we need the mock to do that for us.
    async def fake_finalization(j, resume_subtask=None):
        content.processing_state = ProcessingState.READY
        await content.save()

    e2e_patches["run_finalization"].side_effect = fake_finalization

    await run_pipeline(job)

    # processing_state was flipped to PROCESSING at start, then READY
    # by the finalization mock above. End state is READY.
    assert content.processing_state == ProcessingState.READY

    # Every stage ran exactly once.
    assert e2e_patches["run_transcription"].await_count == 1
    assert e2e_patches["run_characters"].await_count == 1
    assert e2e_patches["run_subtitles"].await_count == 1
    assert e2e_patches["run_face_extraction"].await_count == 1
    assert e2e_patches["run_voice_cloning"].await_count == 1
    assert e2e_patches["run_trivia"].await_count == 1
    assert e2e_patches["run_search"].await_count == 1
    assert e2e_patches["run_finalization"].await_count == 1

    # Every stage is COMPLETED in the job's stages list.
    assert len(job.stages) == 9
    for stage in job.stages:
        assert stage.status == StageStatus.COMPLETED, (
            f"{stage.name} is {stage.status}, expected COMPLETED"
        )

    # Stages are in PIPELINE_ORDER.
    from app.services.olorin.resumable_ingest import PIPELINE_ORDER
    assert [s.name for s in job.stages] == list(PIPELINE_ORDER)


# ---------------------------------------------------------------------------
# Failure path
# ---------------------------------------------------------------------------


async def test_e2e_face_extraction_failure_flips_content_to_failed(e2e_patches):
    """When face_extraction fails, run_pipeline flips Content.processing_state
    to FAILED and leaves downstream stages untouched."""
    from app.services.olorin.ingest_orchestrator import run_pipeline

    content = e2e_patches["content"]
    job = _make_job()

    async def failing_face_extraction(j, resume_subtask=None):
        # Runner only marks a stage FAILED if the handler raises OR
        # it populated subtasks and some failed. Raise to signal
        # stage-level failure (e.g. video download broke entirely).
        raise RuntimeError("no face detected: all candidates missed")

    e2e_patches["run_face_extraction"].side_effect = failing_face_extraction

    await run_pipeline(job)

    assert content.processing_state == ProcessingState.FAILED

    # Upstream stages (transcription, characters, subtitles) ran.
    assert e2e_patches["run_transcription"].await_count == 1
    assert e2e_patches["run_characters"].await_count == 1
    assert e2e_patches["run_subtitles"].await_count == 1
    # Face extraction ran and failed.
    assert e2e_patches["run_face_extraction"].await_count == 1
    # Downstream stages did NOT run.
    assert e2e_patches["run_voice_cloning"].await_count == 0
    assert e2e_patches["run_trivia"].await_count == 0
    assert e2e_patches["run_search"].await_count == 0
    assert e2e_patches["run_finalization"].await_count == 0

    face_stage = job.get_stage(StageName.FACE_EXTRACTION)
    assert face_stage is not None
    assert face_stage.status == StageStatus.FAILED
    assert "no face detected" in face_stage.error


# ---------------------------------------------------------------------------
# Retry after failure
# ---------------------------------------------------------------------------


async def test_e2e_retry_stage_recovers_from_face_failure(e2e_patches):
    """After a face_extraction failure, retry_stage(FACE_EXTRACTION) re-runs
    face extraction and continues forward through voice_cloning/trivia/
    search_index/finalization, flipping Content.processing_state back
    to READY via _sync_content_state.
    """
    from app.services.olorin.ingest_orchestrator import (
        retry_stage as orch_retry_stage,
        run_pipeline,
    )

    content = e2e_patches["content"]
    job = _make_job()

    # First pipeline run: face extraction fails.
    async def failing_face(j, resume_subtask=None):
        raise RuntimeError("no face detected")

    e2e_patches["run_face_extraction"].side_effect = failing_face

    await run_pipeline(job)
    assert content.processing_state == ProcessingState.FAILED

    # Reset mocks to prepare for the retry. Track post-retry invocations.
    e2e_patches["run_face_extraction"].reset_mock()
    e2e_patches["run_face_extraction"].side_effect = None  # now succeeds
    e2e_patches["run_voice_cloning"].reset_mock()
    e2e_patches["run_trivia"].reset_mock()
    e2e_patches["run_search"].reset_mock()
    e2e_patches["run_finalization"].reset_mock()

    # _run_finalization flips content back to READY.
    async def fake_finalization(j, resume_subtask=None):
        content.processing_state = ProcessingState.READY
        await content.save()

    e2e_patches["run_finalization"].side_effect = fake_finalization

    # Retry the face_extraction stage.
    await orch_retry_stage(job, StageName.FACE_EXTRACTION)

    # _sync_content_state flipped content back to READY.
    assert content.processing_state == ProcessingState.READY

    # Face extraction re-ran.
    assert e2e_patches["run_face_extraction"].await_count == 1
    # Downstream stages all re-ran forward.
    assert e2e_patches["run_voice_cloning"].await_count == 1
    assert e2e_patches["run_trivia"].await_count == 1
    assert e2e_patches["run_search"].await_count == 1
    assert e2e_patches["run_finalization"].await_count == 1

    # Upstream stages (transcription etc.) were NOT re-run — they
    # stayed COMPLETED from the first pipeline pass.
    assert e2e_patches["run_transcription"].await_count == 1
    assert e2e_patches["run_characters"].await_count == 1
    assert e2e_patches["run_subtitles"].await_count == 1

    # All stages in the job are now COMPLETED.
    for stage in job.stages:
        assert stage.status == StageStatus.COMPLETED, (
            f"after retry: {stage.name} is {stage.status}"
        )


async def test_e2e_retry_subtask_runs_only_that_subtask(e2e_patches):
    """retry_subtask on a voice_cloning subtask runs just that character
    (via resume_subtask arg) and continues forward through trivia/
    search/finalization.
    """
    from app.services.olorin.ingest_orchestrator import (
        retry_subtask as orch_retry_subtask,
        run_pipeline,
    )

    content = e2e_patches["content"]
    # Two characters so we can verify only one is retried
    alice = _make_character("Alice")
    bob = _make_character("Bob")
    content.interactive_characters = [alice, bob]
    job = _make_job()

    # Voice cloning marks one character succeeded and one failed.
    async def voice_with_failure(j, resume_subtask=None):
        stage = j.get_or_create_stage(StageName.VOICE_CLONING)
        for name in ("Alice", "Bob"):
            if resume_subtask and name != resume_subtask:
                continue
            stage.add_subtask(name)
            stage.start_subtask(name)
            if name == "Bob":
                stage.fail_subtask(name, "elevenlabs 429")
            else:
                stage.complete_subtask(name)
        if stage.has_failed_subtasks():
            stage.mark_failed("one subtask failed")

    e2e_patches["run_voice_cloning"].side_effect = voice_with_failure

    await run_pipeline(job)
    assert content.processing_state == ProcessingState.FAILED
    vc_stage = job.get_stage(StageName.VOICE_CLONING)
    assert vc_stage.subtasks["Alice"].status == StageStatus.COMPLETED
    assert vc_stage.subtasks["Bob"].status == StageStatus.FAILED

    # Retry: Bob's voice clone now succeeds.
    async def voice_retry_bob(j, resume_subtask=None):
        assert resume_subtask == "Bob"
        stage = j.get_or_create_stage(StageName.VOICE_CLONING)
        # start_subtask resets Bob to RUNNING
        stage.start_subtask("Bob")
        stage.complete_subtask("Bob")

    e2e_patches["run_voice_cloning"].reset_mock()
    e2e_patches["run_voice_cloning"].side_effect = voice_retry_bob
    e2e_patches["run_trivia"].reset_mock()
    e2e_patches["run_search"].reset_mock()
    e2e_patches["run_finalization"].reset_mock()

    async def fake_finalization(j, resume_subtask=None):
        content.processing_state = ProcessingState.READY
        await content.save()

    e2e_patches["run_finalization"].side_effect = fake_finalization

    await orch_retry_subtask(job, StageName.VOICE_CLONING, "Bob")

    # Content is READY again.
    assert content.processing_state == ProcessingState.READY
    # Voice cloning handler ran once with resume_subtask="Bob"
    assert e2e_patches["run_voice_cloning"].await_count == 1
    # Downstream stages continued forward.
    assert e2e_patches["run_trivia"].await_count == 1
    assert e2e_patches["run_search"].await_count == 1
    assert e2e_patches["run_finalization"].await_count == 1

    # Bob is now COMPLETED; Alice was never touched.
    assert vc_stage.subtasks["Alice"].status == StageStatus.COMPLETED
    assert vc_stage.subtasks["Bob"].status == StageStatus.COMPLETED


# ---------------------------------------------------------------------------
# Resume path
# ---------------------------------------------------------------------------


async def test_e2e_resume_picks_up_after_failure_without_rerunning_completed(
    e2e_patches,
):
    """resume_pipeline() re-enters at the first non-completed stage and
    does NOT re-run upstream completed stages."""
    from app.services.olorin.ingest_orchestrator import (
        resume_pipeline,
        run_pipeline,
    )

    content = e2e_patches["content"]
    job = _make_job()

    async def failing_trivia(j, resume_subtask=None):
        raise RuntimeError("anthropic 529 overloaded")

    e2e_patches["run_trivia"].side_effect = failing_trivia

    await run_pipeline(job)
    assert content.processing_state == ProcessingState.FAILED

    # Resume: trivia now succeeds.
    e2e_patches["run_transcription"].reset_mock()
    e2e_patches["run_characters"].reset_mock()
    e2e_patches["run_subtitles"].reset_mock()
    e2e_patches["run_face_extraction"].reset_mock()
    e2e_patches["run_voice_cloning"].reset_mock()
    e2e_patches["run_trivia"].reset_mock()
    e2e_patches["run_trivia"].side_effect = None
    e2e_patches["run_search"].reset_mock()
    e2e_patches["run_finalization"].reset_mock()

    async def fake_finalization(j, resume_subtask=None):
        content.processing_state = ProcessingState.READY
        await content.save()

    e2e_patches["run_finalization"].side_effect = fake_finalization

    await resume_pipeline(job)

    # Upstream stages (transcription through voice_cloning) did NOT re-run.
    assert e2e_patches["run_transcription"].await_count == 0
    assert e2e_patches["run_characters"].await_count == 0
    assert e2e_patches["run_subtitles"].await_count == 0
    assert e2e_patches["run_face_extraction"].await_count == 0
    assert e2e_patches["run_voice_cloning"].await_count == 0
    # Trivia re-ran + downstream continued.
    assert e2e_patches["run_trivia"].await_count == 1
    assert e2e_patches["run_search"].await_count == 1
    assert e2e_patches["run_finalization"].await_count == 1

    assert content.processing_state == ProcessingState.READY


@pytest.mark.asyncio
async def test_pipeline_persists_native_chapters_when_present(monkeypatch):
    """End-to-end: native chapters from yt-dlp metadata reach VideoChapters."""
    create_or_update_mock = AsyncMock()
    monkeypatch.setattr(
        "app.services.olorin.chapter_extraction.VideoChapters.create_or_update",
        create_or_update_mock,
    )
    monkeypatch.setattr(
        "app.services.olorin.chapter_extraction.fetch_native_chapters_via_ytdlp",
        AsyncMock(return_value=(
            [
                {"start_time": 0.0, "end_time": 60.0, "title": "Intro"},
                {"start_time": 60.0, "end_time": 240.0, "title": "Demo"},
            ],
            240.0,
        )),
    )
    monkeypatch.setattr(
        "app.services.olorin.chapter_extraction.generate_chapters_from_transcript_generic",
        AsyncMock(side_effect=AssertionError("AI must not be called when native present")),
    )

    from app.services.olorin.ingest_orchestrator import _stage_chapters

    content = MagicMock()
    content.id = "content-e2e"
    content.title = "Demo Video"
    object.__setattr__(content, "transcript", "lorem ipsum")
    object.__setattr__(content, "transcript_segments", [
        {"start": 0.0, "end": 240.0, "text": "x", "speaker": "speaker_0"},
    ])

    job = MagicMock()
    job.job_id = "job-e2e"
    job.content_id = "content-e2e"
    job.video_url = "https://youtu.be/abc"

    monkeypatch.setattr(
        "app.services.olorin.ingest_orchestrator.Content.get",
        AsyncMock(return_value=content),
    )

    await _stage_chapters(job, resume_subtask=None)

    create_or_update_mock.assert_awaited_once()
    kwargs = create_or_update_mock.await_args.kwargs
    assert kwargs["source"] == "youtube_native"
    assert len(kwargs["chapters"]) == 2
    assert kwargs["chapters"][0].title == "Intro"
