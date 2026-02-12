"""Interactive Mission sub-models and enums."""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class MissionStatus(str, Enum):
    PENDING = "pending"
    SCRIPTING = "scripting"
    COMPOSITING = "compositing"
    GENERATING = "generating"
    ASSEMBLING = "assembling"
    SAFETY_REVIEW = "safety_review"
    READY = "ready"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED = "rejected"


class DecisionType(str, Enum):
    BINARY = "binary"
    VOCABULARY = "vocabulary"
    DIRECTION = "direction"
    VOICE_PHRASE = "voice_phrase"


class MissionDecision(BaseModel):
    decision_id: str
    decision_type: DecisionType
    prompt_text: str = Field(..., description="Hebrew challenge text")
    prompt_transliteration: str = ""
    prompt_translation: str = ""
    expected_responses: List[str] = Field(default_factory=list)
    hint_text: Optional[str] = None
    hint_text_he: Optional[str] = None
    timeout_seconds: int = Field(default=30)
    max_attempts: int = Field(default=3)
    next_scene_on_success: int = 0
    next_scene_on_failure: int = 0


class MissionScene(BaseModel):
    scene_number: int
    show_content_id: Optional[str] = None
    show_timestamp_start: float = 0.0
    show_timestamp_end: float = 0.0
    avatar_pose: str = "front_neutral"
    avatar_position_x: float = 0.5
    avatar_position_y: float = 0.5
    avatar_scale: float = 0.3
    narration_text: str = ""
    narration_text_he: str = ""
    hebrew_vocabulary: List[str] = Field(default_factory=list)
    decision: Optional[MissionDecision] = None
    duration_seconds: float = 10.0
    is_lipsync_scene: bool = False
    background_gcs_path: Optional[str] = None
    overlay_video_gcs_path: Optional[str] = None
    inpainted_video_gcs_path: Optional[str] = None
    audio_gcs_path: Optional[str] = None
    lipsync_video_gcs_path: Optional[str] = None


class MissionPath(BaseModel):
    path_id: str
    scene_sequence: List[int] = Field(default_factory=list)
    hls_manifest_gcs_path: Optional[str] = None
    total_duration_seconds: float = 0.0


class MissionSafetyScore(BaseModel):
    script_safety: float = 0.0
    visual_safety: float = 0.0
    overall_safety: float = 0.0
    flagged_issues: List[str] = Field(default_factory=list)


class MissionAttemptRecord(BaseModel):
    scene_number: int
    decision_id: str
    attempt_number: int
    transcript: str = ""
    detected_language: str = ""
    quality: str = ""
    score: float = 0.0
    succeeded: bool = False
    attempted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class MissionResponse(BaseModel):
    id: str
    title: str
    title_he: str
    description: str
    difficulty: str
    status: str
    progress_percent: int
    total_scenes: int
    decision_count: int
    scenes_completed: int
    total_score: float
    shekels_earned: int
    hls_base_path: Optional[str]
    thumbnail_url: Optional[str]
    created_at: str
    composition_variant: str

    class Config:
        from_attributes = True
