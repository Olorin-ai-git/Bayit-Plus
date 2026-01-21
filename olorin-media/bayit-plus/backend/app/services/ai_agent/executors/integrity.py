"""
AI Agent Executors - Integrity Tools

Functions for orphan detection, cleanup, stuck job recovery,
and YouTube link validation.
These wrap the existing upload_integrity_service functionality.
"""

import logging
from typing import Any, Dict, List, Optional

from app.models.content import Content

logger = logging.getLogger(__name__)


async def execute_get_integrity_status() -> Dict[str, Any]:
    """Get a summary of all integrity issues (orphans and stuck jobs)."""
    try:
        from app.services.upload_service.integrity import \
            upload_integrity_service

        status = await upload_integrity_service.get_integrity_status()

        return {
            "success": True,
            "orphaned_gcs_files": status.orphaned_gcs_files,
            "orphaned_content_records": status.orphaned_content_records,
            "stuck_upload_jobs": status.stuck_upload_jobs,
            "stale_hash_locks": status.stale_hash_locks,
            "issues_found": status.issues_found,
            "last_checked": (
                status.last_checked.isoformat() if status.last_checked else None
            ),
            "message": (
                (
                    f"Found {status.orphaned_gcs_files} orphaned GCS files, "
                    f"{status.orphaned_content_records} orphaned content records, "
                    f"{status.stuck_upload_jobs} stuck jobs"
                )
                if status.issues_found
                else "No integrity issues found"
            ),
        }

    except Exception as e:
        logger.error(f"Error getting integrity status: {e}")
        return {"success": False, "error": str(e)}


async def execute_find_orphaned_gcs_files(
    prefix: Optional[str] = None, limit: int = 100
) -> Dict[str, Any]:
    """Find GCS files that have no corresponding Content record."""
    try:
        from app.services.upload_service.integrity import \
            upload_integrity_service

        orphans = await upload_integrity_service.find_orphaned_gcs_files(
            prefix=prefix, limit=limit
        )

        return {
            "success": True,
            "total_found": len(orphans),
            "orphaned_files": [
                {
                    "gcs_path": orphan.gcs_path,
                    "public_url": orphan.public_url,
                    "size_bytes": orphan.size_bytes,
                    "created_at": (
                        orphan.created_at.isoformat() if orphan.created_at else None
                    ),
                }
                for orphan in orphans
            ],
            "message": f"Found {len(orphans)} orphaned GCS files",
        }

    except Exception as e:
        logger.error(f"Error finding orphaned GCS files: {e}")
        return {"success": False, "error": str(e)}


async def execute_find_orphaned_content_records(limit: int = 100) -> Dict[str, Any]:
    """Find Content records whose GCS files no longer exist."""
    try:
        from app.services.upload_service.integrity import \
            upload_integrity_service

        orphans = await upload_integrity_service.find_orphaned_content_records(
            limit=limit
        )

        return {
            "success": True,
            "total_found": len(orphans),
            "orphaned_records": [
                {
                    "content_id": orphan.content_id,
                    "title": orphan.title,
                    "stream_url": orphan.stream_url,
                    "file_hash": orphan.file_hash,
                    "created_at": (
                        orphan.created_at.isoformat() if orphan.created_at else None
                    ),
                }
                for orphan in orphans
            ],
            "message": f"Found {len(orphans)} orphaned Content records",
        }

    except Exception as e:
        logger.error(f"Error finding orphaned content records: {e}")
        return {"success": False, "error": str(e)}


