"""
Story Generation Job Model.

Per-stage job tracking for Star in Story pipeline.
Follows the AIGenerationJob pattern with stage-level granularity.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class StoryJobStage(str, Enum):
    """Generation pipeline stages."""

    AVATAR_GENERATION = "avatar_generation"
    SCRIPT_GENERATION = "script_generation"
    VIDEO_GENERATION = "video_generation"
    AUDIO_GENERATION = "audio_generation"
    EPISODE_ASSEMBLY = "episode_assembly"
    SAFETY_REVIEW = "safety_review"


class StoryJobStatus(str, Enum):
    """Job status within a stage."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class StoryGenerationJob(Document):
    """
    Tracks individual stages of the Star in Story generation pipeline.

    Each episode generation spawns multiple jobs (one per stage).
    """

    episode_id: Indexed(str)
    user_id: Indexed(str)
    stage: StoryJobStage
    status: StoryJobStatus = StoryJobStatus.PENDING

    # Progress
    total_items: int = 0
    processed_items: int = 0

    # Error handling
    error_message: Optional[str] = None
    retry_count: int = 0

    # Cost tracking
    api_cost_usd: float = 0.0

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Settings:
        name = "story_generation_jobs"
        indexes = [
            [("episode_id", 1), ("stage", 1)],
            [("user_id", 1), ("status", 1)],
        ]

    async def start_processing(self) -> None:
        self.status = StoryJobStatus.PROCESSING
        self.started_at = datetime.now(timezone.utc)
        await self.save()

    async def update_progress(self, processed: int) -> None:
        self.processed_items = processed
        await self.save()

    async def complete(self, cost_usd: float = 0.0) -> None:
        self.status = StoryJobStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)
        self.processed_items = self.total_items
        self.api_cost_usd = cost_usd
        await self.save()

    async def fail(self, error: str) -> None:
        self.status = StoryJobStatus.FAILED
        self.completed_at = datetime.now(timezone.utc)
        self.error_message = error
        await self.save()

    @property
    def progress_percent(self) -> int:
        if self.total_items == 0:
            return 0
        return int((self.processed_items / self.total_items) * 100)
