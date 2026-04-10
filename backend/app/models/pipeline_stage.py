"""Pipeline stage tracking models for resumable ingest jobs."""
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Optional

from pydantic import BaseModel, Field


class StageName(str, Enum):
    """Ordered pipeline stages. Order determines resume-from-failure sequence.

    Use ``list(StageName).index(stage_name)`` for ordering; do NOT compare
    enum members with ``<`` because that uses lexicographic string ordering,
    not declaration order.
    """

    TRANSCRIPTION = "transcription"
    CHARACTER_EXTRACTION = "character_extraction"
    SUBTITLES = "subtitles"
    FACE_EXTRACTION = "face_extraction"
    VOICE_CLONING = "voice_cloning"
    TRIVIA = "trivia"
    SEARCH_INDEX = "search_index"
    FINALIZATION = "finalization"


class StageStatus(str, Enum):
    """Lifecycle state of a pipeline stage or subtask."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SubtaskExecution(BaseModel):
    """Per-character tracking inside a stage (e.g. per-character voice clone)."""

    name: str
    status: StageStatus = StageStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    retry_count: int = 0


class StageExecution(BaseModel):
    name: StageName
    status: StageStatus = StageStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    retry_count: int = 0
    subtasks: Dict[str, SubtaskExecution] = Field(default_factory=dict)

    def mark_running(self) -> None:
        if self.status == StageStatus.FAILED:
            self.retry_count += 1
        self.status = StageStatus.RUNNING
        self.started_at = _utcnow()
        self.completed_at = None
        self.error = None

    def mark_completed(self) -> None:
        self.status = StageStatus.COMPLETED
        self.completed_at = _utcnow()
        self.error = None

    def mark_failed(self, error: str) -> None:
        self.status = StageStatus.FAILED
        self.completed_at = _utcnow()
        self.error = error

    def add_subtask(self, name: str) -> SubtaskExecution:
        if name not in self.subtasks:
            self.subtasks[name] = SubtaskExecution(name=name)
        return self.subtasks[name]

    def start_subtask(self, name: str) -> None:
        task = self.add_subtask(name)
        task.status = StageStatus.RUNNING
        task.started_at = _utcnow()
        task.completed_at = None
        task.error = None

    def complete_subtask(self, name: str) -> None:
        if name not in self.subtasks:
            raise ValueError(
                f"Subtask {name!r} not registered in stage {self.name.value!r}. "
                "Call add_subtask() or start_subtask() first."
            )
        task = self.subtasks[name]
        task.status = StageStatus.COMPLETED
        task.completed_at = _utcnow()

    def fail_subtask(self, name: str, error: str) -> None:
        if name not in self.subtasks:
            raise ValueError(
                f"Subtask {name!r} not registered in stage {self.name.value!r}. "
                "Call add_subtask() or start_subtask() first."
            )
        task = self.subtasks[name]
        task.status = StageStatus.FAILED
        task.completed_at = _utcnow()
        task.error = error
        task.retry_count += 1

    def all_subtasks_complete(self) -> bool:
        """Return True when every subtask has reached COMPLETED status.

        For stages that do not use subtasks (e.g. TRANSCRIPTION), this
        delegates to the stage's own completion status.  This is intentional:
        callers can use ``all_subtasks_complete()`` uniformly for both
        subtask-tracking stages and flat single-unit stages without needing to
        branch on whether subtasks exist.
        """
        if not self.subtasks:
            return self.status == StageStatus.COMPLETED
        return all(t.status == StageStatus.COMPLETED for t in self.subtasks.values())

    def has_failed_subtasks(self) -> bool:
        return any(t.status == StageStatus.FAILED for t in self.subtasks.values())
