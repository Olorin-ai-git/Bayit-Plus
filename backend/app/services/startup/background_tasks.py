"""
Background task management for Bayit+ Backend.

This module handles background tasks that run periodically:
- Folder monitoring for new content
- Upload session cleanup
"""

import asyncio
import json
import logging
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# Track running tasks for graceful shutdown
_running_tasks: list[asyncio.Task[Any]] = []


async def _scan_monitored_folders_task() -> None:
    """Periodically scan monitored folders for new content."""
    from app.services.folder_monitor_service import folder_monitor_service

    # Wait for server to initialize
    await asyncio.sleep(10)

    # Initialize default folders from config
    try:
        await folder_monitor_service.initialize_from_config()
        logger.info("Monitored folders initialized from config")
    except Exception as e:
        logger.warning(f"Failed to initialize monitored folders: {e}")

    # Run periodic scans
    while True:
        try:
            if settings.UPLOAD_MONITOR_ENABLED:
                logger.info("Scanning monitored folders for new content...")
                stats = await folder_monitor_service.scan_and_enqueue()
                logger.info(f"Folder scan complete: {stats}")

            # Wait for next scan interval
            await asyncio.sleep(settings.UPLOAD_MONITOR_INTERVAL)

        except asyncio.CancelledError:
            logger.info("Folder monitoring task cancelled")
            break
        except Exception as e:
            logger.error(f"Folder monitoring task error: {e}", exc_info=True)
            # Wait before retrying on error
            await asyncio.sleep(60)


async def _cleanup_upload_sessions_task() -> None:
    """Clean up orphaned upload sessions older than configured age."""
    # Wait for server to initialize
    await asyncio.sleep(60)

    while True:
        try:
            upload_dir = Path(settings.UPLOAD_DIR)
            if not upload_dir.exists():
                await asyncio.sleep(settings.UPLOAD_SESSION_CLEANUP_INTERVAL_SECONDS)
                continue

            cutoff_time = datetime.utcnow() - timedelta(
                hours=settings.UPLOAD_SESSION_MAX_AGE_HOURS
            )
            timeout_cutoff = datetime.utcnow() - timedelta(
                hours=settings.UPLOAD_SESSION_TIMEOUT_HOURS
            )
            cleaned_count = 0
            timeout_count = 0

            for session_dir in upload_dir.iterdir():
                if not session_dir.is_dir():
                    continue

                metadata_file = session_dir / "metadata.json"
                if not metadata_file.exists():
                    # No metadata, check filesystem age
                    mtime = datetime.fromtimestamp(session_dir.stat().st_mtime)
                    if mtime < cutoff_time:
                        shutil.rmtree(session_dir)
                        cleaned_count += 1
                    continue

                # Read metadata
                with open(metadata_file) as f:
                    metadata = json.load(f)

                # Check if session has active job reference
                job_id = metadata.get("job_id")
                if job_id:
                    from app.models.upload import UploadJob, UploadStatus

                    job = await UploadJob.find_one(UploadJob.job_id == job_id)
                    if job and job.status in [
                        UploadStatus.PROCESSING,
                        UploadStatus.UPLOADING,
                    ]:
                        continue  # Skip active jobs

                # Check timeout (since last activity)
                last_activity_str = metadata.get(
                    "last_activity", metadata.get("started_at")
                )
                if last_activity_str:
                    last_activity = datetime.fromisoformat(last_activity_str)
                    status = metadata.get("status")

                    if (
                        status in ["initialized", "uploading"]
                        and last_activity < timeout_cutoff
                    ):
                        logger.warning(f"Upload session timeout: {session_dir.name}")
                        metadata["status"] = "timeout"
                        with open(metadata_file, "w") as f:
                            json.dump(metadata, f)
                        timeout_count += 1

                # Check age for deletion
                started_str = metadata.get("started_at")
                if started_str:
                    started = datetime.fromisoformat(started_str)
                    if started < cutoff_time:
                        shutil.rmtree(session_dir)
                        cleaned_count += 1
                        logger.info(
                            f"Cleaned orphaned upload session: {session_dir.name}"
                        )

            if cleaned_count > 0 or timeout_count > 0:
                logger.info(
                    f"Session cleanup: {cleaned_count} deleted, {timeout_count} timed out"
                )

        except asyncio.CancelledError:
            logger.info("Upload session cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Upload session cleanup error: {e}", exc_info=True)

        await asyncio.sleep(settings.UPLOAD_SESSION_CLEANUP_INTERVAL_SECONDS)


def start_background_tasks() -> None:
    """Start all background tasks."""
    global _running_tasks

    # Folder monitoring (if enabled)
    if settings.UPLOAD_MONITOR_ENABLED:
        task = asyncio.create_task(_scan_monitored_folders_task())
        _running_tasks.append(task)
        logger.info("Started folder monitoring background task")

    # Upload session cleanup (always runs)
    task = asyncio.create_task(_cleanup_upload_sessions_task())
    _running_tasks.append(task)
    logger.info("Started upload session cleanup background task (every 1 hour)")


async def stop_background_tasks() -> None:
    """Stop all running background tasks gracefully."""
    global _running_tasks

    if not _running_tasks:
        return

    logger.info(f"Stopping {len(_running_tasks)} background tasks...")

    for task in _running_tasks:
        task.cancel()

    # Wait for all tasks to complete cancellation
    await asyncio.gather(*_running_tasks, return_exceptions=True)
    _running_tasks.clear()

    logger.info("All background tasks stopped")
