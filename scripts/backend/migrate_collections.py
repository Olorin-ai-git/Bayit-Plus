#!/usr/bin/env python3
"""
Migration Script: Auto-detect and create movie collections
Scans all existing movies with TMDB collection IDs and creates collection parents
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.core.database import init_db
from app.core.logging_config import get_logger
from app.services.collection_detector_service import collection_detector_service

logger = get_logger(__name__)


async def migrate_collections():
    """Run collection migration"""
    logger.info("=" * 60)
    logger.info("MOVIE COLLECTIONS MIGRATION")
    logger.info("=" * 60)

    # Initialize database
    logger.info("Connecting to MongoDB...")
    await init_db()
    logger.info(f"Connected to: {settings.MONGODB_DATABASE}")

    # Run collection scan
    logger.info("Scanning movies for collections...")
    stats = await collection_detector_service.scan_all_movies()

    # Display results
    logger.info("=" * 60)
    logger.info("MIGRATION COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Movies scanned:      {stats['total_movies_scanned']}")
    logger.info(f"Collections created: {stats['collections_created']}")
    logger.info(f"Collections skipped: {stats['collections_skipped']}")
    logger.info(f"Movies linked:       {stats['movies_linked']}")
    logger.info("=" * 60)

    return stats


if __name__ == "__main__":
    asyncio.run(migrate_collections())
