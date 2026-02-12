"""
Story Episode Model.

Tracks AI-generated personalized episodes where the child is the hero.
Includes script, video/audio paths, safety scores, and status state machine.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field


class EpisodeStatus(str, Enum):
    """Episode generation state machine."""

    PENDING = "pending"
    SCRIPT_GENERATING = "script_generating"
    VIDEO_GENERATING = "video_generating"
    AUDIO_GENERATING = "audio_generating"
    ASSEMBLING = "assembling"
    SAFETY_REVIEW = "safety_review"
    READY = "ready"
    FAILED = "failed"
    REJECTED = "rejected"
    DELETED = "deleted"


class SceneScript(BaseModel):
    """Script for a single scene within an episode."""

    scene_number: int
    description: str
    narration: str
    hebrew_vocabulary: List[str] = Field(default_factory=list)
    duration_seconds: float = 10.0


class SceneMedia(BaseModel):
    """Generated media for a single scene."""

    scene_number: int
    video_gcs_path: Optional[str] = None
    audio_gcs_path: Optional[str] = None
    duration_seconds: float = 0.0


class SafetyScore(BaseModel):
    """Content safety evaluation results."""

    script_safety: float = 0.0
    visual_safety: float = 0.0
    overall_safety: float = 0.0
    flagged_issues: List[str] = Field(default_factory=list)
    reviewed_by_human: bool = False
    reviewer_notes: Optional[str] = None


class StoryEpisode(Document):
    """
    A personalized episode where the child stars as the hero.

    Pipeline: script -> video (per scene) -> audio -> assembly -> safety -> delivery.
    """

    user_id: Indexed(str)
    profile_id: Indexed(str)
    avatar_id: str
    episode_number: int = 1

    # Episode metadata
    title: str = ""
    theme: str = ""
    target_vocabulary: List[str] = Field(default_factory=list)

    # Script
    scenes: List[SceneScript] = Field(default_factory=list)

    # Generated media
    scene_media: List[SceneMedia] = Field(default_factory=list)
    final_video_gcs_path: Optional[str] = None
    hls_manifest_gcs_path: Optional[str] = None
    thumbnail_gcs_path: Optional[str] = None

    # Safety
    safety: Optional[SafetyScore] = None

    # Status
    status: EpisodeStatus = EpisodeStatus.PENDING
    current_stage: Optional[str] = None
    progress_percent: int = 0
    error_message: Optional[str] = None

    # Credits
    credits_charged: int = 0

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    completed_at: Optional[datetime] = None

    class Settings:
        name = "story_episodes"
        indexes = [
            [("user_id", 1), ("profile_id", 1)],
            [("user_id", 1), ("status", 1)],
            "avatar_id",
        ]

    @property
    def is_playable(self) -> bool:
        return (
            self.status == EpisodeStatus.READY
            and self.hls_manifest_gcs_path is not None
        )

    @property
    def total_duration_seconds(self) -> float:
        return sum(sm.duration_seconds for sm in self.scene_media)
