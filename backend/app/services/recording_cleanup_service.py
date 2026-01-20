"""
Recording Cleanup Service
Handles deletion and cleanup of recordings
"""

import logging

from app.models.recording import Recording, RecordingSubtitleCue
from app.services.recording_quota_service import recording_quota_service

logger = logging.getLogger(__name__)


class RecordingCleanupService:
    """Handles recording cleanup and deletion"""

    async def delete_recording(self, recording_id: str, user_id: str):
        """
        Delete a recording and free up quota.

        Args:
            recording_id: The recording to delete
            user_id: The user who owns the recording
        """
        try:
            # Get the recording
            recording = await Recording.get(recording_id)
            if not recording:
                logger.warning(f"Recording {recording_id} not found")
                return

            # Delete subtitle cues if any
            subtitle_cues = await RecordingSubtitleCue.find(
                RecordingSubtitleCue.recording_id == recording_id
            ).to_list()

            for cue in subtitle_cues:
                await cue.delete()

            logger.info(
                f"Deleted {len(subtitle_cues)} subtitle cues for recording {recording_id}"
            )

            # Release quota
            await recording_quota_service.release_quota(
                user_id, recording.file_size_bytes
            )

            # Delete files from storage (local/S3/GCS)
            from app.core.storage import get_storage_provider

            storage = get_storage_provider()

            if recording.video_url:
                await storage.delete_file(recording.video_url)
            if recording.subtitle_url:
                await storage.delete_file(recording.subtitle_url)

            # Delete the recording document
            await recording.delete()

            logger.info(f"Successfully deleted recording {recording_id}")

        except Exception as e:
            logger.error(f"Failed to delete recording {recording_id}: {str(e)}")
            raise


# Global instance
recording_cleanup_service = RecordingCleanupService()
