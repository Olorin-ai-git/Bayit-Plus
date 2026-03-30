"""Domain config: Live feature quotas, rate limiting, and Chrome extension dubbing."""


class LiveQuotasConfigMixin:
    """Per-user quotas for live subtitles/dubbing and Chrome extension B2C dubbing."""

    # ============================================
    # LIVE FEATURE QUOTAS (Subtitles & Dubbing)
    # ============================================
    # Per-user usage limits for live subtitles and live dubbing features

    # Default quota limits for Premium tier (minutes)
    LIVE_QUOTA_PREMIUM_SUBTITLE_MINUTES_PER_HOUR: int = 60
    LIVE_QUOTA_PREMIUM_SUBTITLE_MINUTES_PER_DAY: int = 240
    LIVE_QUOTA_PREMIUM_SUBTITLE_MINUTES_PER_MONTH: int = 2000
    LIVE_QUOTA_PREMIUM_DUBBING_MINUTES_PER_HOUR: int = 30
    LIVE_QUOTA_PREMIUM_DUBBING_MINUTES_PER_DAY: int = 120
    LIVE_QUOTA_PREMIUM_DUBBING_MINUTES_PER_MONTH: int = 1000

    # Default quota limits for Family tier (minutes) - 2x Premium
    LIVE_QUOTA_FAMILY_SUBTITLE_MINUTES_PER_HOUR: int = 120
    LIVE_QUOTA_FAMILY_SUBTITLE_MINUTES_PER_DAY: int = 480
    LIVE_QUOTA_FAMILY_SUBTITLE_MINUTES_PER_MONTH: int = 4000
    LIVE_QUOTA_FAMILY_DUBBING_MINUTES_PER_HOUR: int = 60
    LIVE_QUOTA_FAMILY_DUBBING_MINUTES_PER_DAY: int = 240
    LIVE_QUOTA_FAMILY_DUBBING_MINUTES_PER_MONTH: int = 2000

    # Rollover settings
    LIVE_QUOTA_MAX_ROLLOVER_MULTIPLIER: float = 2.0
    LIVE_QUOTA_WARNING_THRESHOLD_PERCENTAGE: int = 80

    # Cost estimation for internal analytics (USD)
    LIVE_QUOTA_COST_STT_PER_MINUTE: float = 0.006
    LIVE_QUOTA_COST_TRANSLATION_PER_1K_CHARS: float = 0.020
    LIVE_QUOTA_COST_TTS_PER_1K_CHARS: float = 0.016

    # Average characters per minute for cost estimation
    LIVE_QUOTA_AVG_CHARS_PER_MINUTE_HEBREW: int = 600
    LIVE_QUOTA_AVG_CHARS_PER_MINUTE_ENGLISH: int = 750

    # Session cleanup TTL (days)
    LIVE_QUOTA_SESSION_TTL_DAYS: int = 90

    # Rate limiting (requests per minute)
    LIVE_QUOTA_WEBSOCKET_RATE_LIMIT: int = 5  # Max WebSocket connections per minute
    LIVE_QUOTA_API_RATE_LIMIT: int = 100  # Max API requests per minute
    LIVE_QUOTA_CHECK_RATE_LIMIT: int = 20  # Max quota checks per minute

    # ============================================
    # CHROME EXTENSION B2C DUBBING CONFIGURATION
    # ============================================
    # User-facing dubbing for Chrome extension (not partner API)
    # Free tier: 5 minutes/day, Premium: unlimited ($5/month)
    FREE_TIER_MINUTES_PER_DAY: float = 15.0  # Free quota per day (Chrome extension)
    PREMIUM_TIER_PRICE_USD: float = 5.00  # Monthly subscription price
    WEBSOCKET_BASE_URL: str = ""  # WebSocket base URL for dubbing sessions
    MAX_SESSION_DURATION_MINUTES: int = 120  # Maximum dubbing session duration
    AUDIO_SAMPLE_RATE: int = 16000  # Audio sample rate for dubbing capture (Hz)
    SUPPORTED_EXTENSION_LANGUAGES: list[str] = ["en", "es"]  # Dubbing target languages
    SUPPORTED_EXTENSION_SITES: list[str] = [  # Supported streaming sites
        "screenil.com",
        "mako.co.il",
        "13tv.co.il",
        "kan.org.il",
    ]
