#!/usr/bin/env python3
"""
Run taxonomy migration script.

This script:
1. Seeds all taxonomy collections (sections, subcategories, genres, audiences)
2. Migrates existing content from legacy categories to new taxonomy fields
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.core.database import connect_to_mongo
from app.services.content_taxonomy_migration import (
    get_migration_status,
    run_full_migration,
)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def main():
    """Run the taxonomy migration."""
    logger.info("Connecting to database...")
    await connect_to_mongo()

    # Check current status
    logger.info("Checking current migration status...")
    status_before = await get_migration_status()
    logger.info(f"Status before migration: {status_before}")

    # Run migration
    logger.info("Running full taxonomy migration...")
    results = await run_full_migration(dry_run=False)

    logger.info("=" * 60)
    logger.info("MIGRATION COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Seed Results:")
    logger.info(f"  - Sections: {results['seed_results']['sections']}")
    logger.info(f"  - Subcategories: {results['seed_results']['subcategories']}")
    logger.info(f"  - Genres: {results['seed_results']['genres']}")
    logger.info(f"  - Audiences: {results['seed_results']['audiences']}")
    logger.info("")
    logger.info(f"Migration Stats:")
    logger.info(f"  - Total processed: {results['migration_stats']['total']}")
    logger.info(f"  - Migrated: {results['migration_stats']['migrated']}")
    logger.info(
        f"  - Already migrated: {results['migration_stats']['already_migrated']}"
    )
    logger.info(f"  - Skipped: {results['migration_stats']['skipped']}")
    logger.info(f"  - Errors: {results['migration_stats']['errors']}")
    logger.info("")
    logger.info(f"Final Status:")
    logger.info(f"  - Total content: {results['final_status']['total_content']}")
    logger.info(f"  - Migrated content: {results['final_status']['migrated_content']}")
    logger.info(f"  - Migration %: {results['final_status']['migration_percentage']}%")
    logger.info(
        f"  - Content by section: {results['final_status']['content_by_section']}"
    )


if __name__ == "__main__":
    asyncio.run(main())
