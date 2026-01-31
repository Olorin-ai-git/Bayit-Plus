"""
AI Generation Job Model.
Tracks async nikud/shoresh generation jobs.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class JobStatus(str, Enum):
    """Status of an AI generation job"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobType(str, Enum):
    """Type of AI generation job"""
    NIKUD = "nikud"
    SHORESH = "shoresh"


class AIGenerationJob(Document):
    """
    Tracks background AI generation jobs for nikud/shoresh processing.
    """
    content_id: Indexed(str)
    language: str = "he"
    job_type: JobType
    status: JobStatus = JobStatus.PENDING

    # Progress tracking
    total_cues: int = 0
    processed_cues: int = 0

    # Error handling
    error_message: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # User who initiated
    user_id: Optional[str] = None

    class Settings:
        name = "ai_generation_jobs"
        indexes = [
            "content_id",
            "status",
            [("content_id", 1), ("job_type", 1), ("status", 1)],
        ]

    @classmethod
    async def get_active_job(
        cls, content_id: str, job_type: JobType
    ) -> Optional["AIGenerationJob"]:
        """Get any pending/processing job for content"""
        return await cls.find_one(
            cls.content_id == content_id,
            cls.job_type == job_type,
            cls.status.in_([JobStatus.PENDING, JobStatus.PROCESSING]),
        )

    @classmethod
    async def create_job(
        cls,
        content_id: str,
        job_type: JobType,
        language: str = "he",
        total_cues: int = 0,
        user_id: Optional[str] = None,
    ) -> "AIGenerationJob":
        """Create a new generation job"""
        job = cls(
            content_id=content_id,
            language=language,
            job_type=job_type,
            total_cues=total_cues,
            user_id=user_id,
        )
        await job.insert()
        return job

    async def start_processing(self) -> None:
        """Mark job as processing"""
        self.status = JobStatus.PROCESSING
        self.started_at = datetime.utcnow()
        await self.save()

    async def update_progress(self, processed: int) -> None:
        """Update progress count"""
        self.processed_cues = processed
        await self.save()

    async def complete(self) -> None:
        """Mark job as completed"""
        self.status = JobStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.processed_cues = self.total_cues
        await self.save()

    async def fail(self, error: str) -> None:
        """Mark job as failed"""
        self.status = JobStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.error_message = error
        await self.save()

    @property
    def progress_percent(self) -> int:
        """Get progress as percentage"""
        if self.total_cues == 0:
            return 0
        return int((self.processed_cues / self.total_cues) * 100)

    def to_response(self) -> dict:
        """Convert to API response format"""
        return {
            "job_id": str(self.id),
            "content_id": self.content_id,
            "job_type": self.job_type.value,
            "status": self.status.value,
            "progress": self.progress_percent,
            "total_cues": self.total_cues,
            "processed_cues": self.processed_cues,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
