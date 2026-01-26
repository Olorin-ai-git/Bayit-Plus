"""
Library Integrity Service - Zero-Trust Verification System

Provides comprehensive verification of media library integrity:
- Metadata completeness validation
- File hash recalculation and verification
- GCS file existence and accessibility checks
- Streaming URL validation
- TMDB metadata rehydration
- Checkpoint/resume capability for large libraries
"""

import asyncio
import hashlib
import json
import logging
import tempfile
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from beanie import PydanticObjectId

from app.core.config import settings
from app.models.content import Content
from app.services.audit_logger import AuditLogger
from app.services.tmdb_service import TMDBService
from app.services.upload_service.gcs import gcs_uploader

logger = logging.getLogger(__name__)


# ============================================================================
# Data Models
# ============================================================================


@dataclass
class GCSVerificationResult:
    """Result of GCS file verification."""

    exists: bool
    accessible: bool = False
    status_code: Optional[int] = None
    size_matches: bool = False
    expected_size: Optional[int] = None
    actual_size: Optional[int] = None
    error: Optional[str] = None


@dataclass
class MetadataVerificationResult:
    """Result of metadata completeness check."""

    complete: bool
    missing_fields: List[str] = field(default_factory=list)
    stale: bool = False
    last_updated: Optional[datetime] = None


@dataclass
class RehydrationResult:
    """Result of TMDB metadata rehydration."""

    success: bool
    fields_updated: List[str] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class VerificationResult:
    """Complete verification result for a single content item."""

    content_id: str
    title: str
    stream_url: str

    # Metadata check
    metadata_complete: bool
    missing_metadata_fields: List[str] = field(default_factory=list)

    # Hash verification
    hash_verified: bool = False
    hash_matches: bool = False
    expected_hash: Optional[str] = None
    recalculated_hash: Optional[str] = None

    # GCS verification
    gcs_exists: bool = False
    gcs_accessible: bool = False
    gcs_status_code: Optional[int] = None
    gcs_size_matches: bool = False

    # Streaming verification
    streaming_tested: bool = False
    streaming_works: bool = False
    streaming_response_time: Optional[float] = None

    # Rehydration
    metadata_rehydrated: bool = False
    rehydration_fields: List[str] = field(default_factory=list)

    # Overall status
    has_critical_issues: bool = False
    has_warnings: bool = False
    issues: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    # Execution metadata
    verification_time: float = 0.0
    error: Optional[str] = None


@dataclass
class CheckpointData:
    """Checkpoint state for resumption."""

    last_id: Optional[str] = None
    processed_count: int = 0
    verified_count: int = 0
    issues_count: int = 0
    critical_count: int = 0
    start_time: str = ""
    checkpoint_time: str = ""
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VerificationStats:
    """Overall verification statistics."""

    total_scanned: int = 0
    total_verified: int = 0
    total_issues: int = 0
    critical_issues: int = 0
    hash_mismatches: int = 0
    gcs_missing: int = 0
    gcs_inaccessible: int = 0
    streaming_failures: int = 0
    metadata_incomplete: int = 0
    metadata_rehydrated: int = 0
    results: List[VerificationResult] = field(default_factory=list)
    start_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None

    @property
    def duration_seconds(self) -> float:
        """Calculate total duration in seconds."""
        end = self.end_time or datetime.now(timezone.utc)
        return (end - self.start_time).total_seconds()


