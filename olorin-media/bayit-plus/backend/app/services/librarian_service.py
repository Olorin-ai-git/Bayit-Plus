"""
Librarian AI Agent Service
Main orchestrator for daily content auditing and maintenance
"""

import asyncio
import logging
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId

from app.models.content import (Content, LiveChannel, Podcast, PodcastEpisode,
                                RadioStation)
from app.models.content_taxonomy import ContentSection
from app.models.librarian import AuditReport, LibrarianAction
from app.services.audit_task_manager import audit_task_manager

logger = logging.getLogger(__name__)


@dataclass
class AuditScope:
    """Defines the scope of items to audit"""

    content_ids: List[str] = field(default_factory=list)
    live_channel_ids: List[str] = field(default_factory=list)
    podcast_episode_ids: List[str] = field(default_factory=list)
    radio_station_ids: List[str] = field(default_factory=list)
    audit_type: str = "daily_incremental"


@dataclass
class AuditStats:
    """Statistics for a completed audit"""

    total_items: int = 0
    healthy_items: int = 0
    issues_found: int = 0
    issues_fixed: int = 0
    manual_review_needed: int = 0


async def run_daily_audit(
    audit_type: str = "daily_incremental",
    dry_run: bool = False,
    language: str = "en",
    last_24_hours_only: bool = False,
    cyb_titles_only: bool = False,
    tmdb_posters_only: bool = False,
    opensubtitles_enabled: bool = False,
    audit_id: Optional[str] = None,
) -> AuditReport:
    """
    Main entry point for librarian audit.

    Args:
        audit_type: "daily_incremental", "weekly_full", or "manual"
        dry_run: If true, only report issues without fixing
        language: Language code for AI insights (en, es, he)

    Returns:
        Complete AuditReport object

    Workflow:
    1. Determine audit scope (incremental vs full)
    2. Audit all content types in parallel
    3. Perform database maintenance
    4. Generate comprehensive report
    5. Send notifications
    """
    start_time = datetime.now(timezone.utc)
    logger.info("=" * 80)
    logger.info(f"🤖 Starting Librarian AI Agent - {audit_type}")
    logger.info(f"   Dry run: {dry_run}")
    logger.info("=" * 80)

    # Get or create audit report
    if audit_id:
        try:
            # Try to find by _id first (MongoDB ObjectId)
            try:
                object_id = PydanticObjectId(audit_id)
                audit_report = await AuditReport.get(object_id)
            except:
                # If not a valid ObjectId, search by audit_id field
                audit_report = await AuditReport.find_one({"audit_id": audit_id})
        except Exception as e:
            raise ValueError(f"Invalid audit_id format or not found: {e}")
        if not audit_report:
            raise ValueError(f"Audit report with id {audit_id} not found")
        logger.info(f"Using existing audit report: {audit_id}")
    else:
        audit_report = AuditReport(
            audit_type=audit_type,
            status="in_progress",
            audit_date=start_time,
        )
        await audit_report.insert()
        audit_id = str(audit_report.id)
        logger.info(f"Created new audit report: {audit_id}")

    try:
        # Step 1: Determine audit scope
        logger.info("\n📋 Step 1: Determining audit scope...")
        logger.info(
            f"   Filters: last_24_hours={last_24_hours_only}, cyb_titles={cyb_titles_only}, tmdb_only={tmdb_posters_only}"
        )
        scope = await determine_audit_scope(
            audit_type,
            last_24_hours_only=last_24_hours_only,
            cyb_titles_only=cyb_titles_only,
            tmdb_posters_only=tmdb_posters_only,
        )
        logger.info(f"   Content items: {len(scope.content_ids)}")
        logger.info(f"   Live channels: {len(scope.live_channel_ids)}")
        logger.info(f"   Podcast episodes: {len(scope.podcast_episode_ids)}")
        logger.info(f"   Radio stations: {len(scope.radio_station_ids)}")

        # Check for cancellation/pause
        if audit_id:
            await audit_task_manager.check_should_continue(audit_id)

        # Step 2: Audit all content types in parallel
        logger.info("\n🔍 Step 2: Auditing all content types...")

        # Import services here to avoid circular imports
        from app.services.content_auditor import audit_content_items
        from app.services.content_maintenance_tasks import \
            run_content_maintenance_tasks
        from app.services.database_maintenance import \
            perform_database_maintenance
        from app.services.stream_validator import validate_content_streams

        # Run audits and maintenance in parallel
        content_results, stream_results, db_health, maintenance_results = (
            await asyncio.gather(
                audit_content_items(scope.content_ids, audit_report.audit_id, dry_run),
                validate_content_streams(scope, audit_report.audit_id),
                perform_database_maintenance(),
                run_content_maintenance_tasks(dry_run),
                return_exceptions=True,
            )
        )

        # Handle any exceptions
        if isinstance(content_results, Exception):
            logger.error(f"❌ Content audit failed: {content_results}")
            content_results = {"status": "failed", "error": str(content_results)}

        if isinstance(stream_results, Exception):
            logger.error(f"❌ Stream validation failed: {stream_results}")
            stream_results = {"status": "failed", "error": str(stream_results)}

        if isinstance(db_health, Exception):
            logger.error(f"❌ Database maintenance failed: {db_health}")
            db_health = {"status": "failed", "error": str(db_health)}

        if isinstance(maintenance_results, Exception):
            logger.error(f"❌ Content maintenance tasks failed: {maintenance_results}")
            maintenance_results = {
                "status": "failed",
                "error": str(maintenance_results),
            }

        # Check for cancellation/pause
        if audit_id:
            await audit_task_manager.check_should_continue(audit_id)

        # Step 2b: Series-Episode Linking
        logger.info("\n🔗 Step 2b: Series-Episode Linking...")
        try:
            from app.services.series_linker_service import \
                get_series_linker_service

            series_linker = get_series_linker_service()

            linking_results = await series_linker.auto_link_unlinked_episodes(
                limit=50, audit_id=audit_report.audit_id, dry_run=dry_run
            )
            logger.info(f"   Linked {linking_results.get('linked', 0)} episodes")
        except Exception as e:
            logger.error(f"❌ Series linking failed: {e}")
            linking_results = {"status": "failed", "error": str(e)}

        # Check for cancellation/pause
        if audit_id:
            await audit_task_manager.check_should_continue(audit_id)

        # Step 2c: Episode Deduplication
        logger.info("\n🔄 Step 2c: Episode Deduplication...")
        try:
            from app.core.config import settings

            dedup_results = await series_linker.auto_resolve_duplicate_episodes(
                strategy=settings.SERIES_LINKER_DUPLICATE_RESOLUTION_STRATEGY,
                audit_id=audit_report.audit_id,
                dry_run=dry_run,
            )
            logger.info(
                f"   Resolved {dedup_results.get('groups_resolved', 0)} duplicate groups"
            )
        except Exception as e:
            logger.error(f"❌ Episode deduplication failed: {e}")
            dedup_results = {"status": "failed", "error": str(e)}

        # Check for cancellation/pause
        if audit_id:
            await audit_task_manager.check_should_continue(audit_id)

        # Step 2d: Integrity Cleanup
        logger.info("\n🧹 Step 2d: Integrity Cleanup...")
        try:
            from app.services.upload_service.integrity import \
                upload_integrity_service

            integrity_results = await upload_integrity_service.run_full_cleanup(
                dry_run=dry_run, limit=100
            )
            logger.info(
                f"   Integrity cleanup: {integrity_results.get('overall_success', False)}"
            )
        except Exception as e:
            logger.error(f"❌ Integrity cleanup failed: {e}")
            integrity_results = {"status": "failed", "error": str(e)}

        # Check for cancellation/pause
        if audit_id:
            await audit_task_manager.check_should_continue(audit_id)

        # Step 3: Compile results
        logger.info("\n📊 Step 3: Compiling audit results...")
        audit_report.content_results = content_results
        audit_report.database_health = db_health
        audit_report.maintenance_results = maintenance_results

        # Add series linking and integrity results to database health
        if isinstance(db_health, dict):
            db_health["series_linking"] = linking_results
            db_health["episode_deduplication"] = dedup_results
            db_health["integrity_cleanup"] = integrity_results
            db_health["content_maintenance"] = maintenance_results

        # Extract issues from results
        audit_report.broken_streams = stream_results.get("broken_streams", [])
        audit_report.missing_metadata = content_results.get("missing_metadata", [])
        audit_report.misclassifications = content_results.get("misclassifications", [])
        audit_report.orphaned_items = db_health.get("orphaned_items", [])

        # Get actions taken
        actions = await LibrarianAction.find(
            {"audit_id": audit_report.audit_id}
        ).to_list(length=None)

        audit_report.fixes_applied = [
            {
                "action_id": str(action.id),
                "action_type": action.action_type,
                "content_id": action.content_id,
                "description": action.description,
            }
            for action in actions
            if action.auto_approved
        ]

        # Calculate summary stats
        total_issues = (
            len(audit_report.broken_streams)
            + len(audit_report.missing_metadata)
            + len(audit_report.misclassifications)
            + len(audit_report.orphaned_items)
        )

        audit_report.summary = {
            "total_items": len(scope.content_ids)
            + len(scope.live_channel_ids)
            + len(scope.podcast_episode_ids)
            + len(scope.radio_station_ids),
            "issues_found": total_issues,
            "issues_fixed": len(audit_report.fixes_applied),
            "manual_review_needed": len(audit_report.manual_review_needed),
            "healthy_items": (len(scope.content_ids) - total_issues),
        }

        # Check for cancellation/pause
        if audit_id:
            await audit_task_manager.check_should_continue(audit_id)

        # Step 4: Generate AI insights
        logger.info("\n🧠 Step 4: Generating AI insights...")
        try:
            from app.services.content_auditor import generate_ai_insights

            ai_insights = await generate_ai_insights(audit_report, language=language)
            audit_report.ai_insights = ai_insights
        except Exception as e:
            logger.warning(f"⚠️ Failed to generate AI insights: {e}")
            audit_report.ai_insights = []

        # Step 5: Finalize report
        end_time = datetime.now(timezone.utc)
        audit_report.execution_time_seconds = (end_time - start_time).total_seconds()
        audit_report.status = "completed"
        audit_report.completed_at = end_time

        await audit_report.save()

        # Step 6: Send notifications
        logger.info("\n📧 Step 6: Sending notifications...")
        try:
            from app.services.report_generator import send_audit_report

            await send_audit_report(audit_report)
        except Exception as e:
            logger.warning(f"⚠️ Failed to send notifications: {e}")

        # Final summary
        logger.info("\n" + "=" * 80)
        logger.info("✅ Librarian Audit Complete")
        logger.info(f"   Total items checked: {audit_report.summary['total_items']}")
        logger.info(f"   Issues found: {audit_report.summary['issues_found']}")
        logger.info(f"   Issues fixed: {audit_report.summary['issues_fixed']}")
        logger.info(f"   Execution time: {audit_report.execution_time_seconds:.2f}s")
        logger.info("=" * 80 + "\n")

        return audit_report

    except Exception as e:
        logger.error(f"❌ Audit failed: {e}", exc_info=True)
        audit_report.status = "failed"
        audit_report.database_health = {"error": str(e)}
        await audit_report.save()
        raise


