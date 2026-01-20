"""
Upload Integrity Service - Orphan Detection and Cleanup

Provides tools for detecting and cleaning up data integrity issues:
- Orphaned GCS files (no corresponding database record)
- Orphaned Content records (no corresponding GCS file)
- Stuck upload jobs (processing for too long)
"""

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional

from app.core.config import settings
from app.models.content import Content
from app.models.upload import UploadJob, UploadStatus
from beanie.operators import In
from motor.motor_asyncio import AsyncIOMotorClient

from .gcs import gcs_uploader

logger = logging.getLogger(__name__)


@dataclass
class OrphanedFile:
    """Represents an orphaned GCS file."""

    gcs_path: str
    public_url: str
    size_bytes: Optional[int] = None
    created_at: Optional[datetime] = None


@dataclass
class OrphanedRecord:
    """Represents an orphaned database record."""

    content_id: str
    title: str
    stream_url: str
    file_hash: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class StuckJob:
    """Represents a stuck upload job."""

    job_id: str
    filename: str
    status: str
    started_at: datetime
    stuck_minutes: int
    current_stage: Optional[str] = None


@dataclass
class CleanupResult:
    """Result of a cleanup operation."""

    success: bool
    items_found: int
    items_cleaned: int
    items_failed: int
    errors: List[str] = field(default_factory=list)
    details: List[dict] = field(default_factory=list)
    dry_run: bool = False


@dataclass
class RecoveryResult:
    """Result of a job recovery operation."""

    success: bool
    jobs_found: int
    jobs_recovered: int
    jobs_failed: int
    errors: List[str] = field(default_factory=list)
    details: List[dict] = field(default_factory=list)
    dry_run: bool = False


@dataclass
class IntegrityStatus:
    """Overall integrity status."""

    orphaned_gcs_files: int = 0
    orphaned_content_records: int = 0
    stuck_upload_jobs: int = 0
    stale_hash_locks: int = 0
    last_checked: Optional[datetime] = None
    issues_found: bool = False


