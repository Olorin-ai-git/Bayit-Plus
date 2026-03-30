"""Domain config: Zeh Ani digital soul (Phases 1-3)."""
from pydantic import Field


class ZehAniConfigMixin:
    """Zeh Ani digital soul configuration (Phases 1-3)."""

    # ============================================
    # ZEH ANI: DIGITAL SOUL (Phase 1 - 3D Mesh + Biometrics)
    # ============================================
    READY_PLAYER_ME_API_KEY: str = Field(
        default="",
        env="READY_PLAYER_ME_API_KEY",
        description="Ready Player Me API key for 3D avatar mesh generation",
    )
    READY_PLAYER_ME_APP_ID: str = Field(
        default="",
        env="READY_PLAYER_ME_APP_ID",
        description="Ready Player Me application identifier",
    )
    READY_PLAYER_ME_BASE_URL: str = Field(
        default="https://api.readyplayer.me",
        env="READY_PLAYER_ME_BASE_URL",
        description="Ready Player Me API base URL",
    )
    READY_PLAYER_ME_TIMEOUT: float = Field(
        default=120.0, ge=10.0, le=300.0,
        env="READY_PLAYER_ME_TIMEOUT",
        description="Timeout in seconds for RPM mesh generation requests",
    )
    READY_PLAYER_ME_POLL_INTERVAL: float = Field(
        default=3.0, ge=1.0, le=30.0,
        env="READY_PLAYER_ME_POLL_INTERVAL",
        description="Interval in seconds between RPM status polls",
    )
    READY_PLAYER_ME_MAX_POLLS: int = Field(
        default=40, ge=5, le=200,
        env="READY_PLAYER_ME_MAX_POLLS",
        description="Maximum number of RPM status poll attempts",
    )
    CREDIT_RATE_CREATIFY_AVATAR: int = Field(
        default=30, ge=0,
        env="CREDIT_RATE_CREATIFY_AVATAR",
        description="Beta credits per Creatify persona creation",
    )
    CREDIT_RATE_CREATIFY_LIPSYNC: int = Field(
        default=20, ge=0,
        env="CREDIT_RATE_CREATIFY_LIPSYNC",
        description="Beta credits per Creatify lip-sync video generation",
    )
    CREATIFY_SIGNED_URL_EXPIRY_SECONDS: int = Field(
        default=3600, ge=300, le=86400,
        env="CREATIFY_SIGNED_URL_EXPIRY_SECONDS",
        description="Signed URL expiry for avatar images sent to Creatify API",
    )
    CONTROLNET_API_BASE_URL: str = Field(
        default="",
        env="CONTROLNET_API_BASE_URL",
        description="ControlNet (Replicate) API base URL for style transfer",
    )
    CONTROLNET_API_KEY: str = Field(
        default="",
        env="CONTROLNET_API_KEY",
        description="ControlNet (Replicate) API key",
    )
    CONTROLNET_TIMEOUT: float = Field(
        default=90.0, ge=10.0, le=300.0,
        env="CONTROLNET_TIMEOUT",
        description="Timeout in seconds for ControlNet style transfer requests",
    )
    CONTROLNET_STYLE_STRENGTH: float = Field(
        default=0.65, ge=0.0, le=1.0,
        env="CONTROLNET_STYLE_STRENGTH",
        description="ControlNet IP-Adapter style transfer strength",
    )
    BIOMETRIC_VECTOR_ENCRYPTION_KEY_ID: str = Field(
        default="",
        env="BIOMETRIC_VECTOR_ENCRYPTION_KEY_ID",
        description="KMS key ID for encrypting biometric latent vectors",
    )
    BIOMETRIC_LATENT_VECTOR_MAX_SIZE_BYTES: int = Field(
        default=8192, ge=1024, le=65536,
        env="BIOMETRIC_LATENT_VECTOR_MAX_SIZE_BYTES",
        description="Maximum allowed size in bytes for biometric latent vectors",
    )

    # ============================================
    # ZEH ANI: PHONETIC MIRROR V2 (Phase 2 - V2V Audio Pipeline)
    # ============================================
    ELEVENLABS_V2V_MODEL: str = Field(
        default="eleven_english_sts_v2",
        env="ELEVENLABS_V2V_MODEL",
        description="ElevenLabs voice-to-voice model ID",
    )
    ELEVENLABS_V2V_TIMEOUT: float = Field(
        default=10.0, ge=2.0, le=60.0,
        env="ELEVENLABS_V2V_TIMEOUT",
        description="Timeout in seconds for V2V transform requests",
    )
    ELEVENLABS_V2V_SIMILARITY_BOOST: float = Field(
        default=0.8, ge=0.0, le=1.0,
        env="ELEVENLABS_V2V_SIMILARITY_BOOST",
        description="Voice similarity boost for V2V transforms",
    )
    ELEVENLABS_V2V_STABILITY: float = Field(
        default=0.5, ge=0.0, le=1.0,
        env="ELEVENLABS_V2V_STABILITY",
        description="Voice stability parameter for V2V transforms",
    )
    CREDIT_RATE_V2V_TRANSFORM: float = Field(
        default=8.0, ge=0.0,
        env="CREDIT_RATE_V2V_TRANSFORM",
        description="Beta credits per V2V voice transform",
    )
    WHISPER_CHILD_SPEECH_MODEL: str = Field(
        default="large-v3",
        env="WHISPER_CHILD_SPEECH_MODEL",
        description="Whisper model optimized for child speech recognition",
    )
    WHISPER_CODE_SWITCH_ENABLED: bool = Field(
        default=True,
        env="WHISPER_CODE_SWITCH_ENABLED",
        description="Enable Hebrew-English code-switch detection",
    )
    WHISPER_LANGUAGE_HINTS: str = Field(
        default="he,en",
        env="WHISPER_LANGUAGE_HINTS",
        description="Comma-separated language hints for Whisper ASR",
    )
    V2V_MAX_LATENCY_MS: int = Field(
        default=1500, ge=500, le=5000,
        env="V2V_MAX_LATENCY_MS",
        description="Maximum acceptable latency in ms for V2V pipeline",
    )
    V2V_EDGE_CACHE_TTL_SECONDS: int = Field(
        default=300, ge=60, le=3600,
        env="V2V_EDGE_CACHE_TTL_SECONDS",
        description="TTL for edge-cached V2V transform results",
    )

    # ============================================
    # ZEH ANI: NARRATIVE ORCHESTRATION (Phase 3 - Live Layer + Magic Mirror)
    # ============================================
    SYNCLABS_API_KEY: str = Field(
        default="",
        env="SYNCLABS_API_KEY",
        description="SyncLabs API key for real-time lip-sync",
    )
    SYNCLABS_BASE_URL: str = Field(
        default="https://api.synclabs.so",
        env="SYNCLABS_BASE_URL",
        description="SyncLabs API base URL",
    )
    SYNCLABS_TIMEOUT: float = Field(
        default=15.0, ge=5.0, le=60.0,
        env="SYNCLABS_TIMEOUT",
        description="Timeout in seconds for SyncLabs requests",
    )
    SYNCLABS_WEBSOCKET_URL: str = Field(
        default="wss://api.synclabs.so/ws",
        env="SYNCLABS_WEBSOCKET_URL",
        description="SyncLabs WebSocket URL for streaming lip-sync",
    )
    CREDIT_RATE_LIVE_LAYER: float = Field(
        default=2.0, ge=0.0,
        env="CREDIT_RATE_LIVE_LAYER",
        description="Beta credits per live layer interaction",
    )
    CREDIT_RATE_SYNCLABS_LIPSYNC: float = Field(
        default=3.0, ge=0.0,
        env="CREDIT_RATE_SYNCLABS_LIPSYNC",
        description="Beta credits per SyncLabs lip-sync generation",
    )
    SCENE_TRIGGER_LOOKAHEAD_SECONDS: float = Field(
        default=5.0, ge=1.0, le=30.0,
        env="SCENE_TRIGGER_LOOKAHEAD_SECONDS",
        description="Seconds to look ahead for upcoming scene triggers",
    )
    SCENE_TRIGGER_MAX_PER_CONTENT: int = Field(
        default=20, ge=1, le=100,
        env="SCENE_TRIGGER_MAX_PER_CONTENT",
        description="Maximum scene triggers per content item",
    )
    MAGIC_MIRROR_GREETING_REFRESH_HOURS: int = Field(
        default=12, ge=1, le=48,
        env="MAGIC_MIRROR_GREETING_REFRESH_HOURS",
        description="Hours between magic mirror greeting refreshes",
    )
    CREDIT_RATE_MAGIC_MIRROR: float = Field(
        default=5.0, ge=0.0,
        env="CREDIT_RATE_MAGIC_MIRROR",
        description="Beta credits per magic mirror greeting generation",
    )
