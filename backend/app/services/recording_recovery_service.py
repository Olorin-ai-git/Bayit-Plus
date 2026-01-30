"""
Recording Recovery Service
Handles recovery of stuck/failed recording sessions.
"""

import logging
import os
from datetime import datetime, timedelta

from app.core.config import settings
from app.models.recording import Recording, RecordingSession

logger = logging.getLogger(__name__)


class RecordingRecoveryService:
    """Monitors recording health and recovers stuck sessions."""

    async def run_recovery_cycle(self) -> dict:
        """Execute a full recovery cycle."""
        from app.services.recording_file_cleanup import (
            cleanup_orphaned_files,
            delete_expired_recordings,
        )

        stats = {
            "stuck_recovered": 0,
            "stuck_failed": 0,
            "orphan_files_cleaned": 0,
            "expired_deleted": 0,
        }

        try:
            stats["stuck_recovered"], stats["stuck_failed"] = (
                await self._recover_stuck_sessions()
            )
        except Exception as e:
            logger.error("Failed to recover stuck sessions", extra={"error": str(e)})

        try:
            stats["orphan_files_cleaned"] = await cleanup_orphaned_files()
        except Exception as e:
            logger.error("Failed to cleanup orphaned files", extra={"error": str(e)})

        try:
            stats["expired_deleted"] = await delete_expired_recordings()
        except Exception as e:
            logger.error("Failed to delete expired recordings", extra={"error": str(e)})

        if any(v > 0 for v in stats.values()):
            logger.info("Recording recovery cycle complete", extra=stats)

        return stats

    async def _recover_stuck_sessions(self) -> tuple[int, int]:
        """Find and recover sessions stuck in "processing" state."""
        timeout_minutes = settings.RECORDING_STUCK_TIMEOUT_MINUTES
        cutoff = datetime.utcnow() - timedelta(minutes=timeout_minutes)

        stuck_sessions = await RecordingSession.find(
            RecordingSession.status == "processing",
            RecordingSession.updated_at < cutoff,
        ).to_list(length=settings.RECORDING_QUERY_LIMIT)

        recovered = 0
        failed = 0

        for session in stuck_sessions:
            try:
                if session.output_path and os.path.exists(session.output_path):
                    success = await self._retry_upload(session)
                    if success:
                        recovered += 1
                        continue

                session.status = "failed"
                session.error_message = (
                    f"Stuck in processing for over {timeout_minutes} minutes"
                )
                session.actual_end_at = datetime.utcnow()
                await session.save()
                failed += 1

                logger.warning(
                    "Marked stuck session as failed",
                    extra={
                        "session_id": str(session.id),
                        "recording_id": session.recording_id,
                    },
                )

            except Exception as e:
                logger.error(
                    "Error recovering stuck session",
                    extra={"session_id": str(session.id), "error": str(e)},
                )
                failed += 1

        return recovered, failed

    async def _retry_upload(self, session: RecordingSession) -> bool:
        """Retry GCS upload for a stuck session."""
        try:
            if settings.STORAGE_TYPE not in ("s3", "gcs"):
                return False

            from app.services.gcs_recording_upload_service import (
                gcs_recording_upload_service,
            )

            video_url = await gcs_recording_upload_service.upload_recording(
                local_path=session.output_path,
                recording_id=session.recording_id,
                user_id=session.user_id,
            )

            thumbnail_url = (
                await gcs_recording_upload_service.generate_and_upload_thumbnail(
                    video_path=session.output_path,
                    recording_id=session.recording_id,
                    user_id=session.user_id,
                )
            )

            recording = Recording.from_session(
                session, video_url, session.file_size_bytes
            )
            recording.thumbnail = thumbnail_url
            await recording.insert()

            from app.models.user import User

            user = await User.get(session.user_id)
            if user:
                user.recording_quota.used_storage_bytes += session.file_size_bytes
                await user.save()

            session.status = "completed"
            session.updated_at = datetime.utcnow()
            await session.save()

            try:
                if os.path.exists(session.output_path):
                    os.remove(session.output_path)
            except OSError:
                pass

            logger.info(
                "Successfully recovered stuck session via upload retry",
                extra={
                    "session_id": str(session.id),
                    "recording_id": session.recording_id,
                },
            )
            return True

        except Exception as e:
            logger.error(
                "Upload retry failed for stuck session",
                extra={"session_id": str(session.id), "error": str(e)},
            )
            return False


# Singleton instance
recording_recovery_service = RecordingRecoveryService()