async def execute_find_stuck_upload_jobs(threshold_minutes: int = 30) -> Dict[str, Any]:
    """Find upload jobs stuck in processing state."""
    try:
        from app.services.upload_service.integrity import \
            upload_integrity_service

        stuck_jobs = await upload_integrity_service.find_stuck_upload_jobs(
            threshold_minutes=threshold_minutes
        )

        return {
            "success": True,
            "total_found": len(stuck_jobs),
            "stuck_jobs": [
                {
                    "job_id": job.job_id,
                    "filename": job.filename,
                    "status": job.status,
                    "started_at": (
                        job.started_at.isoformat() if job.started_at else None
                    ),
                    "stuck_minutes": job.stuck_minutes,
                    "current_stage": job.current_stage,
                }
                for job in stuck_jobs
            ],
            "message": f"Found {len(stuck_jobs)} stuck upload jobs (>{threshold_minutes} minutes)",
        }

    except Exception as e:
        logger.error(f"Error finding stuck upload jobs: {e}")
        return {"success": False, "error": str(e)}


async def execute_cleanup_orphans(
    dry_run: bool = True, limit: int = 100, cleanup_type: str = "all"
) -> Dict[str, Any]:
    """
    Clean up orphaned files and records.

    Args:
        dry_run: If True, only report what would be cleaned
        limit: Maximum number of items to clean per category
        cleanup_type: "gcs" for GCS files, "content" for Content records, "all" for both
    """
    try:
        from app.services.upload_service.integrity import \
            upload_integrity_service

        results = {
            "success": True,
            "dry_run": dry_run,
            "gcs_cleanup": None,
            "content_cleanup": None,
        }

        if cleanup_type in ["all", "gcs"]:
            gcs_result = await upload_integrity_service.cleanup_orphaned_gcs_files(
                dry_run=dry_run, limit=limit
            )
            results["gcs_cleanup"] = {
                "success": gcs_result.success,
                "items_found": gcs_result.items_found,
                "items_cleaned": gcs_result.items_cleaned,
                "items_failed": gcs_result.items_failed,
                "errors": gcs_result.errors,
            }
            if not gcs_result.success:
                results["success"] = False

        if cleanup_type in ["all", "content"]:
            content_result = (
                await upload_integrity_service.cleanup_orphaned_content_records(
                    dry_run=dry_run, limit=limit
                )
            )
            results["content_cleanup"] = {
                "success": content_result.success,
                "items_found": content_result.items_found,
                "items_cleaned": content_result.items_cleaned,
                "items_failed": content_result.items_failed,
                "errors": content_result.errors,
            }
            if not content_result.success:
                results["success"] = False

        # Build summary message
        messages = []
        if results["gcs_cleanup"]:
            action = "would clean" if dry_run else "cleaned"
            messages.append(
                f"{action} {results['gcs_cleanup']['items_cleaned']}/{results['gcs_cleanup']['items_found']} GCS files"
            )
        if results["content_cleanup"]:
            action = "would clean" if dry_run else "cleaned"
            messages.append(
                f"{action} {results['content_cleanup']['items_cleaned']}/{results['content_cleanup']['items_found']} Content records"
            )

        results["message"] = "; ".join(messages) if messages else "No cleanup performed"

        return results

    except Exception as e:
        logger.error(f"Error in cleanup_orphans: {e}")
        return {"success": False, "error": str(e)}


async def execute_recover_stuck_jobs(
    dry_run: bool = True, threshold_minutes: int = 30
) -> Dict[str, Any]:
    """Recover stuck upload jobs by marking them as failed and optionally requeuing."""
    try:
        from app.services.upload_service.integrity import \
            upload_integrity_service

        result = await upload_integrity_service.recover_stuck_jobs(
            dry_run=dry_run, threshold_minutes=threshold_minutes
        )

        action = "would recover" if dry_run else "recovered"

        return {
            "success": result.success,
            "dry_run": result.dry_run,
            "jobs_found": result.jobs_found,
            "jobs_recovered": result.jobs_recovered,
            "jobs_failed": result.jobs_failed,
            "errors": result.errors,
            "details": result.details,
            "message": f"{action.capitalize()} {result.jobs_recovered}/{result.jobs_found} stuck jobs",
        }

    except Exception as e:
        logger.error(f"Error recovering stuck jobs: {e}")
        return {"success": False, "error": str(e)}


