"""Pipeline stage tracking models for resumable ingest jobs."""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Optional

from pydantic import BaseModel, Field


class StageName(str, Enum):
    """Ordered pipeline stages. Order determines resume-from-failure sequence."""

    TRANSCRIPTION = "transcription"
    CHARACTER_EXTRACTION = "character_extraction"
    FACE_EXTRACTION = "face_extraction"
    VOICE_CLONING = "voice_cloning"
    SUBTITLES = "subtitles"
    TRIVIA = "trivia"
    SEARCH_INDEX = "search_index"
    FINALIZATION = "finalization"


class StageStatus(str, Enum):
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
        task = self.subtasks[name]
        task.status = StageStatus.COMPLETED
        task.completed_at = _utcnow()

    def fail_subtask(self, name: str, error: str) -> None:
        task = self.subtasks[name]
        task.status = StageStatus.FAILED
        task.completed_at = _utcnow()
        task.error = error
        task.retry_count += 1

    def all_subtasks_complete(self) -> bool:
        if not self.subtasks:
            return self.status == StageStatus.COMPLETED
        return all(t.status == StageStatus.COMPLETED for t in self.subtasks.values())

    def has_failed_subtasks(self) -> bool:
        return any(t.status == StageStatus.FAILED for t in self.subtasks.values())
