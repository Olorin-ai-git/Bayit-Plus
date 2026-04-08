"""
Pause & Ask Job Model

Tracks the lifecycle of an async Pause & Ask pipeline execution.
Jobs progress through stages, store results on completion, and
expire via TTL index after 24 hours.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """Terminal and non-terminal job states."""

    accepted = "accepted"
    transcribing = "transcribing"
    polishing = "polishing"
    generating_response = "generating_response"
    generating_voice = "generating_voice"
    animating = "animating"
    completed = "completed"
    completed_voice_only = "completed_voice_only"
    failed = "failed"


TERMINAL_STATUSES = {
    JobStatus.completed,
    JobStatus.completed_voice_only,
    JobStatus.failed,
}

STAGE_MESSAGES = {
    JobStatus.accepted: "Preparing...",
    JobStatus.transcribing: "Listening...",
    JobStatus.polishing: "Understanding...",
    JobStatus.generating_response: "Thinking...",
    JobStatus.generating_voice: "Recording response...",
    JobStatus.animating: "Preparing video...",
}


class JobResult(BaseModel):
    """Successful pipeline output."""

    video_url: str = ""
    audio_url: str = ""
    frame_url: str = ""
    response_text: str = ""
    character_name: str = ""
    duration: float = 0.0


class JobError(BaseModel):
    """Structured error for failed jobs."""

    error_type: str = Field(..., description="Machine-readable error type")
    user_message: str = Field(..., description="Human-readable message")
    can_retry: bool = Field(default=False)


class PauseAskJob(Document):
    """Async Pause & Ask pipeline job."""

    job_id: str = Field(..., description="UUID job identifier")
    status: JobStatus = Field(default=JobStatus.accepted)
    stage: str = Field(default="accepted")
    progress_message: str = Field(default="Preparing...")

    # Request context
    content_id: str
    character: str
    question: str
    mode: str = Field(default="lip_sync", description="lip_sync or voice")
    language_hint: str = Field(default="")

    # Auth context
    portal: str = Field(..., description="training, demo, or b2b")
    user_id: str
    partner_id: Optional[str] = Field(default=None)

    # Session reference (created during execution)
    session_id: Optional[str] = Field(default=None)

    # Credit tracking
    credits_charged: int = Field(default=0)
    credits_refunded: int = Field(default=0)

    # Results
    result: Optional[JobResult] = Field(default=None)
    error: Optional[JobError] = Field(default=None)

    # Timing
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    class Settings:
        name = "pause_ask_jobs"
        use_state_management = True
        indexes = [
            "job_id",
            [("created_at", 1)],
            [("status", 1), ("created_at", 1)],
        ]
