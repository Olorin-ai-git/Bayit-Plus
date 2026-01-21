"""
Database Maintenance Service
MongoDB Atlas health checks and referential integrity validation
"""

import logging
from datetime import datetime
from typing import Any, Dict, List

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.database import db
from app.models.content import Content
from app.models.content_taxonomy import (ContentSection, EPGEntry, LiveChannel,
                                         Podcast, PodcastEpisode)

logger = logging.getLogger(__name__)


async def perform_database_maintenance() -> Dict[str, Any]:
    """
    Perform MongoDB Atlas maintenance checks.

    Tasks:
    1. Connection health check
    2. Index validation (ensure all indexes exist)
    3. Referential integrity checks
    4. Collection statistics
    5. Identify orphaned documents

    Returns:
        Detailed health report with recommendations
    """
    logger.info("🗄️ Performing database maintenance...")

    results = {
        "status": "completed",
        "connection_status": "unknown",
        "collections_checked": 0,
        "referential_integrity": "unknown",
        "orphaned_items": [],
        "index_status": "unknown",
        "collection_stats": {},
        "recommendations": [],
    }

    try:
        # 1. Connection health check
        logger.info("   Checking MongoDB Atlas connection...")
        connection_healthy = await check_connection_health()
        results["connection_status"] = "healthy" if connection_healthy else "unhealthy"

        if not connection_healthy:
            results["status"] = "failed"
            results["recommendations"].append("MongoDB connection is unhealthy")
            return results

        # 2. Index validation
        logger.info("   Validating indexes...")
        index_status = await validate_indexes()
        results["index_status"] = (
            "all_present" if index_status["all_present"] else "missing_indexes"
        )

        if not index_status["all_present"]:
            results["recommendations"].append(
                f"Missing indexes: {', '.join(index_status['missing'])}"
            )

        # 3. Referential integrity checks
        logger.info("   Checking referential integrity...")
        integrity_results = await check_referential_integrity()
        results["referential_integrity"] = (
            "passed" if integrity_results["passed"] else "failed"
        )
        results["orphaned_items"] = integrity_results["orphaned"]

        if not integrity_results["passed"]:
            results["recommendations"].append(
                f"Found {len(integrity_results['orphaned'])} orphaned items"
            )

        # 4. Collection statistics
        logger.info("   Gathering collection statistics...")
        stats = await get_collection_statistics()
        results["collection_stats"] = stats
        results["collections_checked"] = len(stats)

        # 5. Generate recommendations
        if stats.get("content", {}).get("count", 0) > 10000:
            results["recommendations"].append(
                "Consider archiving old content to improve performance"
            )

        if stats.get("audit_reports", {}).get("count", 0) > 100:
            results["recommendations"].append(
                "Consider cleaning up old audit reports (keep last 90 days)"
            )

        logger.info(f"   ✅ Database maintenance complete")
        logger.info(f"      Connection: {results['connection_status']}")
        logger.info(f"      Indexes: {results['index_status']}")
        logger.info(f"      Integrity: {results['referential_integrity']}")

        return results

    except Exception as e:
        logger.error(f"❌ Database maintenance failed: {e}")
        results["status"] = "failed"
        results["error"] = str(e)
        return results


async def check_connection_health() -> bool:
    """Check if MongoDB connection is healthy"""
    try:
        # Simple ping to check connection
        client: AsyncIOMotorClient = db.client
        await client.admin.command("ping")
        return True
    except Exception as e:
        logger.error(f"Connection health check failed: {e}")
        return False


async def validate_indexes() -> Dict[str, Any]:
    """Validate that all required indexes exist"""
    result = {"all_present": True, "missing": [], "collections_checked": []}

    # Define expected indexes for key collections
    expected_indexes = {
        "content": ["category_id", "is_published", "series_id"],
        "live_channels": ["is_active", "order"],
        "podcasts": ["category", "is_active"],
        "podcast_episodes": ["podcast_id", "guid"],
        "categories": [],  # No special indexes required
        "audit_reports": ["audit_date", "status"],
        "librarian_actions": ["audit_id", "content_id"],
        "stream_validation_cache": ["stream_url", "expires_at"],
    }

    try:
        client: AsyncIOMotorClient = db.client
        database = client.get_database()

        for collection_name, required_indexes in expected_indexes.items():
            result["collections_checked"].append(collection_name)

            # Get existing indexes
            collection = database[collection_name]
            existing_indexes = await collection.index_information()

            # Check if required indexes exist
            for index_name in required_indexes:
                # Index might be named differently (e.g., "category_id_1")
                found = any(
                    index_name in idx_name or index_name in str(idx_info.get("key", []))
                    for idx_name, idx_info in existing_indexes.items()
                )

                if not found:
                    result["all_present"] = False
                    result["missing"].append(f"{collection_name}.{index_name}")

    except Exception as e:
        logger.error(f"Index validation failed: {e}")
        result["all_present"] = False
        result["error"] = str(e)

    return result


