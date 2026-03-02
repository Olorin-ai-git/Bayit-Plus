"""
Cloud Run Job: Clean up orphaned upload sessions.

Run-once job triggered by Cloud Scheduler. Executes a single iteration
of upload session cleanup (same logic as the continuous background task
in the monolith), then exits.

Usage: python -m jobs.cleanup_uploads
"""

import asyncio
import json
import logging
import shutil
from datetime import datetime, timedelta
from pathlib import Path

from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo_subset
from app.core.logging_config import setup_logging
from app.models.upload import (
    BrowserUploadSession, MonitoredFolder, UploadHashLock, UploadJob, UploadStats,
)

setup_logging()
logger = logging.getLogger(__name__)

JOB_MODELS = [UploadJob, MonitoredFolder, UploadStats, BrowserUploadSession, UploadHashLock]


async def run() -> None:
    """Execute a single upload session cleanup pass."""
    await connect_to_mongo_subset(document_models=JOB_MODELS)
    try:
        from app.models.upload import UploadStatus

        upload_dir = Path(settings.UPLOAD_DIR)
        if not upload_dir.exists():
            logger.info("Upload directory does not exist, nothing to clean")
            return

        cutoff_time = datetime.utcnow() - timedelta(hours=settings.UPLOAD_SESSION_MAX_AGE_HOURS)
        timeout_cutoff = datetime.utcnow() - timedelta(hours=settings.UPLOAD_SESSION_TIMEOUT_HOURS)
        cleaned_count = 0
        timeout_count = 0

        for session_dir in upload_dir.iterdir():
            if not session_dir.is_dir():
                continue

            metadata_file = session_dir / "metadata.json"
            if not metadata_file.exists():
                mtime = datetime.fromtimestamp(session_dir.stat().st_mtime)
                if mtime < cutoff_time:
                    shutil.rmtree(session_dir)
                    cleaned_count += 1
                continue

            with open(metadata_file) as f:
                metadata = json.load(f)

            job_id = metadata.get("job_id")
            if job_id:
                job = await UploadJob.find_one({"job_id": job_id})
                if job and job.status in [UploadStatus.PROCESSING, UploadStatus.UPLOADING]:
                    continue

            last_activity_str = metadata.get("last_activity", metadata.get("started_at"))
            if last_activity_str:
                last_activity = datetime.fromisoformat(last_activity_str)
                status = metadata.get("status")
                if status in ["initialized", "uploading"] and last_activity < timeout_cutoff:
                    logger.warning("Upload session timeout: %s", session_dir.name)
                    metadata["status"] = "timeout"
                    with open(metadata_file, "w") as f:
                        json.dump(metadata, f)
                    timeout_count += 1

            started_str = metadata.get("started_at")
            if started_str:
                started = datetime.fromisoformat(started_str)
                if started < cutoff_time:
                    shutil.rmtree(session_dir)
                    cleaned_count += 1
                    logger.info("Cleaned orphaned upload session: %s", session_dir.name)

        logger.info(
            "Session cleanup complete: %d deleted, %d timed out",
            cleaned_count, timeout_count,
        )
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(run())
