"""Tests for the stages field added to IngestJob.

Uses model_construct() to bypass Beanie Document.__init__ — these are pure
in-memory field/method tests that do not require a live MongoDB connection.
"""
import pytest
from app.models.ingest_job import IngestJob
from app.models.pipeline_stage import StageName, StageStatus


def _make_job(**kwargs) -> IngestJob:
    """Construct an IngestJob without Beanie DB initialization."""
    defaults = dict(
        job_id="test-job",
        partner_id="p1",
        content_id="c1",
        video_url="https://example.com/x.mp4",
        direct=False,
        capabilities={},
        stages=[],
        error_detail=None,
    )
    defaults.update(kwargs)
    return IngestJob.model_construct(**defaults)


def test_ingest_job_starts_with_empty_stages():
    job = _make_job(job_id="test-1")
    assert job.stages == []


def test_get_or_create_stage_idempotent():
    job = _make_job(job_id="test-2")
    first = job.get_or_create_stage(StageName.TRANSCRIPTION)
    second = job.get_or_create_stage(StageName.TRANSCRIPTION)
    assert first is second
    assert len(job.stages) == 1


def test_first_failed_stage_returns_earliest_failure():
    job = _make_job(job_id="test-3")
    s1 = job.get_or_create_stage(StageName.TRANSCRIPTION)
    s1.mark_completed()
    s2 = job.get_or_create_stage(StageName.CHARACTER_EXTRACTION)
    s2.mark_failed("claude timeout")
    s3 = job.get_or_create_stage(StageName.FACE_EXTRACTION)
    s3.mark_failed("mediapipe crash")
    failed = job.first_failed_stage()
    assert failed is not None
    assert failed.name == StageName.CHARACTER_EXTRACTION


def test_first_failed_stage_none_when_all_ok():
    job = _make_job(job_id="test-4")
    s1 = job.get_or_create_stage(StageName.TRANSCRIPTION)
    s1.mark_completed()
    assert job.first_failed_stage() is None


def test_get_stage_returns_none_if_not_created():
    job = _make_job(job_id="test-5")
    assert job.get_stage(StageName.VOICE_CLONING) is None
    job.get_or_create_stage(StageName.VOICE_CLONING)
    assert job.get_stage(StageName.VOICE_CLONING) is not None


def test_stages_field_preserves_existing_capabilities_dict():
    """Stages is additive — the legacy capabilities dict must still work."""
    job = _make_job(
        job_id="test-6",
        capabilities={"characters": "pending", "subtitles": "processing"},
    )
    assert job.capabilities == {"characters": "pending", "subtitles": "processing"}
    assert job.stages == []