async def check_referential_integrity() -> Dict[str, Any]:
    """
    Check referential integrity between collections.

    Checks:
    - Content.category_id -> Category.id
    - Content.series_id -> Content.id (parent series)
    - PodcastEpisode.podcast_id -> Podcast.id
    - EPGEntry.channel_id -> LiveChannel.id
    """
    result = {
        "passed": True,
        "orphaned": [],
        "checks_performed": 0,
    }

    try:
        # Check 1: Content.category_id -> Category.id
        logger.info("      Checking content categories...")
        all_categories = await Category.find({}).to_list(length=None)
        valid_category_ids = {str(cat.id) for cat in all_categories}

        invalid_category_content = await Content.find(
            {"category_id": {"$nin": list(valid_category_ids)}, "is_published": True}
        ).to_list(length=None)

        for content in invalid_category_content:
            result["orphaned"].append(
                {
                    "type": "invalid_category",
                    "content_id": str(content.id),
                    "title": content.title,
                    "invalid_category_id": content.category_id,
                    "fixable": True,
                }
            )

        result["checks_performed"] += 1

        # Check 2: Content.series_id -> Content.id (parent series)
        logger.info("      Checking series references...")
        series_episodes = await Content.find(
            {"is_series": False, "series_id": {"$exists": True, "$ne": None}}
        ).to_list(length=None)

        for episode in series_episodes:
            # Check if parent series exists
            parent = await Content.find_one(
                {"_id": episode.series_id, "is_series": True}
            )
            if not parent:
                result["orphaned"].append(
                    {
                        "type": "orphaned_episode",
                        "content_id": str(episode.id),
                        "title": episode.title,
                        "missing_series_id": episode.series_id,
                        "fixable": False,
                    }
                )

        result["checks_performed"] += 1

        # Check 3: PodcastEpisode.podcast_id -> Podcast.id
        logger.info("      Checking podcast episodes...")
        all_podcasts = await Podcast.find({}).to_list(length=None)
        valid_podcast_ids = {str(p.id) for p in all_podcasts}

        orphaned_episodes = await PodcastEpisode.find(
            {"podcast_id": {"$nin": list(valid_podcast_ids)}}
        ).to_list(length=None)

        for episode in orphaned_episodes:
            result["orphaned"].append(
                {
                    "type": "orphaned_podcast_episode",
                    "episode_id": str(episode.id),
                    "title": episode.title,
                    "missing_podcast_id": episode.podcast_id,
                    "fixable": False,
                }
            )

        result["checks_performed"] += 1

        # Check 4: EPGEntry.channel_id -> LiveChannel.id
        logger.info("      Checking EPG entries...")
        all_channels = await LiveChannel.find({}).to_list(length=None)
        valid_channel_ids = {str(ch.id) for ch in all_channels}

        orphaned_epg = await EPGEntry.find(
            {"channel_id": {"$nin": list(valid_channel_ids)}}
        ).to_list(length=None)

        for epg in orphaned_epg:
            result["orphaned"].append(
                {
                    "type": "orphaned_epg_entry",
                    "epg_id": str(epg.id),
                    "title": epg.title,
                    "missing_channel_id": epg.channel_id,
                    "fixable": False,
                }
            )

        result["checks_performed"] += 1

        if result["orphaned"]:
            result["passed"] = False

    except Exception as e:
        logger.error(f"Referential integrity check failed: {e}")
        result["passed"] = False
        result["error"] = str(e)

    return result


async def get_collection_statistics() -> Dict[str, Dict[str, Any]]:
    """Get statistics for all collections"""
    stats = {}

    collections_to_check = [
        "content",
        "categories",
        "live_channels",
        "podcasts",
        "podcast_episodes",
        "radio_stations",
        "audit_reports",
        "librarian_actions",
        "stream_validation_cache",
        "classification_verification_cache",
    ]

    try:
        client: AsyncIOMotorClient = db.client
        database = client.get_database()

        for collection_name in collections_to_check:
            try:
                collection = database[collection_name]

                # Get count
                count = await collection.count_documents({})

                # Get collection size (if available)
                coll_stats = await database.command("collStats", collection_name)

                stats[collection_name] = {
                    "count": count,
                    "size_bytes": coll_stats.get("size", 0),
                    "avg_doc_size": coll_stats.get("avgObjSize", 0),
                    "indexes_count": coll_stats.get("nindexes", 0),
                }

            except Exception as e:
                logger.warning(f"Failed to get stats for {collection_name}: {e}")
                stats[collection_name] = {"error": str(e)}

    except Exception as e:
        logger.error(f"Failed to get collection statistics: {e}")

    return stats
