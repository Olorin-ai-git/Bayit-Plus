"""Interactive Mission Document model."""

from datetime import datetime, timezone
from typing import Dict, List, Optional

from beanie import Document, Indexed
from pydantic import Field
from pymongo import IndexModel

from app.models.interactive_mission_types import (
    DecisionType,
    MissionAttemptRecord,
    MissionDecision,
    MissionPath,
    MissionResponse,
    MissionSafetyScore,
    MissionScene,
    MissionStatus,
)

__all__ = [
    "DecisionType",
    "InteractiveMission",
    "MissionAttemptRecord",
    "MissionDecision",
    "MissionPath",
    "MissionResponse",
    "MissionSafetyScore",
    "MissionScene",
    "MissionStatus",
]


class InteractiveMission(Document):
    """Interactive Hebrew mission with branching narrative."""

    user_id: Indexed(str)
    profile_id: Indexed(str)
    avatar_id: str
    show_content_id: Indexed(str)
    title: str = ""
    title_he: str = ""
    description: str = ""
    difficulty: str = "medium"
    target_vocabulary: List[str] = Field(default_factory=list)
    scenes: List[MissionScene] = Field(default_factory=list)
    paths: List[MissionPath] = Field(default_factory=list)
    interactive_manifest: Optional[Dict] = None
    composition_variant: str = Field(
        default="overlay",
        description="overlay or inpainted (A/B test)",
    )
    safety: Optional[MissionSafetyScore] = None
    status: MissionStatus = MissionStatus.PENDING
    current_stage: Optional[str] = None
    progress_percent: int = 0
    error_message: Optional[str] = None
    attempts: List[MissionAttemptRecord] = Field(default_factory=list)
    scenes_completed: int = 0
    total_score: float = 0.0
    credits_charged: int = 0
    shekels_earned: int = 0
    badge_earned: Optional[str] = None
    hls_base_path: Optional[str] = None
    thumbnail_gcs_path: Optional[str] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Settings:
        name = "interactive_missions"
        indexes = [
            IndexModel([("user_id", 1), ("profile_id", 1)]),
            IndexModel([("avatar_id", 1), ("status", 1)]),
            IndexModel([("show_content_id", 1)]),
            IndexModel([("user_id", 1), ("created_at", -1)]),
        ]

    @property
    def is_playable(self) -> bool:
        return (
            self.status in (MissionStatus.READY, MissionStatus.ACTIVE)
            and self.interactive_manifest is not None
        )

    @property
    def total_scenes(self) -> int:
        return len(self.scenes)

    @property
    def decision_count(self) -> int:
        return sum(1 for s in self.scenes if s.decision is not None)
