"""Domain config: Hebrew engagement advanced phases (5, 7-9)."""
from pydantic import Field


class HebrewAdvancedConfigMixin:
    """Hebrew engagement Phases 5, 7-9 configuration."""

    # Phase 5 - Star in Story
    RUNWAY_API_KEY: str = Field(
        default="",
        env="RUNWAY_API_KEY",
        description="Runway Gen-4 API key for video generation",
    )
    RUNWAY_API_BASE_URL: str = Field(
        default="https://api.dev.runwayml.com/v1",
        env="RUNWAY_API_BASE_URL",
        description="Runway API base URL",
    )
    RUNWAY_MODEL_ID: str = Field(
        default="gen4_turbo",
        env="RUNWAY_MODEL_ID",
        description="Runway model ID for video generation",
    )
    STAR_STORY_SAFETY_THRESHOLD: float = Field(
        default=0.9, ge=0.0, le=1.0,
        env="STAR_STORY_SAFETY_THRESHOLD",
        description="Minimum safety score for generated content",
    )
    STAR_STORY_MAX_EPISODES_PER_DAY: int = Field(
        default=3, ge=1,
        env="STAR_STORY_MAX_EPISODES_PER_DAY",
        description="Maximum episode generations per user per day",
    )
    CREDIT_RATE_STAR_STORY_EPISODE: int = Field(
        default=75,
        env="CREDIT_RATE_STAR_STORY_EPISODE",
        description="Beta credits per Star in Story episode",
    )
    CREDIT_RATE_STAR_STORY_AVATAR: int = Field(
        default=10,
        env="CREDIT_RATE_STAR_STORY_AVATAR",
        description="Beta credits per avatar generation",
    )
    CREDIT_RATE_CHARACTER_GENERATION: int = Field(
        default=25,
        env="CREDIT_RATE_CHARACTER_GENERATION",
        description="Beta credits per character generation (after free quota)",
    )
    CHARACTER_GENERATION_FREE_LIMIT: int = Field(
        default=5,
        env="CHARACTER_GENERATION_FREE_LIMIT",
        description="Free character generation movies per user",
    )
    STAR_STORY_PHOTO_RETENTION_DAYS: int = Field(
        default=7, ge=1,
        env="STAR_STORY_PHOTO_RETENTION_DAYS",
        description="Days to retain original photos before auto-delete",
    )
    STAR_STORY_EPISODE_RETENTION_DAYS: int = Field(
        default=90, ge=1,
        env="STAR_STORY_EPISODE_RETENTION_DAYS",
        description="Days to retain generated episodes",
    )
    STAR_STORY_AI_MODEL: str = Field(
        default="claude-sonnet-4-5-20250929",
        env="STAR_STORY_AI_MODEL",
        description="Claude model for script generation and safety review",
    )
    STAR_STORY_AI_MAX_TOKENS: int = Field(
        default=8192, ge=1024, le=16384,
        env="STAR_STORY_AI_MAX_TOKENS",
        description="Max tokens for script generation",
    )
    STAR_STORY_NARRATOR_VOICE_ID: str = Field(
        default="",
        env="STAR_STORY_NARRATOR_VOICE_ID",
        description="ElevenLabs voice ID for Star in Story narration",
    )
    STAR_STORY_MIN_PHOTO_WIDTH: int = Field(
        default=480, ge=100,
        env="STAR_STORY_MIN_PHOTO_WIDTH",
        description="Minimum photo width in pixels for face detection",
    )
    STAR_STORY_MIN_PHOTO_HEIGHT: int = Field(
        default=480, ge=100,
        env="STAR_STORY_MIN_PHOTO_HEIGHT",
        description="Minimum photo height in pixels for face detection",
    )

    # ============================================
    # Phase 7 - Phonetic Mirror (Perfected Voice)
    # ============================================
    PERFECTED_VOICE_MAX_AUDIO_SECONDS: int = Field(
        default=15, ge=3, le=30,
        env="PERFECTED_VOICE_MAX_AUDIO_SECONDS",
        description="Maximum audio recording duration for phonetic mirror",
    )
    PERFECTED_VOICE_MIN_CONFIDENCE: float = Field(
        default=0.3, ge=0.0, le=1.0,
        env="PERFECTED_VOICE_MIN_CONFIDENCE",
        description="Minimum Whisper confidence to accept transcription",
    )
    PERFECTED_VOICE_PRONUNCIATION_THRESHOLD: float = Field(
        default=0.7, ge=0.0, le=1.0,
        env="PERFECTED_VOICE_PRONUNCIATION_THRESHOLD",
        description="Score threshold for acceptable pronunciation",
    )
    CREDIT_RATE_PHONETIC_MIRROR: float = Field(
        default=3.0,
        env="CREDIT_RATE_PHONETIC_MIRROR",
        description="Beta credits per phonetic mirror attempt",
    )
    PERFECTED_VOICE_MAX_PER_DAY: int = Field(
        default=20, ge=1,
        env="PERFECTED_VOICE_MAX_PER_DAY",
        description="Maximum phonetic mirror attempts per user per day",
    )
    PRONUNCIATION_THRESHOLD_EXCELLENT: float = Field(
        default=0.9, ge=0.0, le=1.0,
        env="PRONUNCIATION_THRESHOLD_EXCELLENT",
        description="Score threshold for excellent pronunciation quality",
    )
    PRONUNCIATION_THRESHOLD_GOOD: float = Field(
        default=0.7, ge=0.0, le=1.0,
        env="PRONUNCIATION_THRESHOLD_GOOD",
        description="Score threshold for good pronunciation quality",
    )
    PRONUNCIATION_THRESHOLD_FAIR: float = Field(
        default=0.5, ge=0.0, le=1.0,
        env="PRONUNCIATION_THRESHOLD_FAIR",
        description="Score threshold for fair pronunciation quality",
    )
    PRONUNCIATION_THRESHOLD_NEEDS_PRACTICE: float = Field(
        default=0.2, ge=0.0, le=1.0,
        env="PRONUNCIATION_THRESHOLD_NEEDS_PRACTICE",
        description="Score threshold for needs-practice pronunciation quality",
    )
    PHONEME_SIMILARITY_MATCH_THRESHOLD: float = Field(
        default=0.9, ge=0.0, le=1.0,
        env="PHONEME_SIMILARITY_MATCH_THRESHOLD",
        description="Similarity threshold above which phoneme is considered a match (no issue)",
    )

    # ============================================
    # Phase 8 - Voice-First Interactive Missions
    # ============================================
    MISSION_VOICE_MODE_ENABLED: bool = Field(
        default=True,
        env="MISSION_VOICE_MODE_ENABLED",
        description="Enable voice phrase decision type in missions",
    )
    MISSION_VOICE_TIMEOUT_SECONDS: int = Field(
        default=15, ge=5, le=60,
        env="MISSION_VOICE_TIMEOUT_SECONDS",
        description="Seconds to wait for voice decision input",
    )
    MISSION_VOICE_MAX_ATTEMPTS: int = Field(
        default=3, ge=1, le=10,
        env="MISSION_VOICE_MAX_ATTEMPTS",
        description="Maximum voice decision attempts per scene",
    )
    MISSION_VOICE_HINT_AFTER_ATTEMPT: int = Field(
        default=2, ge=1, le=5,
        env="MISSION_VOICE_HINT_AFTER_ATTEMPT",
        description="Show pronunciation hint after N failed attempts",
    )
    MISSION_VOICE_PRAISE_TEXT: str = Field(
        default="\u05DE\u05E6\u05D5\u05D9\u05DF!",
        env="MISSION_VOICE_PRAISE_TEXT",
        description="Hebrew praise text spoken in child voice on correct answer",
    )

    # ============================================
    # Phase 9 - Gamification Levels
    # ============================================
    GAMIFICATION_XP_PER_MISSION: int = Field(
        default=100, ge=0,
        env="GAMIFICATION_XP_PER_MISSION",
        description="XP awarded per completed interactive mission",
    )
    GAMIFICATION_XP_PER_MIRROR: int = Field(
        default=25, ge=0,
        env="GAMIFICATION_XP_PER_MIRROR",
        description="XP awarded per phonetic mirror session",
    )
    GAMIFICATION_XP_PER_TALK_BACK: int = Field(
        default=15, ge=0,
        env="GAMIFICATION_XP_PER_TALK_BACK",
        description="XP awarded per Talk Back attempt",
    )
    GAMIFICATION_LEVEL_BASE_XP: int = Field(
        default=500, ge=100,
        env="GAMIFICATION_LEVEL_BASE_XP",
        description="Base XP required for first level up",
    )
    GAMIFICATION_LEVEL_XP_MULTIPLIER: float = Field(
        default=1.5, ge=1.0, le=3.0,
        env="GAMIFICATION_LEVEL_XP_MULTIPLIER",
        description="Exponential multiplier for XP per level",
    )
