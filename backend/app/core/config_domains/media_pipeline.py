"""Domain config: Trailer extraction pipeline and Kan Educational TV."""
from pydantic import Field


class MediaPipelineConfigMixin:
    """Trailer extraction pipeline and Kan Educational TV channel configuration."""

    # Trailer Extraction Pipeline Configuration
    TRAILER_EXTRACTION_TEMP_DIR: str = Field(
        default="/tmp/trailer-extraction",
        description="Temp directory for yt-dlp downloads and ffmpeg merges",
    )
    TRAILER_EXTRACTION_FFMPEG_TIMEOUT: int = Field(
        default=300,
        description="Timeout in seconds for ffmpeg merge operations",
    )
    TRAILER_EXTRACTION_YTDLP_TIMEOUT: int = Field(
        default=120,
        description="Timeout in seconds for yt-dlp download operations",
    )
    TRAILER_EXTRACTION_SCAN_INTERVAL_MINUTES: int = Field(
        default=60,
        description="How often the periodic scanner runs (minutes)",
    )
    TRAILER_EXTRACTION_BATCH_LIMIT: int = Field(
        default=10,
        description="Max trailers to extract per scan batch",
    )
    TRAILER_EXTRACTION_MAX_RETRIES: int = Field(
        default=3,
        description="Max extraction attempts before marking trailer as permanently failed",
    )
    TRAILER_GCS_PATH_PREFIX: str = Field(
        default="trailers",
        description="GCS object path prefix for uploaded trailer MP4s",
    )

    # Kan Educational TV YouTube Channel Configuration
    KAN_EDUCATIONAL_YOUTUBE_CHANNEL_ID: str = Field(
        default="UCK3cyNmTx9t0wVsQC5vI93Q",
        env="KAN_EDUCATIONAL_YOUTUBE_CHANNEL_ID",
        description="YouTube channel ID for Kan Educational TV"
    )
    KAN_EDUCATIONAL_EPG_SYNC_INTERVAL_MINUTES: int = Field(
        default=60,
        env="KAN_EDUCATIONAL_EPG_SYNC_INTERVAL_MINUTES",
        description="How often to refresh Kan Educational EPG schedule (minutes)"
    )
    KAN_EDUCATIONAL_LOOP_PLAYLIST: bool = Field(
        default=True,
        env="KAN_EDUCATIONAL_LOOP_PLAYLIST",
        description="Whether to loop the playlist continuously"
    )
