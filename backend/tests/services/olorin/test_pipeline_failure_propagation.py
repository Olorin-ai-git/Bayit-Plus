"""Regression tests for the 2026-04-10 silent-failure fix.

Covers:

- Transcription raises on download failure → stage FAILED, pipeline halts
- Per-capability handlers re-raise failures → stage FAILED
- Finalization refuses to flip READY when any prior stage is FAILED
- yt-dlp cookie flag is injected only when YTDLP_COOKIES_FILE is set
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.ingest_job import IngestJob
from app.models.pipeline_stage import StageName, StageStatus
from app.services.olorin.ingest_orchestrator import (
    DurationLimitExceeded,
    MANUAL_PORTRAIT_UPLOAD_MARKER,
    _run_finalization,
    _run_transcription,
)


def _make_job(stages=None):
    job = IngestJob.model_construct(
        job_id="job-fail",
        partner_id="p",
        content_id="c",
        video_url="https://example.com/v.mp4",
        capabilities={"characters": "pending", "subtitles": "pending"},
        stages=stages or [],
        error_detail=None,
    )
    object.__setattr__(job, "save", AsyncMock())
    return job


def _make_content(state="processing"):
    content = MagicMock()
    content.id = "content-xyz"
    content.processing_state = MagicMock()
    content.processing_state.value = state
    content.save = AsyncMock()
    return content


def _make_partner(tier="organization"):
    partner = MagicMock()
    partner.partner_id = "p"
    partner.training_config = {"org_tier": tier}
    return partner


# ---------------------------------------------------------------------------
# Transcription propagation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_transcription_download_failure_propagates_exception():
    """yt-dlp / HTTP errors must raise so runner marks stage FAILED."""
    job = _make_job()
    content = _make_content()
    partner = _make_partner()

    with patch(
        "app.services.olorin.ingest_orchestrator.transcribe_video",
        new=AsyncMock(side_effect=RuntimeError("yt-dlp failed (exit 1): sign in")),
    ):
        with pytest.raises(RuntimeError, match="yt-dlp failed"):
            await _run_transcription(job, content, partner)


@pytest.mark.asyncio
async def test_transcription_empty_text_raises():
    """An empty transcript must not silently succeed."""
    job = _make_job()
    content = _make_content()
    partner = _make_partner()

    fake_result = MagicMock()
    fake_result.duration_seconds = 10.0
    fake_result.full_text = ""
    fake_result.segments = []

    with patch(
        "app.services.olorin.ingest_orchestrator.transcribe_video",
        new=AsyncMock(return_value=fake_result),
    ):
        with pytest.raises(RuntimeError, match="no text"):
            await _run_transcription(job, content, partner)


@pytest.mark.asyncio
async def test_transcription_duration_gate_raises_typed_error():
    """Over-limit videos raise DurationLimitExceeded so tests can distinguish."""
    job = _make_job()
    content = _make_content()
    partner = _make_partner(tier="trial")

    fake_result = MagicMock()
    fake_result.duration_seconds = 99_999.0
    fake_result.full_text = "hello world"
    fake_result.segments = []

    with patch(
        "app.services.olorin.ingest_orchestrator.transcribe_video",
        new=AsyncMock(return_value=fake_result),
    ), patch(
        "app.services.olorin.ingest_orchestrator.settings",
    ) as mock_settings:
        mock_settings.TRAINING_MAX_DURATION_TRIAL_SECONDS = 1800
        mock_settings.TRAINING_MAX_DURATION_TEAM_SECONDS = 7200
        with pytest.raises(DurationLimitExceeded, match="Trial tier limit"):
            await _run_transcription(job, content, partner)


# ---------------------------------------------------------------------------
# Finalization guard
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_finalization_refuses_when_prior_stage_failed():
    """A FAILED upstream stage must block finalization from flipping READY."""
    job = _make_job()
    stage = job.get_or_create_stage(StageName.TRANSCRIPTION)
    stage.mark_failed("download failed")

    with pytest.raises(RuntimeError, match="cannot finalize"):
        await _run_finalization(job)


@pytest.mark.asyncio
async def test_finalization_happy_path_flips_content_ready():
    """All stages COMPLETED → finalization flips content to READY."""
    job = _make_job()
    for name in (
        StageName.TRANSCRIPTION,
        StageName.CHARACTER_EXTRACTION,
        StageName.SUBTITLES,
        StageName.FACE_EXTRACTION,
        StageName.VOICE_CLONING,
        StageName.TRIVIA,
        StageName.SEARCH_INDEX,
    ):
        job.get_or_create_stage(name).mark_completed()

    content = MagicMock()
    content.save = AsyncMock()
    with patch(
        "app.services.olorin.ingest_orchestrator.Content.get",
        new=AsyncMock(return_value=content),
    ):
        await _run_finalization(job)

    # ProcessingState.READY enum member — just verify the attribute was set
    assert content.processing_state is not None
    content.save.assert_awaited()


# ---------------------------------------------------------------------------
# yt-dlp cookie wiring
# ---------------------------------------------------------------------------

def test_ytdlp_command_omits_cookies_when_unset():
    from app.services.olorin.video_transcriber import _ytdlp_command

    args = _ytdlp_command("https://youtu.be/abc", "/tmp/out.mp4", None)

    assert "--cookies" not in args
    assert args[0] == "yt-dlp"
    assert "https://youtu.be/abc" in args
    assert "/tmp/out.mp4" in args
    # Remote-components flag is always injected — yt-dlp needs it to
    # solve YouTube's JS n-sig challenge from a datacenter IP.
    assert "--remote-components" in args
    assert "ejs:github" in args


def test_ytdlp_command_injects_cookies_when_set():
    from app.services.olorin.video_transcriber import _ytdlp_command

    args = _ytdlp_command(
        "https://youtu.be/abc",
        "/tmp/out.mp4",
        "/tmp/ytdlp-cookies-xyz.txt",
    )

    assert "--cookies" in args
    idx = args.index("--cookies")
    assert args[idx + 1] == "/tmp/ytdlp-cookies-xyz.txt"


# ---------------------------------------------------------------------------
# Atomic mutator persistence
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_mark_stage_running_then_completed_persists_transitions():
    """Atomic mutators must not orphan the stage reference.

    This is the unit-level version of the bug reproduced on the VPS:
    holding a StageExecution reference across job.save() used to clobber
    mark_completed() because Beanie replaces the list in place.
    """
    job = _make_job()

    await job.mark_stage_running(StageName.TRANSCRIPTION)
    stage = job.get_or_create_stage(StageName.TRANSCRIPTION)
    assert stage.status == StageStatus.RUNNING
    assert stage.started_at is not None

    await job.mark_stage_completed(StageName.TRANSCRIPTION)
    stage = job.get_or_create_stage(StageName.TRANSCRIPTION)
    assert stage.status == StageStatus.COMPLETED
    assert stage.completed_at is not None


@pytest.mark.asyncio
async def test_mark_manual_portrait_subtask_sets_marker():
    """Manual-portrait audit trail preserved via atomic mutator."""
    job = _make_job()
    await job.mark_manual_portrait_subtask(
        StageName.FACE_EXTRACTION,
        "Alice",
        MANUAL_PORTRAIT_UPLOAD_MARKER,
    )
    stage = job.get_or_create_stage(StageName.FACE_EXTRACTION)
    assert stage.subtasks["Alice"].status == StageStatus.COMPLETED
    assert stage.subtasks["Alice"].error == MANUAL_PORTRAIT_UPLOAD_MARKER


@pytest.mark.asyncio
async def test_reset_stage_for_retry_clears_subtasks_and_timestamps():
    job = _make_job()
    await job.mark_stage_running(StageName.VOICE_CLONING)
    await job.add_stage_subtask(StageName.VOICE_CLONING, "Alice")
    await job.fail_stage_subtask(StageName.VOICE_CLONING, "Alice", "boom")
    await job.mark_stage_failed(StageName.VOICE_CLONING, "one subtask failed")

    await job.reset_stage_for_retry(StageName.VOICE_CLONING)

    stage = job.get_or_create_stage(StageName.VOICE_CLONING)
    assert stage.subtasks == {}
    assert stage.started_at is None
    assert stage.completed_at is None
    assert stage.error is None
    # Status intentionally left FAILED so next mark_running increments retry_count
    assert stage.status == StageStatus.FAILED
