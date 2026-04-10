"""Tests for _run_face_extraction, _run_voice_cloning, _run_finalization.

Uses model_construct() + object.__setattr__ to bypass Beanie Document init.
All external I/O (Content.find_one, FaceExtractionService, voice cloner,
content.save, job.save) is mocked — no MongoDB / FFmpeg / ElevenLabs needed.
"""
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.pipeline_stage import StageName, StageStatus
from app.models.ingest_job import IngestJob
from app.services.olorin.face_extraction import NoFaceDetectedError
from app.services.vod_interaction.voice_cloner import VoiceCloneResult


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_character(name: str, frame_url: str = None):
    char = MagicMock()
    char.name = name
    char.frame_url = frame_url
    char.voice_id = None
    return char


def _make_content(characters=None, content_id="content-xyz"):
    content = MagicMock()
    content.id = content_id
    content.content_id = content_id
    content.title = "Test Film"
    content.interactive_characters = characters or []
    content.transcript_segments = []
    content.save = AsyncMock()
    return content


def _make_job(content_id="content-xyz"):
    job = IngestJob.model_construct(
        job_id="job-test",
        partner_id="partner-1",
        content_id=content_id,
        video_url="https://example.com/video.mp4",
        capabilities={},
        stages=[],
        error_detail=None,
    )
    object.__setattr__(job, "save", AsyncMock())
    return job


# ---------------------------------------------------------------------------
# _run_face_extraction tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_face_extraction_processes_all_characters():
    """Happy path: both characters get frame_url set."""
    from app.services.olorin.ingest_orchestrator import _run_face_extraction

    char_a = _make_character("Alice")
    char_b = _make_character("Bob")
    content = _make_content(characters=[char_a, char_b])
    job = _make_job()

    with (
        patch(
            "app.services.olorin.ingest_orchestrator.Content.get",
            new=AsyncMock(return_value=content),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator.find_subtitle_track",
            new=AsyncMock(return_value=None),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator._download_video",
            new=AsyncMock(return_value=Path("/tmp/fake_video.mp4")),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator.FaceExtractionService"
        ) as MockFaceSvc,
    ):
        mock_svc_instance = MagicMock()
        mock_svc_instance.extract_portrait = AsyncMock(
            side_effect=lambda **kw: f"https://gcs/{kw['character_name']}.jpg"
        )
        MockFaceSvc.return_value = mock_svc_instance

        await _run_face_extraction(job)

    assert char_a.frame_url == "https://gcs/Alice.jpg"
    assert char_b.frame_url == "https://gcs/Bob.jpg"
    stage = job.get_stage(StageName.FACE_EXTRACTION)
    assert stage is not None
    assert stage.subtasks["Alice"].status == StageStatus.COMPLETED
    assert stage.subtasks["Bob"].status == StageStatus.COMPLETED


@pytest.mark.asyncio
async def test_run_face_extraction_resume_subtask_processes_only_one():
    """When resume_subtask is set, only that character is processed."""
    from app.services.olorin.ingest_orchestrator import _run_face_extraction

    char_a = _make_character("Alice")
    char_b = _make_character("Bob")
    content = _make_content(characters=[char_a, char_b])
    job = _make_job()

    with (
        patch(
            "app.services.olorin.ingest_orchestrator.Content.get",
            new=AsyncMock(return_value=content),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator.find_subtitle_track",
            new=AsyncMock(return_value=None),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator._download_video",
            new=AsyncMock(return_value=Path("/tmp/fake_video.mp4")),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator.FaceExtractionService"
        ) as MockFaceSvc,
    ):
        mock_svc_instance = MagicMock()
        mock_svc_instance.extract_portrait = AsyncMock(
            return_value="https://gcs/Bob.jpg"
        )
        MockFaceSvc.return_value = mock_svc_instance

        await _run_face_extraction(job, resume_subtask="Bob")

    # Only Bob was processed
    assert mock_svc_instance.extract_portrait.await_count == 1
    call_kw = mock_svc_instance.extract_portrait.call_args.kwargs
    assert call_kw["character_name"] == "Bob"
    # Alice never touched
    stage = job.get_stage(StageName.FACE_EXTRACTION)
    assert "Alice" not in (stage.subtasks if stage else {})


@pytest.mark.asyncio
async def test_run_face_extraction_skips_character_with_existing_frame_url():
    """A character with a pre-existing frame_url is marked complete without re-running."""
    from app.services.olorin.ingest_orchestrator import _run_face_extraction

    char_a = _make_character("Alice", frame_url="https://gcs/existing.jpg")
    content = _make_content(characters=[char_a])
    job = _make_job()

    with (
        patch(
            "app.services.olorin.ingest_orchestrator.Content.get",
            new=AsyncMock(return_value=content),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator.find_subtitle_track",
            new=AsyncMock(return_value=None),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator._download_video",
            new=AsyncMock(return_value=Path("/tmp/fake_video.mp4")),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator.FaceExtractionService"
        ) as MockFaceSvc,
    ):
        mock_svc_instance = MagicMock()
        mock_svc_instance.extract_portrait = AsyncMock()
        MockFaceSvc.return_value = mock_svc_instance

        await _run_face_extraction(job)

    # extract_portrait must NOT have been called
    mock_svc_instance.extract_portrait.assert_not_awaited()
    stage = job.get_stage(StageName.FACE_EXTRACTION)
    assert stage.subtasks["Alice"].status == StageStatus.COMPLETED


