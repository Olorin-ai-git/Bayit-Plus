#!/usr/bin/env python3
"""
Run All Database Migrations

Runs all PostgreSQL migrations in order.
SQLite-specific migrations are skipped (SQLite support removed).
Snowflake-specific migrations are skipped (run separately).
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.persistence.database import get_db_session, init_database
from app.persistence.migrations.runner import MigrationRunner
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def main():
    """Run all database migrations."""
    logger.info("🔄 Running all database migrations...")

    try:
        # Initialize database connection
        init_database()

        with get_db_session() as db:
            runner = MigrationRunner(db)

            # Check database type
            db_type = runner._get_database_type()
            logger.info(f"Database type: {db_type}")

            if db_type != "postgresql":
                logger.warning(
                    f"⚠️  Database type is {db_type}, but PostgreSQL is required. Migrations may fail."
                )

            # Get all migration files
            all_migrations = runner.get_migration_files()
            logger.info(f"Found {len(all_migrations)} migration file(s) total")

            # Run migrations (runner will filter out SQLite and Snowflake-specific files)
            runner.run_migrations()

            logger.info("✅ All migrations completed successfully")

    except Exception as e:
        logger.error(f"❌ Migration execution failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
