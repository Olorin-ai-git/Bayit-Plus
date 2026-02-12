"""
Scene Trigger Model.

Content-level triggers that activate interactive Hebrew learning moments
during video playback. Triggers prompt ASR responses, vocabulary quizzes,
avatar reactions, and cultural notes at specific timestamps.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field


class TriggerType(str, Enum):
    """Types of scene triggers during content playback."""

    ASR_PROMPT = "asr_prompt"
    VOCABULARY_QUIZ = "vocabulary_quiz"
    AVATAR_REACTION = "avatar_reaction"
    CULTURAL_NOTE = "cultural_note"


class SceneTrigger(BaseModel):
    """A single interactive trigger at a specific content timestamp."""

    trigger_id: str = Field(..., description="Unique trigger identifier")
    timestamp_seconds: float = Field(
        ..., ge=0.0, description="Content timestamp in seconds",
    )
    trigger_type: TriggerType
    target_word_he: str = Field(
        default="", description="Hebrew word to practice",
    )
    prompt_text_en: str = Field(
        default="", description="English prompt for the child",
    )
    prompt_text_he: str = Field(
        default="", description="Hebrew prompt for the child",
    )
    expected_response: str = Field(
        default="", description="Expected spoken response",
    )
    avatar_animation: str = Field(
        default="celebrate", description="Avatar animation on success",
    )
    duration_seconds: float = Field(
        default=10.0, ge=1.0, le=60.0,
        description="Duration to hold the trigger overlay",
    )


class ContentSceneTriggers(Document):
    """
    Collection of scene triggers for a specific content item.

    Stored separately from the Content model to avoid schema changes.
    """

    content_id: Indexed(str, unique=True)
    triggers: List[SceneTrigger] = Field(default_factory=list)
    author_user_id: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "content_scene_triggers"

    @property
    def trigger_count(self) -> int:
        return len(self.triggers)

    def get_triggers_in_window(
        self, current_time: float, lookahead: float,
    ) -> List[SceneTrigger]:
        """Return triggers within the lookahead window."""
        return [
            t for t in self.triggers
            if current_time <= t.timestamp_seconds <= current_time + lookahead
        ]
