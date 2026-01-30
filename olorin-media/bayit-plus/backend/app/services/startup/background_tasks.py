"""
Background task management for Bayit+ Backend.

This module handles background tasks that run periodically:
- Folder monitoring for new content
- Upload session cleanup
"""

import asyncio
import json
import logging
import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.services.podcast_translation_worker import (PodcastTranslationWorker,
                                                     set_translation_worker)


def _is_running_locally() -> bool:
    """Check if server is running locally (not on Cloud Run)."""
    # Cloud Run sets K_SERVICE environment variable
    return os.getenv("K_SERVICE") is None


logger = logging.getLogger(__name__)

# Track running tasks for graceful shutdown
_running_tasks: list[asyncio.Task[Any]] = []

# Global translation worker instance
_translation_worker: PodcastTranslationWorker | None = None

# Global Beta checkpoint worker instance
_beta_checkpoint_worker = None

# Global live channel monitor instance
_channel_monitor = None

# Global transcript feeder instance
_transcript_feeder = None

# Database readiness flag - set by main.py after successful init_beanie()
_database_ready = False


def set_database_ready(ready: bool = True) -> None:
    """Mark database as initialized (called from main.py after connect_to_mongo)."""
    global _database_ready
    _database_ready = ready


def is_database_ready() -> bool:
    """Check if database was initialized successfully."""
    return _database_ready


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


async def _cleanup_failed_upload_jobs_task() -> None:
    """Clean up failed upload jobs from the database (runs daily)."""
    from app.models.upload import UploadJob, UploadStatus

    # Wait for server to initialize
    await asyncio.sleep(120)

    # Run daily (24 hours = 86400 seconds)
    cleanup_interval = 86400

    while True:
        try:
            # Delete all failed upload jobs
            result = await UploadJob.find(
                {"status": UploadStatus.FAILED}
            ).delete()

            deleted_count = result.deleted_count if result else 0

            if deleted_count > 0:
                logger.info(f"Daily cleanup: deleted {deleted_count} failed upload jobs")

        except asyncio.CancelledError:
            logger.info("Failed upload jobs cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Failed upload jobs cleanup error: {e}", exc_info=True)

        await asyncio.sleep(cleanup_interval)


async def _cleanup_stale_playback_sessions_task() -> None:
    """Clean up stale playback sessions (no heartbeat for 2+ minutes)."""
    from app.services.session_manager import session_manager

    # Wait for server to initialize
    await asyncio.sleep(30)

    while True:
        try:
            # Run cleanup (2-minute heartbeat timeout)
            cleaned_count = await session_manager.cleanup_stale_sessions(
                timeout_seconds=120
            )

            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} stale playback sessions")

        except asyncio.CancelledError:
            logger.info("Playback session cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Playback session cleanup error: {e}", exc_info=True)

        # Run cleanup every 5 minutes (300 seconds)
        await asyncio.sleep(300)


