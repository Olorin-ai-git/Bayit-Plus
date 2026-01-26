"""
Per-Item Verification Logic

Orchestrates all verification checks for a single content item.
"""

import logging
from datetime import datetime, timezone

from app.models.content import Content
from app.services.audit_logger import AuditLogger
from app.services.tmdb_service import TMDBService

from .models import VerificationResult
from .verifiers import (
    recalculate_hash,
    rehydrate_metadata_from_tmdb,
    verify_gcs_file,
    verify_metadata_completeness,
    verify_streaming_url,
)

logger = logging.getLogger(__name__)


async def verify_single_content(
    content: Content,
    verify_hashes: bool,
    verify_streaming: bool,
    rehydrate_metadata: bool,
    dry_run: bool,
    tmdb_service: TMDBService,
) -> VerificationResult:
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
        verify_hashes: Enable hash recalculation
        verify_streaming: Enable streaming tests
        rehydrate_metadata: Enable TMDB metadata rehydration
        dry_run: If True, don't save changes
        tmdb_service: TMDB service instance

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
        # 1. Metadata completeness check
        metadata_check = await verify_metadata_completeness(content)
        result.metadata_complete = metadata_check.complete
        result.missing_metadata_fields = metadata_check.missing_fields

        if not metadata_check.complete:
            result.has_warnings = True
            result.warnings.append(
                f"Missing metadata: {', '.join(metadata_check.missing_fields)}"
            )

        # 2. Hash verification (opt-in, expensive)
        if verify_hashes and content.file_hash:
            try:
                recalculated_hash = await recalculate_hash(content.stream_url)
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
                    if not dry_run:
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
        gcs_check = await verify_gcs_file(content)
        result.gcs_exists = gcs_check.exists
        result.gcs_accessible = gcs_check.accessible
        result.gcs_status_code = gcs_check.status_code
        result.gcs_size_matches = gcs_check.size_matches

        if not gcs_check.exists:
            result.has_critical_issues = True
            result.issues.append("GCS file does not exist")

            if not dry_run:
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
        if verify_streaming and result.gcs_accessible:
            try:
                stream_check = await verify_streaming_url(content.stream_url)
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
        if rehydrate_metadata and not metadata_check.complete:
            try:
                rehydration = await rehydrate_metadata_from_tmdb(
                    content, tmdb_service, dry_run
                )
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