async def determine_audit_scope(
    audit_type: str,
    last_24_hours_only: bool = False,
    cyb_titles_only: bool = False,
    tmdb_posters_only: bool = False,
) -> AuditScope:
    """
    Determine which items to audit based on audit type and filters.

    Strategies:
    - daily_incremental: Items modified in last 7 days + random 10% sample
    - weekly_full: All items
    - manual: All items (customizable in future)

    Filters:
    - last_24_hours_only: Only items added/modified in last 24 hours
    - cyb_titles_only: Only titles containing "CYB" (for extraction)
    - tmdb_posters_only: Only items needing TMDB poster/metadata updates
    """
    scope = AuditScope(audit_type=audit_type)
    now = datetime.now(timezone.utc)

    # Build base query filters
    base_query = {"is_published": True}

    # Apply CYB titles filter
    if cyb_titles_only:
        base_query["title"] = {"$regex": "CYB", "$options": "i"}

    # Apply TMDB posters filter (items without poster or missing metadata)
    if tmdb_posters_only:
        base_query["$or"] = [
            {"poster_url": None},
            {"poster_url": ""},
            {"description": None},
            {"description": ""},
        ]

    if audit_type == "daily_incremental":
        # Determine time range based on filters
        if last_24_hours_only:
            time_threshold = now - timedelta(hours=24)
        else:
            time_threshold = now - timedelta(days=7)  # Default: last 7 days

        # Add time filter to base query
        base_query["updated_at"] = {"$gte": time_threshold}

        # Content (VOD, movies, series)
        recent_content = await Content.find(base_query).to_list(length=None)
        scope.content_ids = [str(c.id) for c in recent_content]

        # Add random 10% sample of older items (only if not using specific filters)
        if not (last_24_hours_only or cyb_titles_only or tmdb_posters_only):
            older_query = {"is_published": True, "updated_at": {"$lt": time_threshold}}
            older_content = await Content.find(older_query).to_list(length=None)

            if older_content:
                sample_size = max(1, len(older_content) // 10)  # 10%
                sampled = random.sample(older_content, min(sample_size, len(older_content)))
                scope.content_ids.extend([str(c.id) for c in sampled])

        # Live channels (check all, they're few) - skip if focusing on specific filters
        if not (cyb_titles_only or tmdb_posters_only):
            live_channels = await LiveChannel.find({"is_active": True}).to_list(
                length=None
            )
            scope.live_channel_ids = [str(lc.id) for lc in live_channels]

            # Podcast episodes (recent + sample)
            recent_episodes = await PodcastEpisode.find(
                {"published_at": {"$gte": time_threshold}}
            ).to_list(length=None)
            scope.podcast_episode_ids = [str(ep.id) for ep in recent_episodes]

        # Radio stations (check all, they're few)
        radio_stations = await RadioStation.find({"is_active": True}).to_list(
            length=None
        )
        scope.radio_station_ids = [str(rs.id) for rs in radio_stations]

    elif audit_type in ["weekly_full", "manual"]:
        # Full audit - get all items (with filters applied)
        if last_24_hours_only:
            time_threshold = now - timedelta(hours=24)
            base_query["updated_at"] = {"$gte": time_threshold}

        all_content = await Content.find(base_query).to_list(length=None)
        scope.content_ids = [str(c.id) for c in all_content]

        # Skip other content types if using specific content filters
        if not (cyb_titles_only or tmdb_posters_only):
            all_channels = await LiveChannel.find({"is_active": True}).to_list(
                length=None
            )
            scope.live_channel_ids = [str(lc.id) for lc in all_channels]

            all_episodes = await PodcastEpisode.find({}).to_list(length=None)
            scope.podcast_episode_ids = [str(ep.id) for ep in all_episodes]

        all_radio = await RadioStation.find({"is_active": True}).to_list(length=None)
        scope.radio_station_ids = [str(rs.id) for rs in all_radio]

    return scope


async def get_latest_audit_report() -> Optional[AuditReport]:
    """Get the most recent audit report"""
    reports = (
        await AuditReport.find({"status": "completed"})
        .sort([("audit_date", -1)])
        .limit(1)
        .to_list()
    )

    return reports[0] if reports else None


async def get_audit_statistics(days: int = 30) -> Dict[str, Any]:
    """
    Get audit statistics for the last N days.

    Returns metrics like:
    - Total audits run
    - Average execution time
    - Total issues found
    - Total issues fixed
    - Fix success rate

    Note: Counts both "completed" and "partial" audits since partial audits
    still perform valuable work. Counts actual LibrarianAction records for
    accurate fix counts instead of relying on incomplete summaries.
    """
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Count all audits (completed and partial) - they all did work
    reports = await AuditReport.find({"audit_date": {"$gte": cutoff_date}}).to_list(
        length=None
    )

    if not reports:
        return {
            "period_days": days,
            "total_audits": 0,
            "avg_execution_time": 0,
            "total_issues_found": 0,
            "total_issues_fixed": 0,
            "fix_success_rate": 0,
        }

    # Get audit IDs for action counting
    audit_ids = [r.audit_id for r in reports]

    # Count actual LibrarianAction records instead of relying on summaries
    # This gives us the real count of fixes, even for partial audits
    total_actions = await LibrarianAction.find({"audit_id": {"$in": audit_ids}}).count()

    total_execution_time = sum(
        r.execution_time_seconds for r in reports if r.execution_time_seconds
    )

    # For issues found, we'll try to get from summary, but count actions as minimum
    # Handle case where summary might be None
    total_issues_from_summary = sum(
        (r.summary or {}).get("issues_found", 0) for r in reports
    )
    # If summaries show 0 but we have actions, use action count as estimate
    total_issues = max(total_issues_from_summary, total_actions)

    # Calculate average execution time (handle case where no reports have execution time)
    reports_with_time = [r for r in reports if r.execution_time_seconds]
    avg_execution_time = (
        total_execution_time / len(reports_with_time) if reports_with_time else 0
    )

    return {
        "period_days": days,
        "total_audits": len(reports),
        "avg_execution_time": avg_execution_time,
        "total_issues_found": total_issues,
        "total_issues_fixed": total_actions,  # Use real action count
        "fix_success_rate": (
            (total_actions / total_issues * 100) if total_issues > 0 else 0
        ),
        "last_audit_date": reports[0].audit_date if reports else None,
    }
