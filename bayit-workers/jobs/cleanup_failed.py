"""
Cloud Run Job: Clean up failed upload jobs.

Run-once job triggered by Cloud Scheduler. Deletes all upload jobs
in FAILED status from the database, then exits.

Usage: python -m jobs.cleanup_failed
"""

import asyncio
import logging

from app.core.database import close_mongo_connection, connect_to_mongo_subset
from app.core.logging_config import setup_logging
from app.models.upload import UploadJob, UploadStats

setup_logging()
logger = logging.getLogger(__name__)

JOB_MODELS = [UploadJob, UploadStats]


async def run() -> None:
    """Delete all failed upload jobs from the database."""
    await connect_to_mongo_subset(document_models=JOB_MODELS)
    try:
        from app.models.upload import UploadStatus
        result = await UploadJob.find({"status": UploadStatus.FAILED}).delete()
        deleted_count = result.deleted_count if result else 0
        logger.info("Deleted %d failed upload jobs", deleted_count)
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(run())
