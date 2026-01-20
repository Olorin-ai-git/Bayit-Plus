"""
Upload Service - Core service class for upload queue management

Main UploadService class that orchestrates file uploads, queue processing,
and coordinates with GCS, metadata, content, and background modules.
"""

import os
import asyncio
import hashlib
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import uuid4

from beanie.operators import In
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.upload import (
    UploadJob,
    UploadStatus,
    ContentType,
    UploadJobResponse,
    QueueStats,
)
from app.services.tmdb_service import TMDBService

from .gcs import gcs_uploader
from .metadata import metadata_extractor
from .content import content_creator
from .background import background_enricher
from .lock import upload_lock_manager
from .transaction import UploadTransaction

from app.core.exceptions import (
    DuplicateContentError,
    HashLockConflictError,
    TransactionRollbackError,
)

logger = logging.getLogger(__name__)


class UploadService:
    """
    Manages the upload queue and processes file uploads.
    Handles queuing, progress tracking, and uploading to GCS.
    """

    def __init__(self):
        self.processing = False
        self.current_job: Optional[UploadJob] = None
        self.tmdb_service = TMDBService()
        self._lock = asyncio.Lock()
        self._websocket_callback = None
        self._consecutive_credential_failures = 0
        self._queue_paused = False
        self._pause_reason: Optional[str] = None

        # Set up background enricher callback
        background_enricher.set_broadcast_callback(self._broadcast_queue_update)

    def set_websocket_callback(self, callback):
        """Set callback function for WebSocket broadcasts."""
        self._websocket_callback = callback

    def _calculate_file_hash_sync(self, file_path: str) -> str:
        """Calculate SHA256 hash of a file (synchronous)."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    async def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA256 hash asynchronously in executor."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._calculate_file_hash_sync, file_path)

    async def enqueue_upload(
        self,
        source_path: str,
        content_type: ContentType,
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        skip_duplicate_check: bool = True,
    ) -> UploadJob:
        """Add a new file to the upload queue."""
        path = Path(source_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {source_path}")

        file_size = path.stat().st_size

        file_size_gb = file_size / (1024 ** 3)
        if file_size_gb > 10:
            raise ValueError(f"File too large ({file_size_gb:.1f}GB, max 10GB): {path.name}")

        existing_job = await UploadJob.find_one(
            UploadJob.filename == path.name,
            In(UploadJob.status, [UploadStatus.QUEUED, UploadStatus.PROCESSING, UploadStatus.UPLOADING])
        )
        if existing_job:
            logger.warning(f"File with same name already queued: {path.name} (job: {existing_job.job_id})")
            raise ValueError(f"File already in upload queue: {existing_job.filename}")

        job = UploadJob(
            job_id=str(uuid4()),
            type=content_type,
            source_path=str(path.absolute()),
            filename=path.name,
            file_size=file_size,
            file_hash=None,
            status=UploadStatus.QUEUED,
            metadata=metadata or {},
            created_by=user_id,
        )

        await job.insert()
        logger.info(f"Enqueued upload job {job.job_id}: {path.name}")

        await self._broadcast_queue_update()
        asyncio.create_task(self.process_queue())

        return job

    async def enqueue_multiple(
        self,
        file_paths: List[str],
        content_type: ContentType,
        user_id: Optional[str] = None,
    ) -> List[UploadJob]:
        """Enqueue multiple files at once."""
        jobs = []
        for path in file_paths:
            try:
                job = await self.enqueue_upload(path, content_type, user_id=user_id)
                jobs.append(job)
            except Exception as e:
                logger.error(f"Failed to enqueue {path}: {e}")

        logger.info(f"Enqueued {len(jobs)} files in batch")
        return jobs

    async def process_queue(self):
        """Process the upload queue."""
        async with self._lock:
            if self.processing:
                return

            if self._queue_paused:
                logger.warning(f"Queue is paused: {self._pause_reason}")
                return

            self.processing = True

        try:
            while True:
                if self._queue_paused:
                    logger.warning(f"Queue paused during processing: {self._pause_reason}")
                    break

                jobs = await UploadJob.find(
                    UploadJob.status == UploadStatus.QUEUED
                ).sort("+created_at").limit(1).to_list()

                job = jobs[0] if jobs else None

                if not job:
                    break

                self.current_job = job
                await self._process_job(job)
                self.current_job = None

        finally:
            self.processing = False
            await self._broadcast_queue_update()

    async def _process_job(self, job: UploadJob):
        """Process a single upload job with transaction support and rollback."""
        transaction = UploadTransaction(job)
        hash_lock_acquired = False

        try:
            logger.info(f"Processing job {job.job_id}: {job.filename}")

            job.status = UploadStatus.PROCESSING
            job.started_at = datetime.utcnow()
            await job.save()
            await self._broadcast_queue_update()

            # Stage 0: Calculate hash and check for duplicates
            await self._process_hash_stage(job)

            # Stage 0.5: Acquire hash lock to prevent race conditions
            if job.file_hash:
                hash_lock_acquired = await upload_lock_manager.acquire_hash_lock(
                    file_hash=job.file_hash,
                    job_id=job.job_id,
                    timeout_seconds=1800  # 30 minutes for large uploads
                )

                if not hash_lock_acquired:
                    lock_info = await upload_lock_manager.get_lock_info(job.file_hash)
                    blocking_job = lock_info.get("job_id") if lock_info else "unknown"
                    raise HashLockConflictError(job.file_hash, blocking_job)

                # Re-check for duplicates after acquiring lock (double-check pattern)
                client = AsyncIOMotorClient(settings.MONGODB_URL)
                db = client[settings.MONGODB_DB_NAME]
                existing_content = await db.content.find_one({'file_hash': job.file_hash})
                if existing_content:
                    existing_title = existing_content.get('title', job.filename)
                    raise DuplicateContentError(job.file_hash, existing_title)

            # Stage 1: Extract metadata
            await self._process_metadata_stage(job)

            # Stage 1.5: Schedule subtitle extraction for video content
            if job.type == ContentType.MOVIE and os.path.exists(job.source_path):
                job.stages["subtitle_extraction"] = "scheduled"
                job.metadata["local_source_path"] = job.source_path
                await job.save()
                logger.info(f"Subtitle extraction scheduled for background: {job.source_path}")

            # Stage 2: Upload to GCS with compensation
            await transaction.execute_with_compensation(
                action=lambda: self._process_upload_stage(job),
                compensation=lambda: self._compensate_gcs_upload(job),
                action_name="gcs_upload"
            )

            # Stage 3: Create content entry in database with compensation
            await transaction.execute_with_compensation(
                action=lambda: self._process_database_stage(job),
                compensation=lambda: self._compensate_database_insert(job),
                action_name="database_insert"
            )

            # All stages successful - commit transaction
            await transaction.commit()

            # Mark as completed
            job.status = UploadStatus.COMPLETED
            job.progress = 100.0
            job.completed_at = datetime.utcnow()
            await job.save()
            await self._broadcast_queue_update()

            logger.info(f"Job {job.job_id} completed successfully")

            # Schedule non-critical enrichment stages
            await self._schedule_enrichment_tasks(job)

        except Exception as e:
            await self._handle_job_failure(job, e, transaction)

        finally:
            # Always release hash lock
            if hash_lock_acquired and job.file_hash:
                await upload_lock_manager.release_hash_lock(job.file_hash, job.job_id)

            await self._broadcast_queue_update()

    async def _compensate_gcs_upload(self, job: UploadJob) -> bool:
        """Compensation action: Delete uploaded GCS file."""
        if job.gcs_path:
            logger.info(f"Compensating: Deleting GCS file {job.gcs_path}")
            return await gcs_uploader.delete_file(job.gcs_path)
        return True  # Nothing to delete

    async def _compensate_database_insert(self, job: UploadJob) -> bool:
        """Compensation action: Delete created Content record."""
        content_id = job.metadata.get('content_id')
        if content_id:
            try:
                from app.models.content import Content
                from bson import ObjectId

                logger.info(f"Compensating: Deleting Content record {content_id}")
                content = await Content.find_one(Content.id == ObjectId(content_id))
                if content:
                    await content.delete()
                    logger.info(f"Deleted Content record {content_id}")
                return True
            except Exception as e:
                logger.error(f"Failed to delete Content record {content_id}: {e}")
                return False
        return True  # Nothing to delete

    async def _process_hash_stage(self, job: UploadJob):
        """Calculate hash and check for duplicates."""
        if job.file_hash is not None:
            return

        # Validate file exists before attempting hash calculation
        if not os.path.exists(job.source_path):
            raise FileNotFoundError(f"Source file not found: {job.source_path}")

        pre_calculated_hash = job.metadata.get('pre_calculated_hash')

        if pre_calculated_hash:
            logger.info(f"Using cached hash for {job.filename}: {pre_calculated_hash[:16]}...")
            job.file_hash = pre_calculated_hash
            job.stages["hash_calculation"] = "completed"
            job.progress = 10.0
            await job.save()
            await self._broadcast_queue_update()
        else:
            job.stages["hash_calculation"] = "in_progress"
            job.stage_timings["hash_calculation"] = {"started": datetime.utcnow().isoformat()}
            job.progress = 5.0
            await job.save()
            await self._broadcast_queue_update()

            logger.info(f"Calculating hash in background for {job.filename}...")
            hash_start_time = datetime.utcnow()
            job.file_hash = await self._calculate_file_hash(job.source_path)
            hash_duration = (datetime.utcnow() - hash_start_time).total_seconds()
            logger.info(f"Hash calculated: {job.file_hash[:16]}...")

            job.stages["hash_calculation"] = "completed"
            job.stage_timings["hash_calculation"]["completed"] = datetime.utcnow().isoformat()
            job.stage_timings["hash_calculation"]["duration_seconds"] = round(hash_duration, 2)
            job.progress = 10.0
            await job.save()
            await self._broadcast_queue_update()

        # Check for duplicates
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.MONGODB_DB_NAME]

        existing_content = await db.content.find_one({'file_hash': job.file_hash})
        if existing_content:
            logger.warning(f"Duplicate file detected: {job.filename} (hash: {job.file_hash[:16]}...)")
            job.status = UploadStatus.FAILED
            job.error_message = f"Duplicate: Already in library as '{existing_content.get('title', job.filename)}'"
            job.completed_at = datetime.utcnow()
            await job.save()
            await self._broadcast_queue_update()
            raise ValueError("Duplicate content detected")

        await job.save()
        await self._broadcast_queue_update()

    async def _process_metadata_stage(self, job: UploadJob):
        """Extract metadata from file."""
        job.stages["metadata_extraction"] = "in_progress"
        job.stage_timings["metadata_extraction"] = {"started": datetime.utcnow().isoformat()}
        job.progress = 15.0
        await job.save()
        await self._broadcast_queue_update()

        metadata_start_time = datetime.utcnow()
        if job.type == ContentType.MOVIE:
            metadata = await metadata_extractor.extract_movie_metadata(job)
        elif job.type == ContentType.SERIES:
            metadata = await metadata_extractor.extract_series_metadata(job)
        elif job.type == ContentType.PODCAST:
            metadata = await metadata_extractor.extract_podcast_metadata(job)
        else:
            metadata = {}
        metadata_duration = (datetime.utcnow() - metadata_start_time).total_seconds()

        job.metadata.update(metadata)
        job.stages["metadata_extraction"] = "completed"
        job.stage_timings["metadata_extraction"]["completed"] = datetime.utcnow().isoformat()
        job.stage_timings["metadata_extraction"]["duration_seconds"] = round(metadata_duration, 2)
        job.progress = 20.0
        await job.save()
        await self._broadcast_queue_update()

    async def _process_upload_stage(self, job: UploadJob):
        """Upload file to GCS."""
        job.status = UploadStatus.UPLOADING
        job.stages["gcs_upload"] = "in_progress"
        job.stage_timings["gcs_upload"] = {"started": datetime.utcnow().isoformat()}
        await job.save()
        await self._broadcast_queue_update()

        gcs_start_time = datetime.utcnow()
        destination_url = await gcs_uploader.upload_file(
            job,
            on_progress=lambda p, b, s, e: self._broadcast_queue_update()
        )
        gcs_duration = (datetime.utcnow() - gcs_start_time).total_seconds()

        if not destination_url:
            raise Exception("GCS upload failed")

        job.destination_url = destination_url
        job.stages["gcs_upload"] = "completed"
        job.stage_timings["gcs_upload"]["completed"] = datetime.utcnow().isoformat()
        job.stage_timings["gcs_upload"]["duration_seconds"] = round(gcs_duration, 2)
        await job.save()

    async def _process_database_stage(self, job: UploadJob):
        """Create content entry in database."""
        job.stages["database_insert"] = "in_progress"
        job.stage_timings["database_insert"] = {"started": datetime.utcnow().isoformat()}
        job.progress = 96.0
        await job.save()
        await self._broadcast_queue_update()

        db_start_time = datetime.utcnow()
        await content_creator.create_entry(job)
        db_duration = (datetime.utcnow() - db_start_time).total_seconds()

        job.stages["database_insert"] = "completed"
        job.stage_timings["database_insert"]["completed"] = datetime.utcnow().isoformat()
        job.stage_timings["database_insert"]["duration_seconds"] = round(db_duration, 2)
        job.progress = 98.0
        await job.save()
        await self._broadcast_queue_update()

    async def _schedule_enrichment_tasks(self, job: UploadJob):
        """Schedule non-critical background enrichment tasks."""
        if job.type == ContentType.MOVIE and job.metadata.get("content_id"):
            job.stages["imdb_lookup"] = "scheduled"
            await job.save()
            asyncio.create_task(background_enricher.fetch_imdb_info(
                job.metadata.get("content_id"),
                job.job_id
            ))
        else:
            job.stages["imdb_lookup"] = "skipped"
            await job.save()

        if job.stages.get("subtitle_extraction") == "scheduled" and job.metadata.get("local_source_path"):
            asyncio.create_task(background_enricher.extract_subtitles(
                job.metadata.get("content_id"),
                job.metadata.get("local_source_path"),
                job.job_id
            ))
        elif job.type != ContentType.MOVIE:
            job.stages["subtitle_extraction"] = "skipped"
            await job.save()

        await self._broadcast_queue_update()

    async def _handle_job_failure(
        self,
        job: UploadJob,
        error: Exception,
        transaction: UploadTransaction = None
    ):
        """Handle job failure with rollback and retry logic."""
        logger.error(f"Job {job.job_id} failed: {error}", exc_info=True)

        # Perform transaction rollback if there are compensations registered
        rollback_result = None
        if transaction and transaction.is_active and transaction.get_compensation_count() > 0:
            logger.info(
                f"Initiating rollback for job {job.job_id} with "
                f"{transaction.get_compensation_count()} compensation actions"
            )
            rollback_result = await transaction.rollback()

            if not rollback_result.success:
                logger.error(
                    f"Rollback partially failed for job {job.job_id}: "
                    f"{rollback_result.actions_failed}/{rollback_result.actions_attempted} failed"
                )
                # Store rollback failure info in job metadata for debugging
                job.metadata['rollback_result'] = {
                    'success': rollback_result.success,
                    'actions_attempted': rollback_result.actions_attempted,
                    'actions_succeeded': rollback_result.actions_succeeded,
                    'actions_failed': rollback_result.actions_failed,
                    'errors': rollback_result.errors,
                }
            else:
                logger.info(
                    f"Rollback successful for job {job.job_id}: "
                    f"{rollback_result.actions_succeeded}/{rollback_result.actions_attempted} succeeded"
                )

        job.status = UploadStatus.FAILED
        job.error_message = str(error)
        job.retry_count += 1
        job.completed_at = datetime.utcnow()
        await job.save()

        # Check for specific error types that should not be retried
        is_duplicate_error = isinstance(error, DuplicateContentError)
        is_lock_conflict = isinstance(error, HashLockConflictError)
        is_file_not_found = isinstance(error, FileNotFoundError)
        is_credential_error = self._is_credential_error(error)

        if is_duplicate_error:
            # Duplicate errors should not be retried
            logger.info(f"Job {job.job_id} failed due to duplicate content - not retrying")
            return

        if is_file_not_found:
            # File not found errors should not be retried - file is missing/deleted
            logger.error(
                f"Job {job.job_id} failed because source file is missing: {job.source_path}. "
                "This may be due to an unmounted drive or deleted file - not retrying"
            )
            job.error_message = f"Source file not found: {job.source_path}. File may have been deleted or drive unmounted."
            await job.save()
            return

        if is_lock_conflict:
            # Lock conflicts could be retried after a delay
            if job.retry_count < job.max_retries:
                job.status = UploadStatus.QUEUED
                await job.save()
                logger.info(
                    f"Job {job.job_id} requeued after lock conflict "
                    f"({job.retry_count}/{job.max_retries})"
                )
            return

        if is_credential_error:
            self._consecutive_credential_failures += 1
            logger.warning(f"Credential failure detected ({self._consecutive_credential_failures}/3)")

            if self._consecutive_credential_failures >= 3:
                self._queue_paused = True
                self._pause_reason = "GCS credentials not configured or invalid. Please check GOOGLE_APPLICATION_CREDENTIALS environment variable."
                logger.error(f"QUEUE PAUSED: {self._pause_reason}")

                await self._notify_queue_paused()
                return
        else:
            self._consecutive_credential_failures = 0

        # Retry if not a permanent failure
        if job.retry_count < job.max_retries:
            job.status = UploadStatus.QUEUED
            await job.save()
            logger.info(f"Job {job.job_id} requeued for retry ({job.retry_count}/{job.max_retries})")

    def _is_credential_error(self, error: Exception) -> bool:
        """Check if error is related to GCS credentials."""
        error_str = str(error).lower()
        error_type = type(error).__name__

        credential_indicators = [
            "defaultcredentialserror",
            "credentials were not found",
            "could not automatically determine credentials",
            "application default credentials",
            "google.auth.exceptions",
            "authentication failed",
            "invalid credentials",
            "permission denied",
        ]

        return any(indicator in error_str for indicator in credential_indicators) or \
               "DefaultCredentialsError" in error_type

    async def _notify_queue_paused(self):
        """Notify about queue pause and update stats."""
        try:
            logger.error(f"Upload queue paused after 3 consecutive credential failures")
            logger.error(f"Reason: {self._pause_reason}")
            logger.error(f"Solution: Configure GOOGLE_APPLICATION_CREDENTIALS environment variable")

            await self._broadcast_queue_update()

        except Exception as e:
            logger.error(f"Error notifying queue pause: {e}")

    async def get_queue(self) -> List[UploadJob]:
        """Get all queued jobs."""
        return await UploadJob.find(
            UploadJob.status == UploadStatus.QUEUED
        ).sort("+created_at").to_list()

    async def get_active_job(self) -> Optional[UploadJob]:
        """Get currently processing job."""
        return await UploadJob.find_one(
            In(UploadJob.status, [UploadStatus.PROCESSING, UploadStatus.UPLOADING])
        )

    async def get_recent_completed(self, limit: int = 10) -> List[UploadJob]:
        """Get recently completed jobs."""
        return await UploadJob.find(
            In(UploadJob.status, [UploadStatus.COMPLETED, UploadStatus.FAILED, UploadStatus.CANCELLED])
        ).sort("-completed_at").limit(limit).to_list()

    async def get_job(self, job_id: str) -> Optional[UploadJob]:
        """Get a specific job by ID."""
        return await UploadJob.find_one(UploadJob.job_id == job_id)

    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a job."""
        job = await self.get_job(job_id)

        if not job:
            return False

        if job.status in [UploadStatus.COMPLETED, UploadStatus.FAILED, UploadStatus.CANCELLED]:
            return False

        job.status = UploadStatus.CANCELLED
        job.error_message = "Cancelled by user"
        await job.save()

        logger.info(f"Cancelled job {job_id}")
        await self._broadcast_queue_update()

        return True

    async def clear_queue(self) -> dict:
        """Clear the upload queue by cancelling all queued and processing jobs."""
        active_jobs = await UploadJob.find(
            In(UploadJob.status, [UploadStatus.QUEUED, UploadStatus.PROCESSING, UploadStatus.UPLOADING])
        ).to_list()

        cancelled_count = 0
        for job in active_jobs:
            job.status = UploadStatus.CANCELLED
            job.error_message = "Cancelled by queue clear"
            await job.save()
            cancelled_count += 1

        logger.info(f"Cleared upload queue: {cancelled_count} jobs cancelled")
        await self._broadcast_queue_update()

        return {
            "success": True,
            "cancelled_count": cancelled_count,
            "message": f"Cleared {cancelled_count} job(s) from queue"
        }

    async def resume_queue(self):
        """Resume the paused queue."""
        if self._queue_paused:
            self._queue_paused = False
            self._pause_reason = None
            self._consecutive_credential_failures = 0
            logger.info("Upload queue resumed")

            await self.process_queue()

    async def get_queue_stats(self) -> QueueStats:
        """Get statistics about the queue."""
        failed_and_cancelled = await UploadJob.find(
            In(UploadJob.status, [UploadStatus.FAILED, UploadStatus.CANCELLED])
        ).to_list()

        skipped_count = 0
        actual_failed_count = 0

        for job in failed_and_cancelled:
            if job.error_message:
                error_lower = job.error_message.lower()
                if ('duplicate' in error_lower or
                    'already in library' in error_lower or
                    'already exists' in error_lower):
                    skipped_count += 1
                else:
                    actual_failed_count += 1
            else:
                actual_failed_count += 1

        stats = QueueStats(
            total_jobs=await UploadJob.count(),
            queued=await UploadJob.find(UploadJob.status == UploadStatus.QUEUED).count(),
            processing=await UploadJob.find(In(UploadJob.status, [UploadStatus.PROCESSING, UploadStatus.UPLOADING])).count(),
            completed=await UploadJob.find(UploadJob.status == UploadStatus.COMPLETED).count(),
            failed=actual_failed_count,
            cancelled=0,
            skipped=skipped_count,
            total_size_bytes=0,
            uploaded_bytes=0,
        )

        return stats

    def _job_to_response(self, job: UploadJob) -> UploadJobResponse:
        """Convert UploadJob to UploadJobResponse with current_stage and stages."""
        response = UploadJobResponse.from_orm(job)
        response.current_stage = job.get_current_stage()
        response.stages = job.stages or {}
        return response

    async def _broadcast_queue_update(self):
        """Broadcast queue update via WebSocket."""
        if self._websocket_callback:
            try:
                stats = await self.get_queue_stats()
                active_job = await self.get_active_job()
                queue = await self.get_queue()
                recent = await self.get_recent_completed(5)

                message = {
                    "type": "queue_update",
                    "stats": stats.model_dump(mode='json'),
                    "active_job": self._job_to_response(active_job).model_dump(mode='json') if active_job else None,
                    "queue": [self._job_to_response(j).model_dump(mode='json') for j in queue],
                    "recent_completed": [self._job_to_response(j).model_dump(mode='json') for j in recent],
                    "queue_paused": self._queue_paused,
                    "pause_reason": self._pause_reason,
                }

                await self._websocket_callback(message)
            except Exception as e:
                logger.error(f"Failed to broadcast queue update: {e}")
