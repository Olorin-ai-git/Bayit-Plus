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