async def execute_run_full_cleanup(
    dry_run: bool = True, limit: int = 100
) -> Dict[str, Any]:
    """Run a full cleanup of all integrity issues."""
    try:
        from app.services.upload_service.integrity import \
            upload_integrity_service

        result = await upload_integrity_service.run_full_cleanup(
            dry_run=dry_run, limit=limit
        )

        return {
            "success": result["overall_success"],
            "dry_run": result["dry_run"],
            "started_at": result["started_at"],
            "completed_at": result["completed_at"],
            "gcs_cleanup": result["gcs_cleanup"],
            "content_cleanup": result["content_cleanup"],
            "job_recovery": result["job_recovery"],
            "message": (
                "Full cleanup completed"
                if result["overall_success"]
                else "Full cleanup completed with errors"
            ),
        }

    except Exception as e:
        logger.error(f"Error in full cleanup: {e}")
        return {"success": False, "error": str(e)}


async def execute_validate_youtube_links(
    limit: int = 100,
    category_id: Optional[str] = None,
    include_kids: bool = True,
    use_cache: bool = True,
) -> Dict[str, Any]:
    """
    Validate YouTube video links in the content library.

    Checks if YouTube videos are still available, not private, and not removed.
    Uses YouTube oEmbed API for validation (no API key required).

    Args:
        limit: Maximum number of items to validate
        category_id: Optional category filter
        include_kids: Include kids content in validation
        use_cache: Use cached validation results (recommended)

    Returns:
        Validation results with list of broken videos
    """
    try:
        from app.services.youtube_validator import validate_youtube_content

        result = await validate_youtube_content(
            limit=limit,
            category_id=category_id,
            include_kids=include_kids,
            use_cache=use_cache,
        )

        return result

    except Exception as e:
        logger.error(f"Error validating YouTube links: {e}")
        return {"success": False, "error": str(e)}


async def execute_flag_broken_youtube_videos(
    content_ids: List[str], audit_id: Optional[str] = None, dry_run: bool = True
) -> Dict[str, Any]:
    """
    Flag content items with broken YouTube videos for manual review.

    Sets needs_review=True and adds review details for each content item.

    Args:
        content_ids: List of content IDs to flag
        audit_id: Optional audit ID for tracking
        dry_run: If True, only preview what would be flagged

    Returns:
        Summary of flagged items
    """
    try:
        from bson import ObjectId

        flagged = 0
        errors = []
        flagged_items = []

        for content_id in content_ids:
            try:
                content = await Content.get(ObjectId(content_id))
                if not content:
                    errors.append(f"Content not found: {content_id}")
                    continue

                if dry_run:
                    flagged_items.append(
                        {
                            "content_id": content_id,
                            "title": content.title,
                            "would_flag": True,
                        }
                    )
                    flagged += 1
                else:
                    from datetime import datetime

                    content.needs_review = True
                    content.review_reason = "YouTube video is unavailable or broken"
                    content.review_priority = "high"
                    content.review_issue_type = "broken_youtube"
                    content.review_flagged_at = datetime.utcnow()
                    content.updated_at = datetime.utcnow()

                    await content.save()

                    flagged_items.append(
                        {
                            "content_id": content_id,
                            "title": content.title,
                            "flagged": True,
                        }
                    )
                    flagged += 1

                    logger.info(f"Flagged content with broken YouTube: {content.title}")

            except Exception as e:
                errors.append(f"{content_id}: {str(e)}")

        action = "would flag" if dry_run else "flagged"
        return {
            "success": True,
            "dry_run": dry_run,
            "total_processed": len(content_ids),
            "flagged_count": flagged,
            "flagged_items": flagged_items,
            "errors": errors,
            "message": f"{action.capitalize()} {flagged} content items with broken YouTube videos",
        }

    except Exception as e:
        logger.error(f"Error flagging broken YouTube videos: {e}")
        return {"success": False, "error": str(e)}


