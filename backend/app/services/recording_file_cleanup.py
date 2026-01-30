"""
Recording File Cleanup
Handles cleanup of orphaned temp files and deletion of expired recordings.
"""

import logging
from datetime import datetime, timedelta
from pathlib import Path

from app.core.config import settings
from app.models.recording import Recording

logger = logging.getLogger(__name__)


async def cleanup_orphaned_files() -> int:
    """
    Clean up temp recording files older than the configured threshold.

    Returns:
        Number of files cleaned
    """
    orphan_hours = settings.RECORDING_ORPHAN_FILE_HOURS
    cutoff = datetime.utcnow() - timedelta(hours=orphan_hours)
    temp_dir = Path(settings.RECORDING_TEMP_DIR)

    if not temp_dir.exists():
        return 0

    canonical_temp = temp_dir.resolve()
    cleaned = 0

    for file_path in temp_dir.iterdir():
        if not file_path.is_file():
            continue

        try:
            resolved = file_path.resolve()
            if not str(resolved).startswith(str(canonical_temp)):
                logger.warning(
                    "Skipping file outside temp directory (path traversal attempt)",
                    extra={"file": str(file_path)},
                )
                continue
        except (OSError, ValueError):
            continue

        try:
            mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
            if mtime < cutoff:
                file_path.unlink(missing_ok=True)
                cleaned += 1
                logger.info(
                    "Cleaned orphaned recording file",
                    extra={"file": str(file_path)},
                )
        except Exception as e:
            logger.warning(
                "Failed to clean orphaned file",
                extra={"file": str(file_path), "error": str(e)},
            )

    return cleaned


async def delete_expired_recordings() -> int:
    """
    Delete recordings past their auto_delete_at date.

    Returns:
        Number of recordings deleted
    """
    from app.services.recording_cleanup_service import (
        recording_cleanup_service,
    )

    now = datetime.utcnow()
    expired = await Recording.find(
        Recording.auto_delete_at <= now,
    ).to_list(length=settings.RECORDING_QUERY_LIMIT)

    deleted = 0
    for recording in expired:
        try:
            await recording_cleanup_service.delete_recording(
                str(recording.id), recording.user_id
            )
            deleted += 1
        except Exception as e:
            logger.error(
                "Failed to delete expired recording",
                extra={"recording_id": str(recording.id), "error": str(e)},
            )

    return deleted