# ============================================================================
# Main Service
# ============================================================================


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

    # ========================================================================
    # Main Verification Workflow
    # ========================================================================

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

        # Load checkpoint if resuming
        checkpoint = None
        last_id = None
        if resume_from:
            checkpoint = await self.load_checkpoint(resume_from)
            if checkpoint:
                last_id = checkpoint.last_id
                stats.total_scanned = checkpoint.processed_count
                stats.total_verified = checkpoint.verified_count
                stats.total_issues = checkpoint.issues_count
                stats.critical_issues = checkpoint.critical_count
                logger.info(f"📋 Resuming from checkpoint: {checkpoint.processed_count} items processed")

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
                await self.save_checkpoint(checkpoint_data)

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
                return await self.verify_single_content(content)

        results = await asyncio.gather(
            *[verify_with_limit(c) for c in contents], return_exceptions=True
        )

        return results

    # ========================================================================
    # Per-Item Verification
    # ========================================================================

    async def verify_single_content(self, content: Content) -> VerificationResult:
        """
        Verify a single content item with all checks.

        Sequential checks:
        1. Metadata completeness (instant)
        2. Hash verification (expensive, opt-in)
        3. GCS existence check (fast)
        4. GCS accessibility check (fast)
        5. Streaming test (expensive, opt-in)

        Args:
            content: Content item to verify

        Returns:
            VerificationResult with all check outcomes
        """
        start_time = datetime.now(timezone.utc)
        result = VerificationResult(
            content_id=str(content.id),
            title=content.title,
            stream_url=content.stream_url,
            metadata_complete=False,
        )

        try:
            # 1. Metadata completeness check (always run, instant)
            metadata_check = await self.verify_metadata_completeness(content)
            result.metadata_complete = metadata_check.complete
            result.missing_metadata_fields = metadata_check.missing_fields

            if not metadata_check.complete:
                result.has_warnings = True
                result.warnings.append(
                    f"Missing metadata: {', '.join(metadata_check.missing_fields)}"
                )

            # 2. Hash verification (opt-in, expensive)
            if self.verify_hashes and content.file_hash:
                try:
                    recalculated_hash = await self.recalculate_hash(content.stream_url)
                    result.hash_verified = True
                    result.expected_hash = content.file_hash
                    result.recalculated_hash = recalculated_hash
                    result.hash_matches = content.file_hash == recalculated_hash

                    if not result.hash_matches:
                        result.has_critical_issues = True
                        result.issues.append(
                            f"Hash mismatch: expected {content.file_hash[:16]}..., "
                            f"got {recalculated_hash[:16]}..."
                        )

                        # Update hash if not dry-run
                        if not self.dry_run:
                            content.file_hash = recalculated_hash
                            await content.save()
                            await AuditLogger.log_event(
                                event_type="library_integrity_hash_updated",
                                status="success",
                                details=f"Updated hash for: {content.title}",
                                metadata={
                                    "content_id": str(content.id),
                                    "old_hash": content.file_hash,
                                    "new_hash": recalculated_hash,
                                },
                            )

                except Exception as e:
                    result.error = f"Hash verification failed: {str(e)}"
                    logger.error(f"Hash verification failed for {content.title}: {e}")

            # 3. GCS verification
            gcs_check = await self.verify_gcs_file(content)
            result.gcs_exists = gcs_check.exists
            result.gcs_accessible = gcs_check.accessible
            result.gcs_status_code = gcs_check.status_code
            result.gcs_size_matches = gcs_check.size_matches

            if not gcs_check.exists:
                result.has_critical_issues = True
                result.issues.append("GCS file does not exist")

                # Mark for review if not dry-run
                if not self.dry_run:
                    content.needs_review = True
                    await content.save()

            elif not gcs_check.accessible:
                result.has_critical_issues = True
                result.issues.append(
                    f"GCS file not accessible (status: {gcs_check.status_code})"
                )

            elif not gcs_check.size_matches:
                result.has_warnings = True
                result.warnings.append(
                    f"Size mismatch: expected {gcs_check.expected_size}, "
                    f"got {gcs_check.actual_size}"
                )

            # 4. Streaming test (opt-in, expensive)
            if self.verify_streaming and result.gcs_accessible:
                try:
                    stream_check = await self.verify_streaming_url(content.stream_url)
                    result.streaming_tested = True
                    result.streaming_works = stream_check["success"]
                    result.streaming_response_time = stream_check.get("response_time")

                    if not stream_check["success"]:
                        result.has_warnings = True
                        result.warnings.append(
                            f"Streaming failed: {stream_check.get('error')}"
                        )

                except Exception as e:
                    result.streaming_tested = True
                    result.streaming_works = False
                    result.warnings.append(f"Streaming test error: {str(e)}")

            # 5. Metadata rehydration (opt-in)
            if self.rehydrate_metadata and not metadata_check.complete:
                try:
                    rehydration = await self.rehydrate_metadata_from_tmdb(content)
                    result.metadata_rehydrated = rehydration.success
                    result.rehydration_fields = rehydration.fields_updated

                    if rehydration.success:
                        result.metadata_complete = True
                        result.missing_metadata_fields = []

                except Exception as e:
                    logger.error(f"Metadata rehydration failed for {content.title}: {e}")

            # Log verification
            await AuditLogger.log_event(
                event_type="library_integrity_verification",
                status="success" if not result.has_critical_issues else "warning",
                details=f"Verified: {content.title}",
                metadata={
                    "content_id": str(content.id),
                    "has_critical_issues": result.has_critical_issues,
                    "has_warnings": result.has_warnings,
                    "issues": result.issues,
                    "warnings": result.warnings,
                },
            )

        except Exception as e:
            result.error = str(e)
            result.has_critical_issues = True
            result.issues.append(f"Verification error: {str(e)}")
            logger.error(f"Verification failed for {content.title}: {e}", exc_info=True)

        # Calculate verification time
        end_time = datetime.now(timezone.utc)
        result.verification_time = (end_time - start_time).total_seconds()

        return result

    # ========================================================================
    # Individual Verification Methods
    # ========================================================================

    async def verify_metadata_completeness(
        self, content: Content
    ) -> MetadataVerificationResult:
        """
        Validate metadata completeness.

        Required fields:
        - title (always present)
        - description
        - poster_url or thumbnail
        - year
        - stream_url (always present)

        Args:
            content: Content item to check

        Returns:
            MetadataVerificationResult
        """
        missing_fields = []

        if not content.description:
            missing_fields.append("description")
        if not content.poster_url and not content.thumbnail:
            missing_fields.append("poster/thumbnail")
        if not content.year:
            missing_fields.append("year")

        return MetadataVerificationResult(
            complete=len(missing_fields) == 0,
            missing_fields=missing_fields,
            last_updated=content.updated_at if hasattr(content, "updated_at") else None,
        )

    async def recalculate_hash(self, stream_url: str) -> str:
        """
        Recalculate SHA256 hash from GCS file.

        Downloads file and calculates hash in chunks (reuses UploadService pattern).

        Args:
            stream_url: GCS file URL

        Returns:
            SHA256 hash string

        Raises:
            Exception if download or hash calculation fails
        """
        # Extract GCS path from URL
        gcs_path = self._extract_gcs_path(stream_url)

        # Download to temp file
        temp_path = None
        try:
            # Create temp file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".tmp")
            temp_path = temp_file.name
            temp_file.close()

            # Download from GCS
            client = await gcs_uploader.get_client()
            bucket = client.bucket(settings.GCS_BUCKET_NAME)
            blob = bucket.blob(gcs_path)
            blob.download_to_filename(temp_path)

            # Calculate hash (reuse pattern from UploadService)
            sha256_hash = hashlib.sha256()
            with open(temp_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)

            return sha256_hash.hexdigest()

        finally:
            # Cleanup temp file
            if temp_path and Path(temp_path).exists():
                Path(temp_path).unlink()

    async def verify_gcs_file(self, content: Content) -> GCSVerificationResult:
        """
        Verify GCS file existence and accessibility.

        Checks:
        1. File exists in GCS (using gcs_uploader.file_exists())
        2. File accessible via HTTP HEAD request
        3. Content-Length matches database file_size

        Args:
            content: Content item to verify

        Returns:
            GCSVerificationResult
        """
        result = GCSVerificationResult(exists=False)

        try:
            # Extract GCS path from stream URL
            gcs_path = self._extract_gcs_path(content.stream_url)

            # Check existence using gcs_uploader
            exists = await gcs_uploader.file_exists(gcs_path)
            result.exists = exists

            if not exists:
                return result

            # Check accessibility via HTTP HEAD
            async with httpx.AsyncClient() as client:
                response = await client.head(content.stream_url, timeout=5)
                result.status_code = response.status_code
                result.accessible = response.status_code < 400

                # Check size
                if result.accessible and content.file_size:
                    content_length = response.headers.get("Content-Length")
                    if content_length:
                        result.actual_size = int(content_length)
                        result.expected_size = content.file_size
                        result.size_matches = result.actual_size == result.expected_size

        except Exception as e:
            result.error = str(e)
            logger.error(f"GCS verification failed for {content.title}: {e}")

        return result

    async def verify_streaming_url(self, stream_url: str) -> Dict[str, Any]:
        """
        Test streaming URL with Range request.

        Requests first 1MB to validate streaming works.

        Args:
            stream_url: URL to test

        Returns:
            Dict with success, response_time, error
        """
        try:
            start_time = datetime.now(timezone.utc)

            async with httpx.AsyncClient() as client:
                # Request first 1MB with Range header
                headers = {"Range": "bytes=0-1048575"}
                response = await client.get(stream_url, headers=headers, timeout=10)

                end_time = datetime.now(timezone.utc)
                response_time = (end_time - start_time).total_seconds()

                if response.status_code in (200, 206):  # 206 = Partial Content
                    return {"success": True, "response_time": response_time}
                else:
                    return {
                        "success": False,
                        "error": f"Unexpected status: {response.status_code}",
                        "response_time": response_time,
                    }

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def rehydrate_metadata_from_tmdb(
        self, content: Content
    ) -> RehydrationResult:
        """
        Re-fetch metadata from TMDB and update content.

        Args:
            content: Content item to rehydrate

        Returns:
            RehydrationResult with updated fields
        """
        result = RehydrationResult(success=False)
        fields_updated = []

        try:
            # Search TMDB
            if content.is_series:
                tmdb_data = await self.tmdb_service.search_tv_series(
                    content.title, content.year
                )
            else:
                tmdb_data = await self.tmdb_service.search_movie(
                    content.title, content.year
                )

            if not tmdb_data:
                result.error = "No TMDB match found"
                return result

            # Get details
            tmdb_id = tmdb_data.get("id")
            if content.is_series:
                details = await self.tmdb_service.get_tv_series_details(tmdb_id)
            else:
                details = await self.tmdb_service.get_movie_details(tmdb_id)

            if not details:
                result.error = "Failed to fetch TMDB details"
                return result

            # Update fields (only if not dry-run)
            if not self.dry_run:
                if not content.description and details.get("overview"):
                    content.description = details["overview"]
                    fields_updated.append("description")

                if not content.poster_url and details.get("poster_path"):
                    content.poster_url = (
                        f"{self.tmdb_service.IMAGE_BASE_URL}/w500{details['poster_path']}"
                    )
                    fields_updated.append("poster_url")

                if not content.year:
                    if content.is_series and details.get("first_air_date"):
                        year_str = details["first_air_date"][:4]
                        content.year = int(year_str)
                        fields_updated.append("year")
                    elif details.get("release_date"):
                        year_str = details["release_date"][:4]
                        content.year = int(year_str)
                        fields_updated.append("year")

                if fields_updated:
                    await content.save()

            result.success = True
            result.fields_updated = fields_updated

        except Exception as e:
            result.error = str(e)
            logger.error(f"TMDB rehydration failed for {content.title}: {e}")

        return result

    # ========================================================================
    # Checkpoint Management
    # ========================================================================

    async def save_checkpoint(self, checkpoint: CheckpointData) -> None:
        """Save checkpoint to temp file for resumption."""
        try:
            checkpoint_path = Path(tempfile.gettempdir()) / "bayit_library_integrity_checkpoint.json"
            checkpoint_dict = asdict(checkpoint)

            # Atomic write with temp file + rename
            temp_path = checkpoint_path.with_suffix(".tmp")
            with open(temp_path, "w") as f:
                json.dump(checkpoint_dict, f, indent=2)

            temp_path.rename(checkpoint_path)

        except Exception as e:
            logger.error(f"Failed to save checkpoint: {e}", exc_info=True)

    async def load_checkpoint(self, checkpoint_path: str) -> Optional[CheckpointData]:
        """Load checkpoint from file."""
        try:
            path = Path(checkpoint_path)
            if not path.exists():
                logger.warning(f"Checkpoint file not found: {checkpoint_path}")
                return None

            with open(path, "r") as f:
                data = json.load(f)

            return CheckpointData(**data)

        except Exception as e:
            logger.error(f"Failed to load checkpoint: {e}", exc_info=True)
            return None

    # ========================================================================
    # Utilities
    # ========================================================================

    def _extract_gcs_path(self, stream_url: str) -> str:
        """
        Extract GCS path from public URL.

        Args:
            stream_url: Full GCS URL (e.g., https://storage.googleapis.com/bucket/path/file.mp4)

        Returns:
            GCS path (e.g., path/file.mp4)
        """
        # Pattern: https://storage.googleapis.com/{bucket}/{path}
        gcs_pattern = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/"
        if gcs_pattern in stream_url:
            return stream_url.replace(gcs_pattern, "")

        # Fallback: assume everything after last / is the path
        raise ValueError(f"Cannot extract GCS path from URL: {stream_url}")
