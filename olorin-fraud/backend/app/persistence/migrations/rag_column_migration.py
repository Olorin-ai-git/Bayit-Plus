"""
RAG Database Migration: Rename metadata column to meta_data
Handles migration for both PostgreSQL and SQLite databases.
"""

import logging
from pathlib import Path
from typing import Optional

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.service.database.vector_database_config import get_vector_db_config
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RAGColumnMigration:
    """Migration to rename metadata column to meta_data in RAG tables."""

    def __init__(self, db_config=None):
        """Initialize migration runner."""
        self.db_config = db_config or get_vector_db_config()
        self.is_postgresql = self.db_config.is_postgresql
        self.is_sqlite = self.db_config.is_sqlite

    async def check_column_exists(self, table_name: str, column_name: str) -> bool:
        """Check if a column exists in a table."""
        try:
            if self.is_postgresql:
                async with self.db_config.session() as session:
                    query = text(
                        """
                        SELECT EXISTS (
                            SELECT 1 
                            FROM information_schema.columns 
                            WHERE table_name = :table_name 
                            AND column_name = :column_name
                        )
                    """
                    )
                    result = await session.execute(
                        query, {"table_name": table_name, "column_name": column_name}
                    )
                    return result.scalar()
            else:
                # SQLite: Use PRAGMA table_info
                await self.db_config.initialize_engine()
                sync_engine = self.db_config._sync_engine
                if not sync_engine:
                    logger.error("SQLite engine not initialized")
                    return False

                with sync_engine.connect() as conn:
                    result = conn.execute(text(f"PRAGMA table_info({table_name})"))
                    columns = [row[1] for row in result.fetchall()]
                    return column_name in columns
        except Exception as e:
            logger.error(f"Error checking column existence: {e}")
            return False

    async def rename_column(
        self, table_name: str, old_name: str, new_name: str
    ) -> bool:
        """Rename a column in a table."""
        try:
            # Check if old column exists
            if not await self.check_column_exists(table_name, old_name):
                logger.info(
                    f"Column {old_name} does not exist in {table_name} (may already be migrated)"
                )
                return True

            # Check if new column already exists
            if await self.check_column_exists(table_name, new_name):
                logger.warning(
                    f"Column {new_name} already exists in {table_name} - skipping migration"
                )
                return True

            if self.is_postgresql:
                # PostgreSQL: Use ALTER TABLE ... RENAME COLUMN
                async with self.db_config.session() as session:
                    query = text(
                        f'ALTER TABLE {table_name} RENAME COLUMN "{old_name}" TO "{new_name}"'
                    )
                    await session.execute(query)
                    await session.commit()
                    logger.info(
                        f"✅ Renamed {old_name} to {new_name} in {table_name} (PostgreSQL)"
                    )
                    return True
            else:
                # SQLite: Use ALTER TABLE ... RENAME COLUMN (SQLite 3.25.0+)
                sync_engine = self.db_config._sync_engine
                if not sync_engine:
                    await self.db_config.initialize_engine()
                    sync_engine = self.db_config._sync_engine

                with sync_engine.connect() as conn:
                    # SQLite 3.25.0+ supports RENAME COLUMN
                    query = text(
                        f'ALTER TABLE {table_name} RENAME COLUMN "{old_name}" TO "{new_name}"'
                    )
                    conn.execute(query)
                    conn.commit()
                    logger.info(
                        f"✅ Renamed {old_name} to {new_name} in {table_name} (SQLite)"
                    )
                    return True

        except Exception as e:
            logger.error(
                f"❌ Failed to rename column {old_name} to {new_name} in {table_name}: {e}"
            )
            return False

    async def run_migration(self) -> bool:
        """Run the migration to rename metadata columns."""
        logger.info("🔄 Starting RAG column migration: metadata -> meta_data")

        try:
            # Ensure database engine is initialized
            await self.db_config.initialize_engine()

            # Migrate documents table
            success1 = await self.rename_column("documents", "metadata", "meta_data")

            # Migrate document_chunks table
            success2 = await self.rename_column(
                "document_chunks", "metadata", "meta_data"
            )

            if success1 and success2:
                logger.info("✅ RAG column migration completed successfully")
                return True
            else:
                logger.warning("⚠️ RAG column migration completed with warnings")
                return False

        except Exception as e:
            logger.error(f"❌ RAG column migration failed: {e}")
            return False

    async def verify_migration(self) -> dict:
        """Verify that the migration was successful."""
        logger.info("🔍 Verifying RAG column migration...")

        verification = {
            "documents_table": {
                "old_column_exists": False,
                "new_column_exists": False,
                "migrated": False,
            },
            "document_chunks_table": {
                "old_column_exists": False,
                "new_column_exists": False,
                "migrated": False,
            },
            "all_migrated": False,
        }

        try:
            await self.db_config.initialize_engine()

            # Check documents table
            verification["documents_table"]["old_column_exists"] = (
                await self.check_column_exists("documents", "metadata")
            )
            verification["documents_table"]["new_column_exists"] = (
                await self.check_column_exists("documents", "meta_data")
            )
            verification["documents_table"]["migrated"] = (
                not verification["documents_table"]["old_column_exists"]
                and verification["documents_table"]["new_column_exists"]
            )

            # Check document_chunks table
            verification["document_chunks_table"]["old_column_exists"] = (
                await self.check_column_exists("document_chunks", "metadata")
            )
            verification["document_chunks_table"]["new_column_exists"] = (
                await self.check_column_exists("document_chunks", "meta_data")
            )
            verification["document_chunks_table"]["migrated"] = (
                not verification["document_chunks_table"]["old_column_exists"]
                and verification["document_chunks_table"]["new_column_exists"]
            )

            verification["all_migrated"] = (
                verification["documents_table"]["migrated"]
                and verification["document_chunks_table"]["migrated"]
            )

            if verification["all_migrated"]:
                logger.info("✅ Migration verification passed")
            else:
                logger.warning("⚠️ Migration verification found issues")
                logger.warning(f"   Documents table: {verification['documents_table']}")
                logger.warning(
                    f"   Document chunks table: {verification['document_chunks_table']}"
                )

            return verification

        except Exception as e:
            logger.error(f"❌ Migration verification failed: {e}")
            return verification


async def run_rag_column_migration() -> bool:
    """Run the RAG column migration."""
    migration = RAGColumnMigration()
    return await migration.run_migration()


async def verify_rag_column_migration() -> dict:
    """Verify the RAG column migration."""
    migration = RAGColumnMigration()
    return await migration.verify_migration()