async def execute_get_youtube_content_stats() -> Dict[str, Any]:
    """
    Get statistics about YouTube content in the library.

    Returns counts of YouTube content by category, kids vs non-kids, etc.
    """
    try:
        from app.services.youtube_validator import is_youtube_url

        # Count total YouTube content
        youtube_query = {
            "is_published": True,
            "$or": [
                {"stream_url": {"$regex": "youtube\\.com|youtu\\.be"}},
                {"trailer_url": {"$regex": "youtube\\.com|youtu\\.be"}},
            ],
        }

        total_youtube = await Content.find(youtube_query).count()

        # Count kids YouTube content
        kids_query = {**youtube_query, "is_kids_content": True}
        kids_youtube = await Content.find(kids_query).count()

        # Count flagged YouTube content
        flagged_query = {
            **youtube_query,
            "needs_review": True,
            "review_issue_type": "broken_youtube",
        }
        flagged_youtube = await Content.find(flagged_query).count()

        # Count YouTube content missing posters
        missing_poster_query = {
            **youtube_query,
            "$or": [
                {"thumbnail": None},
                {"thumbnail": ""},
                {"thumbnail": {"$exists": False}},
            ],
        }
        missing_posters = await Content.find(missing_poster_query).count()

        # Get category breakdown
        pipeline = [
            {"$match": youtube_query},
            {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]

        category_counts = await Content.aggregate(pipeline).to_list()

        return {
            "success": True,
            "total_youtube_content": total_youtube,
            "kids_youtube_content": kids_youtube,
            "non_kids_youtube_content": total_youtube - kids_youtube,
            "flagged_broken_youtube": flagged_youtube,
            "missing_posters": missing_posters,
            "category_breakdown": [
                {"category_id": item["_id"], "count": item["count"]}
                for item in category_counts
            ],
            "message": f"Found {total_youtube} items with YouTube URLs ({kids_youtube} kids, {missing_posters} missing posters)",
        }

    except Exception as e:
        logger.error(f"Error getting YouTube content stats: {e}")
        return {"success": False, "error": str(e)}


async def execute_fix_youtube_posters(
    limit: int = 100,
    category_id: Optional[str] = None,
    include_kids: bool = True,
    dry_run: bool = True,
) -> Dict[str, Any]:
    """
    Fix missing or low-quality posters/thumbnails for YouTube content.

    Fetches high-quality thumbnails from YouTube (maxresdefault or sddefault)
    and updates the thumbnail, backdrop, and poster_url fields.

    Args:
        limit: Maximum number of items to process
        category_id: Optional category filter
        include_kids: Include kids content
        dry_run: If True, only preview what would be fixed

    Returns:
        Summary of fixes applied
    """
    try:
        from app.services.youtube_validator import fix_youtube_thumbnails

        result = await fix_youtube_thumbnails(
            limit=limit,
            category_id=category_id,
            include_kids=include_kids,
            dry_run=dry_run,
        )

        return result

    except Exception as e:
        logger.error(f"Error fixing YouTube posters: {e}")
        return {"success": False, "error": str(e)}


async def execute_find_youtube_missing_posters(
    limit: int = 100, include_kids: bool = True
) -> Dict[str, Any]:
    """
    Find YouTube content items that are missing proper thumbnails/posters.

    Returns a list of items that need poster fixes.

    Args:
        limit: Maximum number of items to return
        include_kids: Include kids content

    Returns:
        List of content items needing poster fixes
    """
    try:
        from app.services.youtube_validator import \
            find_youtube_content_missing_posters

        result = await find_youtube_content_missing_posters(
            limit=limit, include_kids=include_kids
        )

        return result

    except Exception as e:
        logger.error(f"Error finding YouTube missing posters: {e}")
        return {"success": False, "error": str(e)}