def start_background_tasks() -> None:
    """Start all background tasks."""
    global _running_tasks

    if not _database_ready:
        logger.warning(
            "Database not initialized - skipping DB-dependent background tasks "
            "(server running in DEGRADED mode)"
        )
        return

    # Folder monitoring (only when running locally, not on Cloud Run)
    if settings.UPLOAD_MONITOR_ENABLED and _is_running_locally():
        task = asyncio.create_task(_scan_monitored_folders_task())
        _running_tasks.append(task)
        logger.info("Started folder monitoring background task (local server only)")
    elif settings.UPLOAD_MONITOR_ENABLED and not _is_running_locally():
        logger.info("Folder monitoring disabled on Cloud Run (K_SERVICE detected)")

    # Upload session cleanup (always runs)
    task = asyncio.create_task(_cleanup_upload_sessions_task())
    _running_tasks.append(task)
    logger.info("Started upload session cleanup background task (every 1 hour)")

    # Failed upload jobs cleanup (daily)
    task = asyncio.create_task(_cleanup_failed_upload_jobs_task())
    _running_tasks.append(task)
    logger.info("Started failed upload jobs cleanup background task (daily)")

    # Podcast translation worker (if enabled and auto-start is enabled)
    if settings.PODCAST_TRANSLATION_ENABLED and settings.PODCAST_TRANSLATION_AUTO_START:
        global _translation_worker
        _translation_worker = PodcastTranslationWorker()
        task = asyncio.create_task(_translation_worker.start())
        _running_tasks.append(task)
        set_translation_worker(_translation_worker)
        logger.info(
            f"Started podcast translation worker with "
            f"{settings.PODCAST_TRANSLATION_MAX_CONCURRENT} concurrent workers"
        )
    elif settings.PODCAST_TRANSLATION_ENABLED:
        logger.info("Podcast translation enabled but auto-start disabled - worker will not start on startup")

    # Live feature session monitor (always runs)
    from app.services.session_monitor import get_session_monitor

    task = asyncio.create_task(get_session_monitor())
    _running_tasks.append(task)
    logger.info("Started live feature session monitor (checks every 5 minutes)")

    # Playback session cleanup (always runs)
    task = asyncio.create_task(_cleanup_stale_playback_sessions_task())
    _running_tasks.append(task)
    logger.info("Started playback session cleanup background task (every 5 minutes)")

    # Cost aggregation (always runs)
    from app.services.olorin.cost.jobs.cost_rollup import cost_rollup_job

    task = asyncio.create_task(cost_rollup_job())
    _running_tasks.append(task)
    logger.info("Started cost aggregation background task (every 1 hour)")

    # Beta 500 checkpoint worker (always runs when beta features enabled)
    if settings.BETA_FEATURES_ENABLED:
        from app.workers.beta_checkpoint_worker import checkpoint_worker
        global _beta_checkpoint_worker
        _beta_checkpoint_worker = checkpoint_worker
        task = asyncio.create_task(_beta_checkpoint_worker.start())
        _running_tasks.append(task)
        logger.info(
            f"Started Beta 500 checkpoint worker "
            f"(interval: {settings.SESSION_CHECKPOINT_INTERVAL_SECONDS}s)"
        )

    # Catch-up transcript feeder (always runs when beta features enabled)
    if settings.BETA_FEATURES_ENABLED:
        from app.services.catchup.transcript_feeder import TranscriptFeeder
        global _transcript_feeder
        _transcript_feeder = TranscriptFeeder()
        task = asyncio.create_task(_transcript_feeder.start())
        _running_tasks.append(task)
        logger.info("Started catch-up transcript feeder background task")

    # Live channel stream monitor (always runs)
    from app.services.live_channel_monitor import get_channel_monitor
    global _channel_monitor
    _channel_monitor = get_channel_monitor()
    task = asyncio.create_task(_channel_monitor.run_monitor_loop())
    _running_tasks.append(task)
    logger.info("Started live channel stream monitor (checks every 1 hour)")


async def stop_background_tasks() -> None:
    """Stop all running background tasks gracefully."""
    global _running_tasks, _translation_worker, _beta_checkpoint_worker, _channel_monitor, _transcript_feeder

    # Stop translation worker first
    if _translation_worker:
        logger.info("Stopping podcast translation worker...")
        await _translation_worker.stop()
        _translation_worker = None

    # Stop Beta checkpoint worker
    if _beta_checkpoint_worker:
        logger.info("Stopping Beta 500 checkpoint worker...")
        await _beta_checkpoint_worker.stop()
        _beta_checkpoint_worker = None

    # Stop transcript feeder
    if _transcript_feeder:
        logger.info("Stopping catch-up transcript feeder...")
        await _transcript_feeder.stop()
        _transcript_feeder = None

    # Stop channel monitor
    if _channel_monitor:
        logger.info("Stopping live channel monitor...")
        _channel_monitor = None

    # Stop session monitor
    from app.services.session_monitor import shutdown_session_monitor

    await shutdown_session_monitor()

    if not _running_tasks:
        return

    logger.info(f"Stopping {len(_running_tasks)} background tasks...")

    for task in _running_tasks:
        task.cancel()

    # Wait for all tasks to complete cancellation
    await asyncio.gather(*_running_tasks, return_exceptions=True)
    _running_tasks.clear()

    logger.info("All background tasks stopped")