@pytest.mark.asyncio
async def test_run_face_extraction_handles_no_face_error():
    """NoFaceDetectedError marks that character's subtask failed; others still run."""
    from app.services.olorin.ingest_orchestrator import _run_face_extraction

    char_a = _make_character("Alice")
    char_b = _make_character("Bob")
    content = _make_content(characters=[char_a, char_b])
    job = _make_job()

    async def _extract(**kw):
        if kw["character_name"] == "Alice":
            raise NoFaceDetectedError("no face for Alice")
        return "https://gcs/Bob.jpg"

    with (
        patch(
            "app.services.olorin.ingest_orchestrator.Content.get",
            new=AsyncMock(return_value=content),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator.find_subtitle_track",
            new=AsyncMock(return_value=None),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator._download_video",
            new=AsyncMock(return_value=Path("/tmp/fake_video.mp4")),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator.FaceExtractionService"
        ) as MockFaceSvc,
    ):
        mock_svc_instance = MagicMock()
        mock_svc_instance.extract_portrait = AsyncMock(side_effect=_extract)
        MockFaceSvc.return_value = mock_svc_instance

        await _run_face_extraction(job)

    stage = job.get_stage(StageName.FACE_EXTRACTION)
    assert stage.subtasks["Alice"].status == StageStatus.FAILED
    assert "no face" in stage.subtasks["Alice"].error
    assert stage.subtasks["Bob"].status == StageStatus.COMPLETED


# ---------------------------------------------------------------------------
# _run_voice_cloning tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_voice_cloning_processes_all_characters():
    """Happy path: all characters get their subtasks completed."""
    from app.services.olorin.ingest_orchestrator import _run_voice_cloning

    char_a = _make_character("Alice")
    char_b = _make_character("Bob")
    content = _make_content(characters=[char_a, char_b])
    job = _make_job()

    async def _clone(content, character_name):
        return VoiceCloneResult(
            character_name=character_name, status="cloned", voice_id="v-123",
        )

    with (
        patch(
            "app.services.olorin.ingest_orchestrator.Content.get",
            new=AsyncMock(return_value=content),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator.character_voice_cloner_service"
            ".clone_single_character",
            new=AsyncMock(side_effect=_clone),
        ),
    ):
        await _run_voice_cloning(job)

    stage = job.get_stage(StageName.VOICE_CLONING)
    assert stage.subtasks["Alice"].status == StageStatus.COMPLETED
    assert stage.subtasks["Bob"].status == StageStatus.COMPLETED


@pytest.mark.asyncio
async def test_run_voice_cloning_skipped_status_marks_subtask_complete():
    """'skipped' result (no dialogue) is not a failure — subtask is completed."""
    from app.services.olorin.ingest_orchestrator import _run_voice_cloning

    char_a = _make_character("Alice")
    content = _make_content(characters=[char_a])
    job = _make_job()

    with (
        patch(
            "app.services.olorin.ingest_orchestrator.Content.get",
            new=AsyncMock(return_value=content),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator.character_voice_cloner_service"
            ".clone_single_character",
            new=AsyncMock(return_value=VoiceCloneResult(
                character_name="Alice", status="skipped", reason="No dialogue cues mapped",
            )),
        ),
    ):
        await _run_voice_cloning(job)

    stage = job.get_stage(StageName.VOICE_CLONING)
    assert stage.subtasks["Alice"].status == StageStatus.COMPLETED


@pytest.mark.asyncio
async def test_run_voice_cloning_failed_result_marks_subtask_failed():
    """A 'failed' result from the cloner marks the subtask FAILED."""
    from app.services.olorin.ingest_orchestrator import _run_voice_cloning

    char_a = _make_character("Alice")
    content = _make_content(characters=[char_a])
    job = _make_job()

    with (
        patch(
            "app.services.olorin.ingest_orchestrator.Content.get",
            new=AsyncMock(return_value=content),
        ),
        patch(
            "app.services.olorin.ingest_orchestrator.character_voice_cloner_service"
            ".clone_single_character",
            new=AsyncMock(return_value=VoiceCloneResult(
                character_name="Alice", status="failed", reason="ElevenLabs API error",
            )),
        ),
    ):
        await _run_voice_cloning(job)

    stage = job.get_stage(StageName.VOICE_CLONING)
    assert stage.subtasks["Alice"].status == StageStatus.FAILED
    assert "ElevenLabs" in stage.subtasks["Alice"].error


# ---------------------------------------------------------------------------
# _run_finalization tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_finalization_sets_content_to_ready():
    """Finalization sets processing_state to READY and saves."""
    from app.services.olorin.ingest_orchestrator import _run_finalization
    from app.models.content import ProcessingState

    content = _make_content()
    content.processing_state = ProcessingState.PROCESSING
    job = _make_job()

    with patch(
        "app.services.olorin.ingest_orchestrator.Content.get",
        new=AsyncMock(return_value=content),
    ):
        await _run_finalization(job)

    assert content.processing_state == ProcessingState.READY
    content.save.assert_awaited_once()


@pytest.mark.asyncio
async def test_run_finalization_raises_when_content_missing():
    """Finalization raises RuntimeError if content cannot be found."""
    from app.services.olorin.ingest_orchestrator import _run_finalization

    job = _make_job()

    with patch(
        "app.services.olorin.ingest_orchestrator.Content.get",
        new=AsyncMock(return_value=None),
    ):
        with pytest.raises(RuntimeError, match="not found"):
            await _run_finalization(job)
