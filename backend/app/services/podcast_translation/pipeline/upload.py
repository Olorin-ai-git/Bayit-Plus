"""GCS upload for translated audio."""
import logging
from datetime import datetime

from app.core.storage import StorageService

logger = logging.getLogger(__name__)


async def upload_translated_audio(
    audio_path: str,
    episode_id: str,
    language: str,
    storage: StorageService,
) -> str:
    """
    Upload translated audio to Google Cloud Storage with cache-busting timestamp.

    Args:
        audio_path: Path to audio file
        episode_id: Episode ID for GCS path
        language: Language code for GCS path
        storage: Storage service

    Returns:
        Public URL to uploaded audio with cache-busting query parameter
    """
    # Use timestamped path to avoid CDN caching old versions
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    gcs_path = f"podcasts/translations/{episode_id}/{language}_{timestamp}.mp3"
    url = await storage.upload_file(audio_path, gcs_path)
    logger.info(f"Uploaded translated audio to: {url}")
    return url
