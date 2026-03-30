"""Domain config: Hebrew Phases 10-11 (Grandparent Bridge + Chameleon Engine)."""
from pydantic import Field


class HebrewPhases10To11ConfigMixin:
    """Hebrew Phases 10 (Grandparent Bridge) and 11 (Chameleon Engine) configuration."""

    # ============================================
    # Phase 10 - Grandparent Bridge
    # ============================================
    GRANDPARENT_BRIDGE_NEWS_CLIP_DURATION: int = Field(
        default=30, ge=15, le=60,
        env="GRANDPARENT_BRIDGE_NEWS_CLIP_DURATION",
        description="Target duration in seconds for news clips",
    )
    CREDIT_RATE_NEWS_CLIP: int = Field(
        default=50, ge=0,
        env="CREDIT_RATE_NEWS_CLIP",
        description="Beta credits per news clip generation",
    )
    GRANDPARENT_VOICE_NOTE_MAX_SECONDS: int = Field(
        default=60, ge=15, le=180,
        env="GRANDPARENT_VOICE_NOTE_MAX_SECONDS",
        description="Maximum grandparent voice note duration in seconds",
    )
    GRANDPARENT_BRIDGE_SHARE_BASE_URL: str = Field(
        default="",
        env="GRANDPARENT_BRIDGE_SHARE_BASE_URL",
        description="Base URL for grandparent bridge sharing links",
    )
    GRANDPARENT_BRIDGE_VOICE_NOTE_RETENTION_DAYS: int = Field(
        default=90, ge=30,
        env="GRANDPARENT_BRIDGE_VOICE_NOTE_RETENTION_DAYS",
        description="Days to retain grandparent voice notes before cleanup",
    )
    GRANDPARENT_VOICE_NOTE_MAX_SIZE_BYTES: int = Field(
        default=10_485_760, ge=1_048_576,
        env="GRANDPARENT_VOICE_NOTE_MAX_SIZE_BYTES",
        description="Maximum voice note upload size in bytes (default 10 MB)",
    )
    GRANDPARENT_BRIDGE_ALLOWED_AUDIO_TYPES: list[str] = Field(
        default=[
            "audio/webm", "audio/wav", "audio/mp3",
            "audio/mpeg", "audio/ogg", "audio/m4a",
        ],
        env="GRANDPARENT_BRIDGE_ALLOWED_AUDIO_TYPES",
        description="Allowed MIME types for grandparent voice note uploads",
    )

    # ============================================
    # Phase 11 - Chameleon Engine (Visual Style Sync)
    # ============================================
    CHAMELEON_STYLE_CACHE_TTL_HOURS: int = Field(
        default=168, ge=1,
        env="CHAMELEON_STYLE_CACHE_TTL_HOURS",
        description="Hours to cache style-transferred avatar variants",
    )
    CHAMELEON_MAX_STYLE_VARIATIONS: int = Field(
        default=3, ge=1, le=10,
        env="CHAMELEON_MAX_STYLE_VARIATIONS",
        description="Maximum cached style variations per avatar",
    )
    CHAMELEON_STYLE_SIMILARITY_THRESHOLD: float = Field(
        default=0.75, ge=0.5, le=1.0,
        env="CHAMELEON_STYLE_SIMILARITY_THRESHOLD",
        description="CLIP similarity threshold for style transfer quality",
    )
    CREDIT_RATE_STYLE_TRANSFER: int = Field(
        default=20, ge=0,
        env="CREDIT_RATE_STYLE_TRANSFER",
        description="Beta credits per style transfer generation",
    )
    CHAMELEON_FRAME_SAMPLE_COUNT: int = Field(
        default=5, ge=1, le=20,
        env="CHAMELEON_FRAME_SAMPLE_COUNT",
        description="Number of frames to sample for style analysis",
    )