class UploadIntegrityService:
    """
    Service for detecting and cleaning up upload data integrity issues.

    Provides methods to:
    - Find orphaned GCS files (uploaded but no DB record)
    - Find orphaned Content records (DB record but no GCS file)
    - Find stuck upload jobs (processing too long)
    - Clean up orphaned data with dry-run support
    """

    def __init__(self, stuck_threshold_minutes: int = 30):
        """
        Initialize the integrity service.

        Args:
            stuck_threshold_minutes: Time after which a processing job is considered stuck
        """
        self._stuck_threshold = stuck_threshold_minutes

    async def get_integrity_status(self) -> IntegrityStatus:
        """
        Get a summary of all integrity issues.

        Returns:
            IntegrityStatus with counts of all issues
        """
        status = IntegrityStatus(last_checked=datetime.utcnow())

        try:
            # Count orphaned GCS files
            orphaned_files = await self.find_orphaned_gcs_files(limit=1000)
            status.orphaned_gcs_files = len(orphaned_files)

            # Count orphaned Content records
            orphaned_records = await self.find_orphaned_content_records(limit=1000)
            status.orphaned_content_records = len(orphaned_records)

            # Count stuck jobs
            stuck_jobs = await self.find_stuck_upload_jobs()
            status.stuck_upload_jobs = len(stuck_jobs)

            # Count stale hash locks
            from .lock import upload_lock_manager

            stale_count = await upload_lock_manager.cleanup_stale_locks()
            status.stale_hash_locks = stale_count

            status.issues_found = (
                status.orphaned_gcs_files > 0
                or status.orphaned_content_records > 0
                or status.stuck_upload_jobs > 0
            )

        except Exception as e:
            logger.error(f"Failed to get integrity status: {e}", exc_info=True)

        return status

    async def find_orphaned_gcs_files(
        self, prefix: str = None, limit: int = 100
    ) -> List[OrphanedFile]:
        """
        Find GCS files that have no corresponding Content record.

        Args:
            prefix: Optional prefix to filter (e.g., "movies/")
            limit: Maximum number of orphans to return

        Returns:
            List of OrphanedFile objects
        """
        orphans = []

        try:
            # Get all GCS files for video content
            prefixes_to_check = ["movies/", "seriess/"] if not prefix else [prefix]

            for gcs_prefix in prefixes_to_check:
                gcs_files = await gcs_uploader.list_files(gcs_prefix)

                for gcs_path in gcs_files:
                    if len(orphans) >= limit:
                        break

                    # Skip non-video files
                    if not any(
                        gcs_path.endswith(ext)
                        for ext in [".mp4", ".mkv", ".webm", ".avi", ".mov"]
                    ):
                        continue

                    # Build the expected public URL
                    public_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{gcs_path}"

                    # Check if a Content record exists with this URL
                    content = await Content.find_one(Content.stream_url == public_url)

                    if not content:
                        orphans.append(
                            OrphanedFile(
                                gcs_path=gcs_path,
                                public_url=public_url,
                            )
                        )
                        logger.debug(f"Found orphaned GCS file: {gcs_path}")

            logger.info(f"Found {len(orphans)} orphaned GCS files")

        except Exception as e:
            logger.error(f"Failed to find orphaned GCS files: {e}", exc_info=True)

        return orphans

    async def find_orphaned_content_records(
        self, limit: int = 100
    ) -> List[OrphanedRecord]:
        """
        Find Content records whose GCS files no longer exist.

        Args:
            limit: Maximum number of orphans to return

        Returns:
            List of OrphanedRecord objects
        """
        orphans = []

        try:
            # Find all Content with GCS URLs
            gcs_url_pattern = (
                f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/"
            )

            client = AsyncIOMotorClient(settings.MONGODB_URL)
            db = client[settings.MONGODB_DB_NAME]

            # Query for content with GCS URLs
            cursor = db.content.find(
                {"stream_url": {"$regex": f"^{re.escape(gcs_url_pattern)}"}}
            ).limit(
                limit * 2
            )  # Get more to account for filtering

            async for content_doc in cursor:
                if len(orphans) >= limit:
                    break

                stream_url = content_doc.get("stream_url", "")

                # Extract GCS path from URL
                if gcs_url_pattern in stream_url:
                    gcs_path = stream_url.replace(gcs_url_pattern, "")

                    # Check if file exists in GCS
                    exists = await gcs_uploader.file_exists(gcs_path)

                    if not exists:
                        orphans.append(
                            OrphanedRecord(
                                content_id=str(content_doc["_id"]),
                                title=content_doc.get("title", "Unknown"),
                                stream_url=stream_url,
                                file_hash=content_doc.get("file_hash"),
                                created_at=content_doc.get("created_at"),
                            )
                        )
                        logger.debug(
                            f"Found orphaned Content record: {content_doc.get('title')}"
                        )

            logger.info(f"Found {len(orphans)} orphaned Content records")

        except Exception as e:
            logger.error(f"Failed to find orphaned Content records: {e}", exc_info=True)

        return orphans

    async def find_stuck_upload_jobs(
        self, threshold_minutes: int = None
    ) -> List[StuckJob]:
        """
        Find upload jobs that are stuck in processing state.

        Args:
            threshold_minutes: Override default threshold

        Returns:
            List of StuckJob objects
        """
        threshold = threshold_minutes or self._stuck_threshold
        stuck_jobs = []

        try:
            cutoff_time = datetime.utcnow() - timedelta(minutes=threshold)

            jobs = await UploadJob.find(
                In(UploadJob.status, [UploadStatus.PROCESSING, UploadStatus.UPLOADING]),
                UploadJob.started_at < cutoff_time,
            ).to_list()

            for job in jobs:
                stuck_minutes = int(
                    (datetime.utcnow() - job.started_at).total_seconds() / 60
                )

                stuck_jobs.append(
                    StuckJob(
                        job_id=job.job_id,
                        filename=job.filename,
                        status=job.status.value,
                        started_at=job.started_at,
                        stuck_minutes=stuck_minutes,
                        current_stage=job.get_current_stage(),
                    )
                )

            logger.info(f"Found {len(stuck_jobs)} stuck upload jobs")

        except Exception as e:
            logger.error(f"Failed to find stuck upload jobs: {e}", exc_info=True)

        return stuck_jobs

    async def cleanup_orphaned_gcs_files(
        self, dry_run: bool = True, limit: int = 100
    ) -> CleanupResult:
        """
        Clean up orphaned GCS files.

        Args:
            dry_run: If True, only report what would be deleted
            limit: Maximum number of files to clean up

        Returns:
            CleanupResult with details
        """
        result = CleanupResult(
            success=True,
            items_found=0,
            items_cleaned=0,
            items_failed=0,
            dry_run=dry_run,
        )

        try:
            orphans = await self.find_orphaned_gcs_files(limit=limit)
            result.items_found = len(orphans)

            for orphan in orphans:
                if dry_run:
                    result.details.append(
                        {
                            "action": "would_delete",
                            "gcs_path": orphan.gcs_path,
                            "public_url": orphan.public_url,
                        }
                    )
                    result.items_cleaned += 1
                else:
                    deleted = await gcs_uploader.delete_file(orphan.gcs_path)
                    if deleted:
                        result.items_cleaned += 1
                        result.details.append(
                            {
                                "action": "deleted",
                                "gcs_path": orphan.gcs_path,
                            }
                        )
                        logger.info(f"Deleted orphaned GCS file: {orphan.gcs_path}")
                    else:
                        result.items_failed += 1
                        error_msg = f"Failed to delete {orphan.gcs_path}"
                        result.errors.append(error_msg)
                        result.success = False

            logger.info(
                f"GCS cleanup complete: {result.items_cleaned}/{result.items_found} "
                f"{'would be ' if dry_run else ''}cleaned"
            )

        except Exception as e:
            logger.error(f"GCS cleanup failed: {e}", exc_info=True)
            result.success = False
            result.errors.append(str(e))

        return result

    async def cleanup_orphaned_content_records(
        self, dry_run: bool = True, limit: int = 100
    ) -> CleanupResult:
        """
        Clean up orphaned Content records (where GCS file is missing).

        Args:
            dry_run: If True, only report what would be deleted
            limit: Maximum number of records to clean up

        Returns:
            CleanupResult with details
        """
        result = CleanupResult(
            success=True,
            items_found=0,
            items_cleaned=0,
            items_failed=0,
            dry_run=dry_run,
        )

        try:
            orphans = await self.find_orphaned_content_records(limit=limit)
            result.items_found = len(orphans)

            from bson import ObjectId

            for orphan in orphans:
                if dry_run:
                    result.details.append(
                        {
                            "action": "would_delete",
                            "content_id": orphan.content_id,
                            "title": orphan.title,
                            "stream_url": orphan.stream_url,
                        }
                    )
                    result.items_cleaned += 1
                else:
                    try:
                        content = await Content.find_one(
                            Content.id == ObjectId(orphan.content_id)
                        )
                        if content:
                            await content.delete()
                            result.items_cleaned += 1
                            result.details.append(
                                {
                                    "action": "deleted",
                                    "content_id": orphan.content_id,
                                    "title": orphan.title,
                                }
                            )
                            logger.info(f"Deleted orphaned Content: {orphan.title}")
                    except Exception as e:
                        result.items_failed += 1
                        error_msg = f"Failed to delete Content {orphan.content_id}: {e}"
                        result.errors.append(error_msg)
                        result.success = False

            logger.info(
                f"Content cleanup complete: {result.items_cleaned}/{result.items_found} "
                f"{'would be ' if dry_run else ''}cleaned"
            )

        except Exception as e:
            logger.error(f"Content cleanup failed: {e}", exc_info=True)
            result.success = False
            result.errors.append(str(e))

        return result

    async def recover_stuck_jobs(
        self, dry_run: bool = True, threshold_minutes: int = None
    ) -> RecoveryResult:
        """
        Recover stuck upload jobs by marking them as failed and requeuing.

        Args:
            dry_run: If True, only report what would be done
            threshold_minutes: Override default threshold

        Returns:
            RecoveryResult with details
        """
        result = RecoveryResult(
            success=True,
            jobs_found=0,
            jobs_recovered=0,
            jobs_failed=0,
            dry_run=dry_run,
        )

        try:
            stuck_jobs = await self.find_stuck_upload_jobs(threshold_minutes)
            result.jobs_found = len(stuck_jobs)

            for stuck in stuck_jobs:
                if dry_run:
                    result.details.append(
                        {
                            "action": "would_recover",
                            "job_id": stuck.job_id,
                            "filename": stuck.filename,
                            "stuck_minutes": stuck.stuck_minutes,
                        }
                    )
                    result.jobs_recovered += 1
                else:
                    try:
                        job = await UploadJob.find_one(UploadJob.job_id == stuck.job_id)
                        if job:
                            # Clean up any partial uploads
                            if job.gcs_path:
                                await gcs_uploader.delete_file(job.gcs_path)

                            # Mark as failed with special message
                            job.status = UploadStatus.FAILED
                            job.error_message = (
                                f"Recovered from stuck state "
                                f"(stuck for {stuck.stuck_minutes} minutes)"
                            )
                            job.completed_at = datetime.utcnow()

                            # Requeue if retries available
                            if job.retry_count < job.max_retries:
                                job.status = UploadStatus.QUEUED
                                job.retry_count += 1

                            await job.save()
                            result.jobs_recovered += 1
                            result.details.append(
                                {
                                    "action": "recovered",
                                    "job_id": stuck.job_id,
                                    "new_status": job.status.value,
                                }
                            )
                            logger.info(f"Recovered stuck job: {stuck.job_id}")

                    except Exception as e:
                        result.jobs_failed += 1
                        error_msg = f"Failed to recover job {stuck.job_id}: {e}"
                        result.errors.append(error_msg)
                        result.success = False

            logger.info(
                f"Job recovery complete: {result.jobs_recovered}/{result.jobs_found} "
                f"{'would be ' if dry_run else ''}recovered"
            )

        except Exception as e:
            logger.error(f"Job recovery failed: {e}", exc_info=True)
            result.success = False
            result.errors.append(str(e))

        return result

    async def run_full_cleanup(self, dry_run: bool = True, limit: int = 100) -> dict:
        """
        Run a full cleanup of all integrity issues.

        Args:
            dry_run: If True, only report what would be done
            limit: Maximum number of items to clean per category

        Returns:
            Dict with all cleanup results
        """
        logger.info(f"Starting full integrity cleanup (dry_run={dry_run})")

        results = {
            "dry_run": dry_run,
            "started_at": datetime.utcnow().isoformat(),
            "gcs_cleanup": None,
            "content_cleanup": None,
            "job_recovery": None,
            "overall_success": True,
        }

        # Clean orphaned GCS files
        gcs_result = await self.cleanup_orphaned_gcs_files(dry_run=dry_run, limit=limit)
        results["gcs_cleanup"] = {
            "success": gcs_result.success,
            "items_found": gcs_result.items_found,
            "items_cleaned": gcs_result.items_cleaned,
            "items_failed": gcs_result.items_failed,
            "errors": gcs_result.errors,
        }
        if not gcs_result.success:
            results["overall_success"] = False

        # Clean orphaned Content records
        content_result = await self.cleanup_orphaned_content_records(
            dry_run=dry_run, limit=limit
        )
        results["content_cleanup"] = {
            "success": content_result.success,
            "items_found": content_result.items_found,
            "items_cleaned": content_result.items_cleaned,
            "items_failed": content_result.items_failed,
            "errors": content_result.errors,
        }
        if not content_result.success:
            results["overall_success"] = False

        # Recover stuck jobs
        job_result = await self.recover_stuck_jobs(dry_run=dry_run)
        results["job_recovery"] = {
            "success": job_result.success,
            "jobs_found": job_result.jobs_found,
            "jobs_recovered": job_result.jobs_recovered,
            "jobs_failed": job_result.jobs_failed,
            "errors": job_result.errors,
        }
        if not job_result.success:
            results["overall_success"] = False

        results["completed_at"] = datetime.utcnow().isoformat()

        logger.info(
            f"Full cleanup complete: overall_success={results['overall_success']}"
        )

        return results


# Global integrity service instance
upload_integrity_service = UploadIntegrityService()
