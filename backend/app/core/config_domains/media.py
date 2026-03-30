"""Domain config: Recording storage, podcast translation, audio processing, and voice settings."""
from pydantic import Field


class MediaConfigMixin:
    """Recording storage, podcast translation, audio processing, and voice settings."""

    # Recording Storage
    RECORDING_GCS_PATH_PREFIX: str = Field(
        default="recordings",
        env="RECORDING_GCS_PATH_PREFIX",
        description="GCS path prefix for recording files",
    )
    RECORDING_AUTO_DELETE_DAYS: int = Field(
        default=30,
        env="RECORDING_AUTO_DELETE_DAYS",
        description="Days before auto-deleting recordings",
    )
    RECORDING_SCHEDULER_BUFFER_SECONDS: int = Field(
        default=30,
        env="RECORDING_SCHEDULER_BUFFER_SECONDS",
        description="Seconds to start recording before EPG scheduled time",
    )
    RECORDING_MAX_SERIES_RULES_PER_USER: int = Field(
        default=10,
        env="RECORDING_MAX_SERIES_RULES_PER_USER",
        description="Maximum series recording rules per user",
    )
    RECORDING_RULE_SCAN_INTERVAL_MINUTES: int = Field(
        default=60,
        env="RECORDING_RULE_SCAN_INTERVAL_MINUTES",
        description="Interval in minutes to re-scan EPG for series rule matches",
    )
    RECORDING_RECOVERY_INTERVAL_MINUTES: int = Field(
        default=15,
        env="RECORDING_RECOVERY_INTERVAL_MINUTES",
        description="Interval in minutes for recovery service to check stuck sessions",
    )
    RECORDING_STUCK_TIMEOUT_MINUTES: int = Field(
        default=30,
        env="RECORDING_STUCK_TIMEOUT_MINUTES",
        description="Minutes after which a processing session is considered stuck",
    )
    RECORDING_ORPHAN_FILE_HOURS: int = Field(
        default=24,
        env="RECORDING_ORPHAN_FILE_HOURS",
        description="Hours after which orphaned temp recording files are cleaned up",
    )
    RECORDING_TEMP_DIR: str = Field(
        default="/tmp/recordings",
        env="RECORDING_TEMP_DIR",
        description="Temporary directory for recording files",
    )
    RECORDING_MISFIRE_GRACE_TIME_SECONDS: int = Field(
        default=300,
        env="RECORDING_MISFIRE_GRACE_TIME_SECONDS",
        description="Grace time in seconds for misfired APScheduler recording jobs",
    )
    RECORDING_QUERY_LIMIT: int = Field(
        default=500,
        env="RECORDING_QUERY_LIMIT",
        description="Maximum number of documents to return in unbounded recording queries",
    )

    # Podcast Translation Configuration
    PODCAST_TRANSLATION_ENABLED: bool = Field(
        default=False, description="Enable automatic podcast translation"
    )
    PODCAST_TRANSLATION_AUTO_START: bool = Field(
        default=False, description="Auto-start translation worker on server startup"
    )
    PODCAST_TRANSLATION_POLL_INTERVAL: int = Field(
        default=300,
        description="Interval in seconds to check for untranslated episodes",
    )
    PODCAST_TRANSLATION_MAX_CONCURRENT: int = Field(
        default=2, description="Maximum number of concurrent translation workers"
    )
    TEMP_AUDIO_DIR: str = Field(
        default="/tmp/podcast_audio",
        description="Temporary directory for audio processing",
    )
    PODCAST_DEFAULT_ORIGINAL_LANGUAGE: str = Field(
        default="he", description="Default language for podcasts without detection"
    )
    PODCAST_MAX_EPISODES_TO_KEEP: int = Field(
        default=20, description="Maximum episodes to keep per podcast during cleanup"
    )
    ALLOWED_AUDIO_DOMAINS: list[str] = Field(
        default_factory=lambda: [
            "anchor.fm",
            "spotify.com",
            "podcasts.apple.com",
            "feeds.buzzsprout.com",
            "feeds.transistor.fm",
            "feeds.soundcloud.com",
            "feeds.megaphone.fm",
            "feeds.simplecast.com",
            "feeds.art19.com",
            "feeds.howstuffworks.com",
            "feeds.npr.org",
            "feeds.podcastone.com",
            "rss.art19.com",
            "traffic.megaphone.fm",
            "traffic.libsyn.com",
            "media.blubrry.com",
            "dcs.megaphone.fm",
            "storage.googleapis.com",
            "s3.amazonaws.com",
            "cloudfront.net",
        ],
        description="Whitelisted domains for audio downloads (SSRF protection)",
    )

    # Audio Processing Settings
    AUDIO_SEPARATION_MODEL: str = Field(
        default="htdemucs_6s", description="Demucs model for vocal separation"
    )
    AUDIO_SEPARATION_DEVICE: str = Field(
        default="cpu", description="Device for audio processing (cpu/cuda)"
    )
    STT_MODEL: str = Field(default="large-v3", description="Whisper model for STT")
    STT_DEVICE: str = Field(
        default="cpu", description="Device for Whisper STT (cpu/cuda)"
    )

    # Audio Quality Settings
    TARGET_LUFS: float = Field(
        default=-16.0, description="Target LUFS for normalization"
    )
    PEAK_LIMITER: float = Field(default=-1.5, description="Peak limiter in dB")
    VOCAL_VOLUME_DB: float = Field(default=0.0, description="Vocal volume adjustment")
    BACKGROUND_VOLUME_DB: float = Field(
        default=-12.0, description="Background volume ducking"
    )

    # ElevenLabs Voice Settings
    ELEVENLABS_STABILITY: float = Field(
        default=0.75, description="Voice stability (0.7-0.8 for podcast)"
    )
    ELEVENLABS_SIMILARITY_BOOST: float = Field(
        default=0.85, description="Similarity boost for consistent voice"
    )
    ELEVENLABS_STYLE: float = Field(
        default=0.4, description="Style/expressiveness level"
    )
    ELEVENLABS_SPEAKER_BOOST: bool = Field(
        default=True, description="Enable speaker boost for clarity"
    )
    ELEVENLABS_MODEL: str = Field(
        default="eleven_multilingual_v2",
        description="ElevenLabs TTS model (v2 multilingual with Hebrew support)",
    )
    ELEVENLABS_HEBREW_VOICE_ID: str = Field(
        default="", description="ElevenLabs voice ID for Hebrew (female)"
    )
    ELEVENLABS_ENGLISH_VOICE_ID: str = Field(
        default="", description="ElevenLabs voice ID for English (female)"
    )
    ELEVENLABS_HEBREW_MALE_VOICE_ID: str = Field(
        default="", description="ElevenLabs voice ID for Hebrew (male)"
    )
    ELEVENLABS_ENGLISH_MALE_VOICE_ID: str = Field(
        default="", description="ElevenLabs voice ID for English (male)"
    )

    # VOD Audio Generation Configuration
    VOD_AUDIO_TEMP_DIR: str = Field(
        default="/tmp/vod-audio",
        description="Temporary directory for VOD audio generation processing",
    )
    AUDIO_GENERATION_MAX_CONCURRENT_JOBS: int = Field(
        default=5,
        description="Maximum number of concurrent audio generation jobs",
    )
