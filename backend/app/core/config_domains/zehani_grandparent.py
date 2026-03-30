"""Domain config: Zeh Ani grandparent loop (Phase 4) + URL migration."""
from pydantic import Field


class ZehAniGrandparentConfigMixin:
    """Zeh Ani grandparent loop (Phase 4) and URL migration configuration."""

    # ============================================
    # ZEH ANI: GRANDPARENT LOOP (Phase 4 - Highlights + WhatsApp)
    # ============================================
    HIGHLIGHT_REEL_DURATION_SECONDS: int = Field(
        default=30, ge=10, le=120,
        env="HIGHLIGHT_REEL_DURATION_SECONDS",
        description="Target duration for generated highlight reels",
    )
    HIGHLIGHT_REEL_MIN_INTERACTIONS: int = Field(
        default=3, ge=1, le=20,
        env="HIGHLIGHT_REEL_MIN_INTERACTIONS",
        description="Minimum interactions required for reel generation",
    )
    CREDIT_RATE_HIGHLIGHT_REEL: int = Field(
        default=20, ge=0,
        env="CREDIT_RATE_HIGHLIGHT_REEL",
        description="Beta credits per highlight reel generation",
    )
    TWILIO_WHATSAPP_NUMBER: str = Field(
        default="",
        env="TWILIO_WHATSAPP_NUMBER",
        description="Twilio WhatsApp sender number",
    )
    TWILIO_WHATSAPP_TEMPLATE_SID: str = Field(
        default="",
        env="TWILIO_WHATSAPP_TEMPLATE_SID",
        description="Twilio WhatsApp approved template SID",
    )
    TWILIO_WHATSAPP_CONTENT_SID: str = Field(
        default="",
        env="TWILIO_WHATSAPP_CONTENT_SID",
        description="Twilio WhatsApp content SID for media messages",
    )
    TWILIO_WHATSAPP_WEBHOOK_URL: str = Field(
        default="",
        env="TWILIO_WHATSAPP_WEBHOOK_URL",
        description="Full public URL of the Twilio WhatsApp webhook for signature verification",
    )
    GRANDPARENT_FEEDBACK_NOTIFICATION_ENABLED: bool = Field(
        default=True,
        env="GRANDPARENT_FEEDBACK_NOTIFICATION_ENABLED",
        description="Enable in-app notifications for grandparent replies",
    )
    GRANDPARENT_REPLY_TRANSCRIPTION_ENABLED: bool = Field(
        default=True,
        env="GRANDPARENT_REPLY_TRANSCRIPTION_ENABLED",
        description="Enable automatic transcription of grandparent voice replies",
    )
    VOICE_MESSAGE_FALLBACKS: dict = Field(
        default={
            "he": "\u05e9\u05dc\u05d7 \u05d4\u05d5\u05d3\u05e2\u05d4 \u05e7\u05d5\u05dc\u05d9\u05ea",
            "en": "Sent a voice message",
            "es": "Envi\u00f3 un mensaje de voz",
            "fr": "A envoy\u00e9 un message vocal",
            "it": "Ha inviato un messaggio vocale",
            "ja": "\u97f3\u58f0\u30e1\u30c3\u30bb\u30fc\u30b8\u3092\u9001\u4fe1\u3057\u307e\u3057\u305f",
            "zh": "\u53d1\u9001\u4e86\u8bed\u97f3\u6d88\u606f",
            "hi": "\u090f\u0915 \u0935\u0949\u092f\u0938 \u092e\u0948\u0938\u0947\u091c \u092d\u0947\u091c\u093e",
            "ta": "\u0b95\u0bc1\u0bb0\u0bb2\u0bcd \u0b9a\u0bc6\u0baf\u0bcd\u0ba4\u0bbf \u0b85\u0ba9\u0bc1\u0baa\u0bcd\u0baa\u0bbf\u0baf\u0ba4\u0bc1",
            "bn": "\u098f\u0995\u099f\u09bf \u09ad\u09df\u09c7\u09b8 \u09ae\u09c7\u09b8\u09c7\u099c \u09aa\u09be\u09a0\u09bf\u09df\u09c7\u099b\u09c7",
        },
        description="Localized fallback text for voice message notifications (keyed by ISO 639-1)",
    )
    WHATSAPP_SHARE_URL_EXPIRY_SECONDS: int = Field(
        default=3600, ge=300, le=86400,
        env="WHATSAPP_SHARE_URL_EXPIRY_SECONDS",
        description="Signed URL expiry for WhatsApp shared highlight videos",
    )
    PHONE_HASH_SALT: str = Field(
        default="",
        env="PHONE_HASH_SALT",
        description="HMAC salt for phone number hashing (prevents rainbow table attacks)",
    )
    WEBSOCKET_MAX_AUDIO_PAYLOAD_BYTES: int = Field(
        default=1048576, ge=65536, le=10485760,
        env="WEBSOCKET_MAX_AUDIO_PAYLOAD_BYTES",
        description="Maximum audio payload size in bytes for WebSocket messages (1MB default)",
    )
    MESH_SIGNED_URL_EXPIRY_SECONDS: int = Field(
        default=3600, ge=300, le=86400,
        env="MESH_SIGNED_URL_EXPIRY_SECONDS",
        description="Signed URL expiry for mesh .glb file downloads",
    )
    SYNCLABS_SIGNED_URL_EXPIRY_SECONDS: int = Field(
        default=3600, ge=300, le=86400,
        env="SYNCLABS_SIGNED_URL_EXPIRY_SECONDS",
        description="Signed URL expiry for audio files sent to SyncLabs API",
    )
    HIGHLIGHT_SHARE_URL_EXPIRY_SECONDS: int = Field(
        default=3600, ge=300, le=86400,
        env="HIGHLIGHT_SHARE_URL_EXPIRY_SECONDS",
        description="Signed URL expiry for public highlight reel share links",
    )

    # ============================================
    # URL MIGRATION CONFIGURATION (for script consolidation)
    # ============================================
    # Configuration for URL transformation scripts (bucket upgrades, S3->GCS migration)
    OLD_BUCKET_NAME: str = Field(
        default="bayit-plus-media/", description="Old GCS bucket name for URL migration"
    )
    NEW_BUCKET_NAME: str = Field(
        default="bayit-plus-media-new/",
        description="New GCS bucket name for URL migration",
    )
    S3_PATTERN: str = Field(
        default=r"s3\.amazonaws\.com",
        description="S3 URL pattern to replace during migration",
    )
    GCS_PATTERN: str = Field(
        default="storage.googleapis.com",
        description="GCS URL pattern for S3->GCS migration",
    )
