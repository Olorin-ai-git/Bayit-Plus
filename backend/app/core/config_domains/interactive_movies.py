"""Domain config: Movie Interactions Hub + Voice Cloning."""
from pydantic import Field


class InteractiveMoviesConfigMixin:
    """Movie interactions hub and voice cloning configuration."""

    # ============================================
    # MOVIE INTERACTIONS HUB (Zeh Ani Phase 4 - Browse & Talk to Characters)
    # ============================================
    MOVIE_INTERACTION_MAX_CHARACTERS: int = Field(
        default=6, ge=1, le=20,
        env="MOVIE_INTERACTION_MAX_CHARACTERS",
        description="Max characters to extract per movie from TMDB cast",
    )
    MOVIE_INTERACTION_QUESTIONS_PER_CHARACTER: int = Field(
        default=5, ge=1, le=10,
        env="MOVIE_INTERACTION_QUESTIONS_PER_CHARACTER",
        description="Number of AI-generated questions per character",
    )
    MOVIE_INTERACTION_DEFAULT_VOICE_MALE: str = Field(
        default="",
        env="MOVIE_INTERACTION_DEFAULT_VOICE_MALE",
        description="ElevenLabs voice ID for male characters",
    )
    MOVIE_INTERACTION_DEFAULT_VOICE_FEMALE: str = Field(
        default="",
        env="MOVIE_INTERACTION_DEFAULT_VOICE_FEMALE",
        description="ElevenLabs voice ID for female characters",
    )
    MOVIE_INTERACTION_DEFAULT_KID_IMAGE_URL: str = Field(
        default="",
        env="MOVIE_INTERACTION_DEFAULT_KID_IMAGE_URL",
        description="Default kid avatar image URL for interactive moment lip-sync (Creatify st.png)",
    )
    MOVIE_INTERACTION_KID_VOICE_ID: str = Field(
        default="",
        env="MOVIE_INTERACTION_KID_VOICE_ID",
        description="ElevenLabs voice ID for kid avatar question videos (Etai's cloned voice)",
    )
    MOVIE_INTERACTION_AI_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="MOVIE_INTERACTION_AI_MODEL",
        description="Claude model for character profile generation",
    )
    MOVIE_INTERACTION_MAX_PER_CONTENT: int = Field(
        default=10, ge=1, le=50,
        env="MOVIE_INTERACTION_MAX_PER_CONTENT",
        description="Max interactive moments allowed per content item",
    )

    # ============================================
    # VOICE CLONING (Character Voice Matching)
    # ============================================
    VOICE_CLONE_MIN_AUDIO_DURATION_SEC: float = Field(
        default=30.0, ge=5.0, le=120.0,
        env="VOICE_CLONE_MIN_AUDIO_DURATION_SEC",
        description="Minimum audio duration (seconds) required for voice cloning",
    )
    VOICE_CLONE_TARGET_AUDIO_DURATION_SEC: float = Field(
        default=90.0, ge=30.0, le=300.0,
        env="VOICE_CLONE_TARGET_AUDIO_DURATION_SEC",
        description="Target audio duration (seconds) per character sample",
    )
    VOICE_CLONE_MAX_CHARACTERS_PER_CONTENT: int = Field(
        default=4, ge=1, le=10,
        env="VOICE_CLONE_MAX_CHARACTERS_PER_CONTENT",
        description="Maximum characters to clone voices for per content item",
    )
    VOICE_CLONE_TARGET_CUE_COUNT: int = Field(
        default=25, ge=5, le=100,
        env="VOICE_CLONE_TARGET_CUE_COUNT",
        description="Target subtitle cues to collect per character",
    )
    VOICE_CLONE_AUTO_AFTER_EXTRACTION: bool = Field(
        default=False,
        env="VOICE_CLONE_AUTO_AFTER_EXTRACTION",
        description="Auto-trigger voice cloning after character extraction",
    )
    VOICE_CLONE_AUDIO_FILTER: str = Field(
        default="highpass=f=200,lowpass=f=3000",
        env="VOICE_CLONE_AUDIO_FILTER",
        description="FFmpeg audio filter for isolating speech frequencies",
    )
    VOICE_CLONE_FFMPEG_TIMEOUT: int = Field(
        default=300, ge=30, le=1800,
        env="VOICE_CLONE_FFMPEG_TIMEOUT",
        description="FFmpeg extraction timeout in seconds",
    )
    VOICE_CLONE_SUBTITLE_LANG_PRIORITY: str = Field(
        default="en,he",
        env="VOICE_CLONE_SUBTITLE_LANG_PRIORITY",
        description="Comma-separated subtitle language priority for cue matching",
    )
