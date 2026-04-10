from datetime import datetime, timezone
import pytest
from app.models.pipeline_stage import (
    StageName,
    StageStatus,
    StageExecution,
    SubtaskExecution,
)


def test_stage_execution_starts_pending():
    stage = StageExecution(name=StageName.TRANSCRIPTION)
    assert stage.status == StageStatus.PENDING
    assert stage.started_at is None
    assert stage.completed_at is None
    assert stage.error is None
    assert stage.subtasks == {}


def test_mark_running_sets_started_at():
    stage = StageExecution(name=StageName.TRANSCRIPTION)
    stage.mark_running()
    assert stage.status == StageStatus.RUNNING
    assert stage.started_at is not None
    assert stage.started_at.tzinfo == timezone.utc


def test_mark_completed_sets_completed_at():
    stage = StageExecution(name=StageName.TRANSCRIPTION)
    stage.mark_running()
    stage.mark_completed()
    assert stage.status == StageStatus.COMPLETED
    assert stage.completed_at is not None
    assert stage.completed_at.tzinfo == timezone.utc


def test_mark_failed_records_error():
    stage = StageExecution(name=StageName.FACE_EXTRACTION)
    stage.mark_running()
    stage.mark_failed("mediapipe: no face detected")
    assert stage.status == StageStatus.FAILED
    assert stage.error == "mediapipe: no face detected"
    assert stage.completed_at is not None


def test_subtask_lifecycle():
    stage = StageExecution(name=StageName.VOICE_CLONING)
    stage.add_subtask("john_smith")
    assert stage.subtasks["john_smith"].status == StageStatus.PENDING
    stage.start_subtask("john_smith")
    assert stage.subtasks["john_smith"].status == StageStatus.RUNNING
    stage.complete_subtask("john_smith")
    assert stage.subtasks["john_smith"].status == StageStatus.COMPLETED


def test_stage_is_complete_when_all_subtasks_complete():
    stage = StageExecution(name=StageName.VOICE_CLONING)
    stage.add_subtask("alice")
    stage.add_subtask("bob")
    stage.start_subtask("alice")
    stage.complete_subtask("alice")
    assert not stage.all_subtasks_complete()
    stage.start_subtask("bob")
    stage.complete_subtask("bob")
    assert stage.all_subtasks_complete()


def test_failed_subtask_does_not_block_others():
    stage = StageExecution(name=StageName.VOICE_CLONING)
    stage.add_subtask("alice")
    stage.add_subtask("bob")
    stage.start_subtask("alice")
    stage.fail_subtask("alice", "elevenlabs 429")
    stage.start_subtask("bob")
    stage.complete_subtask("bob")
    assert stage.has_failed_subtasks()
    assert stage.subtasks["alice"].error == "elevenlabs 429"
    assert stage.subtasks["bob"].status == StageStatus.COMPLETED


def test_all_subtasks_complete_with_no_subtasks_reflects_stage_status():
    """For stages that don't use subtasks, all_subtasks_complete delegates
    to the stage's own status. This is intentional so callers can treat
    subtask and non-subtask stages uniformly."""
    stage = StageExecution(name=StageName.TRANSCRIPTION)
    assert not stage.all_subtasks_complete()  # PENDING
    stage.mark_running()
    assert not stage.all_subtasks_complete()  # RUNNING
    stage.mark_completed()
    assert stage.all_subtasks_complete()  # COMPLETED


def test_complete_subtask_raises_value_error_on_unknown_name():
    stage = StageExecution(name=StageName.VOICE_CLONING)
    with pytest.raises(ValueError, match="not registered"):
        stage.complete_subtask("ghost")


def test_fail_subtask_raises_value_error_on_unknown_name():
    stage = StageExecution(name=StageName.VOICE_CLONING)
    with pytest.raises(ValueError, match="not registered"):
        stage.fail_subtask("ghost", "nope")


def test_mark_running_after_failure_increments_retry_count():
    stage = StageExecution(name=StageName.FACE_EXTRACTION)
    stage.mark_running()
    assert stage.retry_count == 0
    stage.mark_failed("timeout")
    stage.mark_running()  # retry
    assert stage.retry_count == 1
    assert stage.status == StageStatus.RUNNING
    stage.mark_failed("timeout again")
    stage.mark_running()  # retry 2
    assert stage.retry_count == 2
