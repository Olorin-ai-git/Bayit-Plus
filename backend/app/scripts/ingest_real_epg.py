"""
Real EPG Ingestion Script
Fetches real EPG data from TVmaze for US channels.

This script:
1. Cleans up any template-based mock EPG entries
2. Ingests real EPG data from TVmaze API
3. Reports on data sources and coverage

Usage:
    cd backend
    poetry run python -m app.scripts.ingest_real_epg
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.core.database import connect_to_mongo
from app.models.content import EPGEntry, LiveChannel
from app.services.tvmaze_epg_service import tvmaze_epg_service
from app.services.israeli_epg_service import israeli_epg_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def cleanup_template_epg():
    """
    Remove template-based EPG entries.
    Template entries can be identified by their pattern:
    - Hourly intervals (exactly on the hour)
    - Repetitive titles within same day
    - No thumbnail
    - Generic descriptions
    """
    logger.info("Cleaning up template-based EPG entries...")

    # Get all EPG entries
    all_entries = await EPGEntry.find_all().to_list()

    template_patterns = [
        "CNN Newsroom",
        "CNN News Central",
        "Early Start",
        "New Day",
        "Inside Politics",
        "The Lead",
        "The Situation Room",
        "Erin Burnett OutFront",
        "Anderson Cooper 360",
        "CNN Tonight",
        "Don Lemon Tonight",
        "World News Now",
        "America This Morning",
        "Good Morning America",
        "GMA3",
        "ABC News Live",
        "World News Tonight",
        "ABC News Prime",
        "20/20",
        "Nightline",
        "KING 5 News",
        "KING 5 Mornings",
        "Today Show",
        "Today with Hoda & Jenna",
        "i24NEWS Overnight",
        "i24NEWS Morning",
        "i24NEWS Midday",
        "i24NEWS Afternoon",
        "i24NEWS Evening",
        "i24NEWS Prime",
        "i24NEWS Night",
        "חדשות 13",
        "בוקר טוב ישראל",
        "פנאי פלוס",
        "13 סטודיו",
        "אולפן שישי",
        "כאן חינוכית",
        "בוקר טוב כיתה א׳",
        "סדנת יצירה",
        "מתמטיקה בכיף",
        "עברית שפה יפה",
        "מדע וטבע",
        "היסטוריה חיה",
        "הפסקת צהריים",
        "אנגלית לכולם",
        "גיאוגרפיה",
        "אמנות ותרבות",
        "ספורט וכושר",
        "חוג מחשבים",
        "סיפורים לערב",
        "דוקו ילדים",
        "קולנוע לנוער",
        "תוכנית ערב",
        "שידור לילה",
    ]

    deleted_count = 0
    for entry in all_entries:
        is_template = False

        # Check if title matches template patterns
        for pattern in template_patterns:
            if pattern in entry.title:
                is_template = True
                break

        # Additional heuristic: no thumbnail and hourly start time
        if not is_template:
            if (
                entry.thumbnail is None
                and entry.start_time.minute == 0
                and entry.start_time.second == 0
            ):
                # Check if description is generic
                generic_descriptions = [
                    "Live coverage",
                    "Breaking news",
                    "News analysis",
                    "Morning news",
                    "Evening news",
                    "Overnight news",
                    "News and",
                    "עדכוני חדשות",
                    "מהדורת",
                    "חדשות",
                    "תוכנית",
                    "שידור",
                ]
                for desc in generic_descriptions:
                    if entry.description and desc in entry.description:
                        is_template = True
                        break

        if is_template:
            await entry.delete()
            deleted_count += 1

    logger.info(f"Deleted {deleted_count} template-based EPG entries")
    return deleted_count


async def ingest_tvmaze_epg():
    """Ingest real EPG data from TVmaze."""
    logger.info("Ingesting real EPG data from TVmaze...")

    results = await tvmaze_epg_service.ingest_all_us_channels()

    for channel, count in results.items():
        logger.info(f"  {channel}: {count} real EPG entries")

    return results


async def ingest_israeli_epg():
    """Ingest real EPG data from Israeli sources."""
    logger.info("Ingesting real EPG data from Israeli sources...")

    results = await israeli_epg_service.ingest_all_israeli_channels()

    for channel, count in results.items():
        logger.info(f"  {channel}: {count} real EPG entries")

    return results


async def report_epg_status():
    """Report on current EPG data status."""
    logger.info("=" * 70)
    logger.info("EPG STATUS REPORT")
    logger.info("=" * 70)

    channels = await LiveChannel.find({"is_active": True}).to_list()

    now = datetime.now(timezone.utc)
    total_entries = 0
    channels_with_epg = 0

    for channel in channels:
        channel_name = channel.name_en or channel.name

        # Count EPG entries for this channel
        entry_count = await EPGEntry.find(
            {"channel_id": str(channel.id), "end_time": {"$gte": now}}
        ).count()

        total_entries += entry_count

        if entry_count > 0:
            channels_with_epg += 1
            # Get sample entry
            sample = await EPGEntry.find_one(
                {"channel_id": str(channel.id), "start_time": {"$gte": now}}
            )
            sample_title = sample.title if sample else "N/A"
            sample_thumb = "Yes" if sample and sample.thumbnail else "No"
            logger.info(
                f"  {channel_name}: {entry_count} entries | "
                f"Next: {sample_title} | Thumbnail: {sample_thumb}"
            )
        else:
            logger.info(f"  {channel_name}: No EPG data")

    logger.info("=" * 70)
    logger.info(f"Total: {total_entries} EPG entries across {channels_with_epg} channels")
    logger.info("=" * 70)


async def main():
    """Main EPG ingestion function."""
    logger.info("=" * 70)
    logger.info("REAL EPG INGESTION")
    logger.info("Data Source: TVmaze API (https://api.tvmaze.com)")
    logger.info("=" * 70)

    # Initialize database
    await connect_to_mongo()

    # Step 1: Clean up template-based entries
    deleted = await cleanup_template_epg()
    logger.info(f"Cleanup complete: {deleted} template entries removed")

    # Step 2: Ingest real EPG from TVmaze (US channels)
    logger.info("")
    logger.info("Fetching real EPG data from TVmaze (US channels)...")
    tvmaze_results = await ingest_tvmaze_epg()

    tvmaze_total = sum(tvmaze_results.values())
    logger.info(f"TVmaze ingestion complete: {tvmaze_total} entries")

    # Step 3: Ingest real EPG from Israeli sources
    logger.info("")
    logger.info("Fetching real EPG data from Israeli sources...")
    israeli_results = await ingest_israeli_epg()

    israeli_total = sum(israeli_results.values())
    logger.info(f"Israeli ingestion complete: {israeli_total} entries")

    # Combine results
    results = {**tvmaze_results, **israeli_results}
    total_ingested = tvmaze_total + israeli_total
    logger.info(f"Total ingestion complete: {total_ingested} real EPG entries created")

    # Step 3: Report status
    logger.info("")
    await report_epg_status()

    # Cleanup
    await tvmaze_epg_service.close()
    await israeli_epg_service.close()

    logger.info("")
    logger.info("=" * 70)
    logger.info("REAL EPG INGESTION COMPLETE")
    logger.info("=" * 70)
    logger.info("Data sources used:")
    logger.info("  - TVmaze API: CNN, ABC News, King 5 News (NBC affiliate)")
    logger.info("  - i24news API: i24NEWS Hebrew, i24NEWS English")
    logger.info("")
    logger.info("Note: Reshet 13 and Kan Educational APIs blocked by Cloudflare.")
    logger.info("Consider using server-side proxy or alternative EPG source.")
    logger.info("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
