"""
Content Maintenance Tasks Service
Orchestrates daily content library maintenance operations
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.models.content import Content, Podcast, PodcastEpisode
from app.services.auto_fixer.metadata_fixer import fix_missing_metadata
from app.services.external_subtitle_service import ExternalSubtitleService
from app.services.podcast_sync import sync_all_podcasts
from app.services.podcast_translation_service import PodcastTranslationService
from app.services.tmdb_service import TMDBService

logger = logging.getLogger(__name__)


async def run_content_maintenance_tasks(dry_run: bool = False) -> Dict[str, Any]:
    """
    Run all content maintenance tasks as part of daily librarian audit.

    Tasks:
    1. Podcast RSS Sync - Fetch latest episodes
    2. Attach Posters - Enrich metadata from TMDB
    3. Add Subtitles - Extract/fetch missing subtitles
    4. Translate Podcasts - Queue pending translations

    Args:
        dry_run: If true, only report what would be done without making changes

    Returns:
        Detailed report of all maintenance operations
    """
    logger.info("🔧 Starting content maintenance tasks...")
    start_time = datetime.now(timezone.utc)

    results = {
        "status": "completed",
        "start_time": start_time.isoformat(),
        "tasks": {},
        "total_updates": 0,
        "dry_run": dry_run,
    }

    try:
        # Task 1: Sync Podcast RSS Feeds
        logger.info("\n📻 Task 1/4: Syncing podcast RSS feeds...")
        podcast_sync_results = await sync_podcast_feeds(dry_run)
        results["tasks"]["podcast_sync"] = podcast_sync_results
        results["total_updates"] += podcast_sync_results.get("episodes_added", 0)

        # Task 2: Attach Posters & Enrich Metadata
        logger.info("\n🖼️  Task 2/4: Attaching posters and enriching metadata...")
        poster_results = await attach_posters_and_enrich(dry_run)
        results["tasks"]["poster_attachment"] = poster_results
        results["total_updates"] += poster_results.get("items_enriched", 0)

        # Task 3: Add Missing Subtitles
        logger.info("\n📝 Task 3/4: Adding missing subtitles...")
        subtitle_results = await add_missing_subtitles(dry_run)
        results["tasks"]["subtitle_addition"] = subtitle_results
        results["total_updates"] += subtitle_results.get("subtitles_added", 0)

        # Task 4: Queue Podcast Translations
        logger.info("\n🌐 Task 4/4: Queueing podcast translations...")
        translation_results = await queue_podcast_translations(dry_run)
        results["tasks"]["podcast_translation"] = translation_results
        results["total_updates"] += translation_results.get("episodes_queued", 0)

        # Summary
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()

        results["end_time"] = end_time.isoformat()
        results["duration_seconds"] = duration

        logger.info(f"\n✅ Content maintenance tasks completed in {duration:.2f}s")
        logger.info(f"   Total updates: {results['total_updates']}")
        logger.info(
            f"   Podcast sync: {podcast_sync_results.get('episodes_added', 0)} episodes"
        )
        logger.info(
            f"   Posters: {poster_results.get('items_enriched', 0)} items enriched"
        )
        logger.info(f"   Subtitles: {subtitle_results.get('subtitles_added', 0)} added")
        logger.info(
            f"   Translations: {translation_results.get('episodes_queued', 0)} queued"
        )

        return results

    except Exception as e:
        logger.error(f"❌ Content maintenance tasks failed: {e}")
        results["status"] = "failed"
        results["error"] = str(e)
        return results


async def sync_podcast_feeds(dry_run: bool = False) -> Dict[str, Any]:
    """
    Sync all active podcast RSS feeds to fetch latest episodes.

    Returns:
        Dict with sync results including episodes added
    """
    try:
        if dry_run:
            # Count episodes that would be synced
            podcasts = await Podcast.find(
                {"is_active": True, "rss_feed": {"$exists": True, "$ne": None}}
            ).to_list()

            return {
                "status": "dry_run",
                "podcasts_found": len(podcasts),
                "episodes_added": 0,
                "message": f"Would sync {len(podcasts)} podcasts",
            }

        # Run actual sync
        sync_result = await sync_all_podcasts(max_episodes=20)

        return {
            "status": "completed",
            "podcasts_synced": sync_result.get("synced", 0),
            "episodes_added": sync_result.get("total_episodes", 0),
            "total_podcasts": sync_result.get("total", 0),
        }

    except Exception as e:
        logger.error(f"Podcast sync failed: {e}")
        return {"status": "failed", "error": str(e), "episodes_added": 0}


async def attach_posters_and_enrich(
    dry_run: bool = False, batch_size: int = 20
) -> Dict[str, Any]:
    """
    Attach missing posters and enrich metadata from TMDB for VOD content.

    Returns:
        Dict with enrichment results
    """
    try:
        # Find VOD content missing posters or metadata
        query = {
            "is_published": True,
            "$or": [
                {"poster_url": None},
                {"poster_url": ""},
                {"poster_url": {"$exists": False}},
                {"description": None},
                {"description": ""},
                {"imdb_rating": None},
            ],
        }

        items = await Content.find(query).limit(batch_size).to_list()

        if not items:
            return {
                "status": "completed",
                "items_found": 0,
                "items_enriched": 0,
                "message": "No items needing enrichment",
            }

        if dry_run:
            return {
                "status": "dry_run",
                "items_found": len(items),
                "items_enriched": 0,
                "message": f"Would enrich {len(items)} items",
            }

        # Enrich each item using TMDB
        tmdb = TMDBService()
        enriched_count = 0

        for item in items:
            try:
                # Use existing metadata fixer service
                result = await fix_missing_metadata(str(item.id))

                if result.get("success") and result.get("fixed"):
                    enriched_count += 1
                    logger.info(
                        f"   ✅ Enriched: {item.title} - "
                        f"Fields: {', '.join(result.get('fields_updated', []))}"
                    )

            except Exception as e:
                logger.warning(f"   ⚠️  Failed to enrich {item.title}: {e}")
                continue

        return {
            "status": "completed",
            "items_found": len(items),
            "items_enriched": enriched_count,
            "items_failed": len(items) - enriched_count,
        }

    except Exception as e:
        logger.error(f"Poster attachment failed: {e}")
        return {"status": "failed", "error": str(e), "items_enriched": 0}


async def add_missing_subtitles(
    dry_run: bool = False, batch_size: int = 10
) -> Dict[str, Any]:
    """
    Add missing subtitles using embedded extraction or OpenSubtitles.

    Returns:
        Dict with subtitle addition results
    """
    try:
        # Find content missing subtitles
        # For now, focus on embedded subtitle extraction
        query = {
            "is_published": True,
            "embedded_subtitle_count": {"$gt": 0},
            "subtitles_extracted": {"$ne": True},
        }

        items = await Content.find(query).limit(batch_size).to_list()

        if not items:
            return {
                "status": "completed",
                "items_found": 0,
                "subtitles_added": 0,
                "message": "No items needing subtitles",
            }

        if dry_run:
            total_tracks = sum(
                item.embedded_subtitle_count
                for item in items
                if item.embedded_subtitle_count
            )
            return {
                "status": "dry_run",
                "items_found": len(items),
                "potential_tracks": total_tracks,
                "subtitles_added": 0,
                "message": f"Would extract subtitles from {len(items)} items",
            }

        # Extract subtitles using existing service
        subtitles_added = 0

        for item in items:
            try:
                # Import here to avoid circular dependency
                from app.services.subtitle_extraction_service import \
                    analyze_and_extract_subtitles

                result = await analyze_and_extract_subtitles(
                    str(item.id), item.stream_url
                )

                if result.get("success"):
                    subtitles_added += result.get("tracks_extracted", 0)
                    logger.info(
                        f"   ✅ Extracted {result.get('tracks_extracted', 0)} "
                        f"subtitle tracks from: {item.title}"
                    )

            except Exception as e:
                logger.warning(
                    f"   ⚠️  Failed to extract subtitles from {item.title}: {e}"
                )
                continue

        return {
            "status": "completed",
            "items_found": len(items),
            "subtitles_added": subtitles_added,
        }

    except Exception as e:
        logger.error(f"Subtitle addition failed: {e}")
        return {"status": "failed", "error": str(e), "subtitles_added": 0}


async def queue_podcast_translations(
    dry_run: bool = False, batch_size: int = 5
) -> Dict[str, Any]:
    """
    Queue pending podcast episodes for translation.

    Returns:
        Dict with translation queuing results
    """
    try:
        # Find episodes pending translation
        query = {"translation_status": "pending"}

        episodes = await PodcastEpisode.find(query).limit(batch_size).to_list()

        if not episodes:
            return {
                "status": "completed",
                "episodes_found": 0,
                "episodes_queued": 0,
                "message": "No episodes pending translation",
            }

        if dry_run:
            return {
                "status": "dry_run",
                "episodes_found": len(episodes),
                "episodes_queued": 0,
                "message": f"Would queue {len(episodes)} episodes for translation",
            }

        # Queue episodes for translation
        # Translation worker will pick them up automatically
        queued_count = 0

        for episode in episodes:
            try:
                # Just ensure status is set correctly
                # The background worker handles actual translation
                if episode.translation_status == "pending":
                    queued_count += 1
                    logger.info(f"   ✅ Queued for translation: {episode.title}")

            except Exception as e:
                logger.warning(f"   ⚠️  Failed to queue {episode.title}: {e}")
                continue

        return {
            "status": "completed",
            "episodes_found": len(episodes),
            "episodes_queued": queued_count,
            "message": "Translation worker will process queued episodes",
        }

    except Exception as e:
        logger.error(f"Podcast translation queuing failed: {e}")
        return {"status": "failed", "error": str(e), "episodes_queued": 0}


async def get_maintenance_summary() -> Dict[str, Any]:
    """
    Get summary of content needing maintenance.

    Returns:
        Dict with counts of items needing each type of maintenance
    """
    try:
        # Count items needing each type of maintenance
        vod_missing_posters = await Content.find(
            {
                "is_published": True,
                "$or": [
                    {"poster_url": None},
                    {"poster_url": ""},
                    {"poster_url": {"$exists": False}},
                ],
            }
        ).count()

        vod_missing_subtitles = await Content.find(
            {
                "is_published": True,
                "embedded_subtitle_count": {"$gt": 0},
                "subtitles_extracted": {"$ne": True},
            }
        ).count()

        podcasts_with_rss = await Podcast.find(
            {"is_active": True, "rss_feed": {"$exists": True, "$ne": None}}
        ).count()

        episodes_pending_translation = await PodcastEpisode.find(
            {"translation_status": "pending"}
        ).count()

        return {
            "vod_missing_posters": vod_missing_posters,
            "vod_missing_subtitles": vod_missing_subtitles,
            "podcasts_with_rss": podcasts_with_rss,
            "episodes_pending_translation": episodes_pending_translation,
        }

    except Exception as e:
        logger.error(f"Failed to get maintenance summary: {e}")
        return {
            "vod_missing_posters": 0,
            "vod_missing_subtitles": 0,
            "podcasts_with_rss": 0,
            "episodes_pending_translation": 0,
            "error": str(e),
        }
