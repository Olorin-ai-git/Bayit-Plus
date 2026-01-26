"""
Library Integrity Verification Service

Zero-trust verification orchestration for media library integrity.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional

from beanie import PydanticObjectId

from app.models.content import Content
from app.services.tmdb_service import TMDBService

from .checkpoint import load_checkpoint, save_checkpoint
from .models import CheckpointData, VerificationResult, VerificationStats
from .verification import verify_single_content

logger = logging.getLogger(__name__)


class LibraryIntegrityService:
    """Zero-trust verification orchestration service."""

    def __init__(
        self,
        batch_size: int = 50,
        concurrency: int = 10,
        verify_hashes: bool = False,
        verify_streaming: bool = False,
        rehydrate_metadata: bool = False,
        dry_run: bool = True,
    ):
        self.batch_size = batch_size
        self.concurrency = concurrency
        self.verify_hashes = verify_hashes
        self.verify_streaming = verify_streaming
        self.rehydrate_metadata = rehydrate_metadata
        self.dry_run = dry_run
        self.tmdb_service = TMDBService()

    async def verify_library(
        self,
        category_filter: Optional[str] = None,
        limit: Optional[int] = None,
        resume_from: Optional[str] = None,
    ) -> VerificationStats:
        """
        Verify complete library integrity with checkpoint/resume support.

        Args:
            category_filter: Optional category ID filter
            limit: Maximum items to process
            resume_from: Path to checkpoint file for resumption

        Returns:
            VerificationStats with comprehensive results
        """
        stats = VerificationStats()
        last_id = None

        # Load checkpoint if resuming
        if resume_from:
            checkpoint = await load_checkpoint(resume_from)
            if checkpoint:
                last_id = checkpoint.last_id
                stats.total_scanned = checkpoint.processed_count
                stats.total_verified = checkpoint.verified_count
                stats.total_issues = checkpoint.issues_count
                stats.critical_issues = checkpoint.critical_count
                logger.info(
                    f"📋 Resuming from checkpoint: {checkpoint.processed_count} items processed"
                )

        try:
            # Build query
            query = {}
            if category_filter:
                query["category_id"] = category_filter
            if last_id:
                query["_id"] = {"$gt": PydanticObjectId(last_id)}

            # Process in batches
            while True:
                # Fetch batch
                contents = await Content.find(query).sort("_id").limit(self.batch_size).to_list()

                if not contents:
                    break

                # Update last_id for next batch
                last_id = str(contents[-1].id)

                # Verify batch
                batch_results = await self.verify_content_batch(contents)

                # Update statistics
                for result in batch_results:
                    if isinstance(result, Exception):
                        logger.error(f"❌ Batch verification error: {result}")
                        continue

                    stats.total_scanned += 1
                    stats.total_verified += 1
                    stats.results.append(result)

                    # Count issue types
                    if result.has_critical_issues:
                        stats.critical_issues += 1
                    if result.has_warnings:
                        stats.total_issues += 1

                    if result.hash_verified and not result.hash_matches:
                        stats.hash_mismatches += 1
                    if not result.gcs_exists:
                        stats.gcs_missing += 1
                    if result.gcs_exists and not result.gcs_accessible:
                        stats.gcs_inaccessible += 1
                    if result.streaming_tested and not result.streaming_works:
                        stats.streaming_failures += 1
                    if not result.metadata_complete:
                        stats.metadata_incomplete += 1
                    if result.metadata_rehydrated:
                        stats.metadata_rehydrated += 1

                # Save checkpoint
                checkpoint_data = CheckpointData(
                    last_id=last_id,
                    processed_count=stats.total_scanned,
                    verified_count=stats.total_verified,
                    issues_count=stats.total_issues,
                    critical_count=stats.critical_issues,
                    start_time=stats.start_time.isoformat(),
                    checkpoint_time=datetime.now(timezone.utc).isoformat(),
                    config={
                        "batch_size": self.batch_size,
                        "concurrency": self.concurrency,
                        "verify_hashes": self.verify_hashes,
                        "verify_streaming": self.verify_streaming,
                        "rehydrate_metadata": self.rehydrate_metadata,
                        "dry_run": self.dry_run,
                        "category_filter": category_filter,
                    },
                )
                await save_checkpoint(checkpoint_data)

                # Check limit
                if limit and stats.total_scanned >= limit:
                    break

            stats.end_time = datetime.now(timezone.utc)
            logger.info(
                f"✅ Verification complete: {stats.total_verified} verified, "
                f"{stats.critical_issues} critical, {stats.total_issues} total issues"
            )

        except KeyboardInterrupt:
            logger.warning("⚠️ Verification interrupted by user")
            stats.end_time = datetime.now(timezone.utc)
            raise

        except Exception as e:
            logger.error(f"❌ Verification failed: {e}", exc_info=True)
            stats.end_time = datetime.now(timezone.utc)
            raise

        return stats

    async def verify_content_batch(
        self, contents: List[Content]
    ) -> List[VerificationResult]:
        """
        Verify a batch of content items with concurrency control.

        Args:
            contents: List of Content items to verify

        Returns:
            List of VerificationResult (or Exception for failures)
        """
        semaphore = asyncio.Semaphore(self.concurrency)

        async def verify_with_limit(content: Content) -> VerificationResult:
            async with semaphore:
                return await verify_single_content(
                    content,
                    self.verify_hashes,
                    self.verify_streaming,
                    self.rehydrate_metadata,
                    self.dry_run,
                    self.tmdb_service,
                )

        results = await asyncio.gather(
            *[verify_with_limit(c) for c in contents], return_exceptions=True
        )

        return results
