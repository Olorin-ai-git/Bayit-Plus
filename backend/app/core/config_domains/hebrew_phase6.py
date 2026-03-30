"""Domain config: Hebrew Phase 6 - Atzmi Ba'Sipur (Interactive Missions)."""
from pydantic import Field


class HebrewPhase6ConfigMixin:
    """Phase 6 - Atzmi Ba'Sipur interactive missions configuration."""

    # ============================================
    # Phase 6 - Atzmi Ba'Sipur (Interactive Missions)
    # ============================================
    CREDIT_RATE_INTERACTIVE_MISSION: int = Field(
        default=100,
        env="CREDIT_RATE_INTERACTIVE_MISSION",
        description="Beta credits per interactive mission generation",
    )
    CREDIT_RATE_VIDEO_SELFIE_AVATAR: int = Field(
        default=15,
        env="CREDIT_RATE_VIDEO_SELFIE_AVATAR",
        description="Beta credits per video selfie avatar generation",
    )
    CREDIT_RATE_VOICE_CLONE_CHILD: int = Field(
        default=10,
        env="CREDIT_RATE_VOICE_CLONE_CHILD",
        description="Beta credits per child voice clone",
    )
    CREDIT_RATE_FAMILY_SNAP: int = Field(
        default=5,
        env="CREDIT_RATE_FAMILY_SNAP",
        description="Beta credits per family snap generation",
    )
    STABILITY_API_KEY: str = Field(
        default="",
        env="STABILITY_API_KEY",
        description="Stability AI API key for scene in-painting",
    )
    STABILITY_API_BASE_URL: str = Field(
        default="https://api.stability.ai/v2beta",
        env="STABILITY_API_BASE_URL",
        description="Stability AI API base URL",
    )
    STABILITY_API_TIMEOUT: float = Field(
        default=90.0, ge=10.0,
        env="STABILITY_API_TIMEOUT",
        description="HTTP timeout in seconds for Stability AI API requests",
    )
    DID_API_KEY: str = Field(
        default="",
        env="DID_API_KEY",
        description="D-ID API key for lip-sync talking head",
    )
    DID_API_BASE_URL: str = Field(
        default="https://api.d-id.com",
        env="DID_API_BASE_URL",
        description="D-ID API base URL",
    )
    MISSION_MAX_BRANCHES: int = Field(
        default=4, ge=2, le=6,
        env="MISSION_MAX_BRANCHES",
        description="Maximum branching paths per interactive mission",
    )
    MISSION_MAX_SCENES: int = Field(
        default=10, ge=4, le=20,
        env="MISSION_MAX_SCENES",
        description="Maximum scenes per interactive mission",
    )
    MISSION_SCENE_TIMEOUT_SECONDS: int = Field(
        default=30, ge=10, le=120,
        env="MISSION_SCENE_TIMEOUT_SECONDS",
        description="Seconds before decision timeout per scene",
    )
    MISSION_MAX_PER_DAY: int = Field(
        default=5, ge=1,
        env="MISSION_MAX_PER_DAY",
        description="Maximum mission generations per user per day",
    )
    MISSION_COMPOSITION_MODE: str = Field(
        default="both",
        env="MISSION_COMPOSITION_MODE",
        description="Composition mode: overlay, inpainting, or both (A/B)",
    )
    MISSION_PRERENDER_SCENES: int = Field(
        default=2, ge=1, le=5,
        env="MISSION_PRERENDER_SCENES",
        description="Scenes to pre-render for instant playback start",
    )
    MISSION_SAFETY_THRESHOLD: float = Field(
        default=0.9, ge=0.0, le=1.0,
        env="MISSION_SAFETY_THRESHOLD",
        description="Minimum safety score for mission content",
    )
    MISSION_AVATAR_CONSISTENCY_THRESHOLD: float = Field(
        default=0.85, ge=0.5, le=1.0,
        env="MISSION_AVATAR_CONSISTENCY_THRESHOLD",
        description="CLIP cosine similarity threshold for avatar consistency",
    )
    MISSION_COMPLETION_BASE_REWARD: int = Field(
        default=50, ge=0,
        env="MISSION_COMPLETION_BASE_REWARD",
        description="Base shekel reward for completing an interactive mission",
    )
    MISSION_COMPLETION_SCORE_MULTIPLIER: int = Field(
        default=10, ge=0,
        env="MISSION_COMPLETION_SCORE_MULTIPLIER",
        description="Score-to-shekel multiplier for mission completion bonus",
    )
    MISSION_SCENE_SHEKEL_MULTIPLIER: int = Field(
        default=5, ge=0,
        env="MISSION_SCENE_SHEKEL_MULTIPLIER",
        description="Score-to-shekel multiplier for individual scene rewards",
    )
    SNAP_SHARE_BASE_URL: str = Field(
        default="",
        env="SNAP_SHARE_BASE_URL",
        description="Base URL for family snap sharing links",
    )
    SNAP_WATERMARK_TEXT: str = Field(
        default="Made with Bayit+",
        env="SNAP_WATERMARK_TEXT",
        description="Watermark text for shared family snaps",
    )
    SNAP_THUMBNAIL_WIDTH: int = Field(
        default=300, ge=50, le=1000,
        env="SNAP_THUMBNAIL_WIDTH",
        description="Thumbnail width in pixels for family snaps",
    )
    SNAP_THUMBNAIL_HEIGHT: int = Field(
        default=300, ge=50, le=1000,
        env="SNAP_THUMBNAIL_HEIGHT",
        description="Thumbnail height in pixels for family snaps",
    )
    VIDEO_SELFIE_RECORDING_DURATION_MS: int = Field(
        default=10000, ge=3000, le=30000,
        env="VIDEO_SELFIE_RECORDING_DURATION_MS",
        description="Frontend video selfie recording duration in milliseconds",
    )
    DID_API_TIMEOUT: float = Field(
        default=120.0, ge=10.0,
        env="DID_API_TIMEOUT",
        description="HTTP timeout in seconds for D-ID API requests",
    )
    DID_MAX_POLLS: int = Field(
        default=60, ge=5,
        env="DID_MAX_POLLS",
        description="Maximum polling attempts for D-ID talk result",
    )
    DID_POLL_INTERVAL: float = Field(
        default=2.0, ge=0.5,
        env="DID_POLL_INTERVAL",
        description="Seconds between D-ID polling attempts",
    )
    VIDEO_SELFIE_MAX_SIZE_BYTES: int = Field(
        default=52428800, ge=1048576,
        env="VIDEO_SELFIE_MAX_SIZE_BYTES",
        description="Maximum video selfie file size in bytes (default 50MB)",
    )
    VIDEO_SELFIE_MAX_DURATION_SECONDS: float = Field(
        default=15.0, ge=5.0, le=60.0,
        env="VIDEO_SELFIE_MAX_DURATION_SECONDS",
        description="Maximum allowed video selfie duration in seconds",
    )
    FERNET_ENCRYPTION_KEY: str = Field(
        default="",
        env="FERNET_ENCRYPTION_KEY",
        description="Base64-encoded 32-byte Fernet key for video selfie encryption",
    )
