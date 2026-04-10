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


def test_first_failed_stage_uses_declaration_order_not_lexicographic():
    """Regression guard: first_failed_stage must iterate StageName in
    declaration order (VOICE_CLONING index 4), not lexicographic string
    order (which would pick FINALIZATION because 'finalization' < 'voice_cloning').
    """
    job = _make_job(job_id="test-decl-order")
    # Mark voice_cloning failed — declaration index 3
    vc = job.get_or_create_stage(StageName.VOICE_CLONING)
    vc.mark_failed("elevenlabs 429")
    # Mark finalization failed — declaration index 7
    fin = job.get_or_create_stage(StageName.FINALIZATION)
    fin.mark_failed("cleanup crash")

    failed = job.first_failed_stage()
    assert failed is not None
    assert failed.name == StageName.VOICE_CLONING, (
        "first_failed_stage must iterate in StageName declaration order; "
        "a lexicographic implementation would return FINALIZATION instead"
    )


def test_stages_field_coerces_null_from_stored_document():
    """Regression guard: loading an existing document that has
    `stages: null` (from a legacy write or partial migration) must not
    raise ValidationError. The validator coerces null -> empty list.

    model_validate cannot be used here because Beanie's Document.__init__
    calls get_pymongo_collection() which requires an initialised collection.
    Instead we invoke the model_validator classmethod directly — the same
    path that Pydantic takes when parsing a raw dict — then construct the
    object with the already-coerced values.
    """
    raw = {
        "job_id": "test-null-stages",
        "partner_id": "p1",
        "content_id": "c1",
        "video_url": "https://example.com/x.mp4",
        "capabilities": {"characters": "pending"},
        "stages": None,
    }
    # Exercise the validator directly (same call Pydantic makes in mode='before').
    coerced = IngestJob._coerce_null_stages(raw)
    assert coerced["stages"] == [], "validator must coerce None -> []"

    # Construct with the coerced payload — stages is now a valid empty list.
    job = _make_job(**{k: v for k, v in coerced.items() if k in {
        "job_id", "partner_id", "content_id", "video_url", "capabilities", "stages",
    }})
    assert job.stages == []
    assert job.capabilities == {"characters": "pending"}
