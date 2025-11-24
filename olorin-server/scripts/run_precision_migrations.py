#!/usr/bin/env python3
"""
Run Precision Detection Migrations

Manually runs the precision detection database migrations (009 and 010).
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.persistence.database import get_db_session
from app.persistence.migrations.runner import MigrationRunner
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def main():
    """Run precision detection migrations."""
    logger.info("🔄 Running precision detection migrations...")
    
    try:
        with get_db_session() as db:
            runner = MigrationRunner(db)
            
            # Check database type
            db_type = runner._get_database_type()
            logger.info(f"Database type: {db_type}")
            
            # Get all migration files
            all_migrations = runner.get_migration_files()
            
            # Filter to only precision detection migrations (including SQLite versions)
            precision_migrations = [
                f for f in all_migrations 
                if ('009_precision' in f.name or '010_precision' in f.name)
            ]
            
            if not precision_migrations:
                logger.warning("No precision detection migrations found")
                return
            
            logger.info(f"Found {len(precision_migrations)} precision detection migration file(s)")
            
            # Create a custom migration runner that only runs precision migrations
            # We'll manually filter and execute
            for migration_file in precision_migrations:
                filename_lower = migration_file.name.lower()
                # Skip SQLite-specific files if not using SQLite
                if '_sqlite.sql' in filename_lower and db_type != 'sqlite':
                    logger.debug(f"Skipping SQLite-specific migration: {migration_file.name}")
                    continue
                # For PostgreSQL-specific files on SQLite, check for SQLite version
                if runner._is_postgresql_specific(migration_file) and db_type != 'postgresql':
                    sqlite_version = migration_file.parent / migration_file.name.replace('.sql', '_sqlite.sql')
                    if sqlite_version.exists():
                        logger.info(f"Using SQLite-compatible version: {sqlite_version.name}")
                        migration_file = sqlite_version
                    else:
                        logger.warning(f"Skipping PostgreSQL-specific migration (no SQLite version): {migration_file.name}")
                        continue
                
                logger.info(f"Running migration: {migration_file.name}")
                try:
                    runner.execute_migration(migration_file)
                    logger.info(f"✅ Migration completed: {migration_file.name}")
                except Exception as e:
                    logger.error(f"❌ Migration failed: {migration_file.name} - {e}")
                    raise
            
            logger.info("✅ All precision detection migrations completed successfully")
            
    except Exception as e:
        logger.error(f"❌ Migration execution failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()

