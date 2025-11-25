"""
Database Migration Runner
Feature: 005-polling-and-persistence

Executes manual SQL migration scripts with transaction rollback on error.
CRITICAL: Schema-locked approach - NO auto-migration logic.

SYSTEM MANDATE Compliance:
- Manual SQL file execution only
- Transaction rollback on error
- Logging for each migration step
- No ORM auto-sync features
"""

import logging
import os
from pathlib import Path
from typing import List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class MigrationRunner:
    """Manual database migration runner.

    Executes SQL migration files in order with transaction safety.
    """

    def __init__(self, db_session: Session, migrations_dir: Optional[Path] = None):
        """Initialize migration runner.

        Args:
            db_session: SQLAlchemy database session
            migrations_dir: Directory containing migration SQL files
        """
        self.db_session = db_session
        self.migrations_dir = migrations_dir or Path(__file__).parent

    def get_migration_files(self) -> List[Path]:
        """Get ordered list of migration SQL files.

        Returns:
            List of migration file paths sorted by filename
        """
        sql_files = list(self.migrations_dir.glob("*.sql"))
        return sorted(sql_files)

    def _is_postgresql_specific(self, migration_file: Path) -> bool:
        """Check if migration file is PostgreSQL-specific.

        Note: All migrations are now PostgreSQL-specific (SQLite support removed).
        This method checks for Snowflake-specific syntax to exclude those.
        """
        # Skip SQLite-specific files (should not exist after consolidation)
        filename = migration_file.name.lower()
        if filename.endswith("_sqlite.sql"):
            logger.warning(
                f"Found SQLite-specific migration file {migration_file.name} - SQLite support has been removed. Skipping."
            )
            return False

        # All non-Snowflake migrations are PostgreSQL-specific
        return not self._is_snowflake_specific(migration_file)

    def _is_snowflake_specific(self, migration_file: Path) -> bool:
        """Check if migration file is Snowflake-specific."""
        # Note: Analytics tables are now in PostgreSQL, so we only skip
        # files that contain actual Snowflake-specific syntax (not table names)

        # Check content for Snowflake-specific syntax
        try:
            content = migration_file.read_text().upper()
            snowflake_keywords = [
                "DYNAMIC TABLE",
                "SNOWPIPE STREAMING",
                "VARIANT",
                "TARGET_LAG",
                "WAREHOUSE",
                "CREATE OR REPLACE DYNAMIC TABLE",
            ]
            if any(keyword in content for keyword in snowflake_keywords):
                return True
        except Exception:
            pass

        return False

    def _get_database_type(self) -> str:
        """Detect database type from connection.

        Note: SQLite support has been removed. All non-Snowflake databases are PostgreSQL.
        """
        try:
            # Check connection URL or dialect
            url = (
                str(self.db_session.bind.url)
                if hasattr(self.db_session, "bind")
                else ""
            )
            if "postgresql" in url.lower() or "postgres" in url.lower():
                return "postgresql"
            elif "sqlite" in url.lower():
                logger.warning(
                    "SQLite database detected but SQLite support has been removed. Please use PostgreSQL."
                )
                return "postgresql"  # Treat as PostgreSQL for migration purposes
        except Exception:
            pass

        # Fallback: assume PostgreSQL (SQLite support removed)
        return "postgresql"

    def execute_migration(self, migration_file: Path) -> None:
        """Execute a single migration file.

        Args:
            migration_file: Path to SQL migration file

        Raises:
            Exception: If migration execution fails
        """
        logger.debug(f"Executing migration: {migration_file.name}")

        # Skip SQLite-specific files (SQLite support removed)
        if migration_file.name.endswith("_sqlite.sql"):
            logger.info(
                f"Skipping SQLite-specific migration {migration_file.name} (SQLite support removed)"
            )
            return

        # Check if migration is Snowflake-specific (skip for PostgreSQL)
        if self._is_snowflake_specific(migration_file):
            logger.info(f"Skipping Snowflake-specific migration {migration_file.name}")
            logger.info(
                f"  Note: Snowflake migrations must be run separately against Snowflake database"
            )
            return

        # All remaining migrations are PostgreSQL-specific
        db_type = self._get_database_type()
        if db_type != "postgresql":
            logger.warning(
                f"Database type is {db_type}, but only PostgreSQL is supported. Skipping migration {migration_file.name}"
            )
            return

        try:
            with open(migration_file, "r") as f:
                sql_content = f.read()

            # For PostgreSQL, handle dollar-quoted strings properly
            # Simple approach: execute entire file as-is (PostgreSQL supports this)
            # This handles functions with $$ delimiters correctly
            db_type = self._get_database_type()

            if db_type == "postgresql":
                # PostgreSQL: Execute entire file using psycopg2 directly
                # This handles dollar-quoted strings ($$) and functions correctly
                logger.debug(
                    f"Executing PostgreSQL migration file: {migration_file.name}"
                )
                try:
                    # Get raw DBAPI connection (psycopg2)
                    raw_connection = self.db_session.connection().connection
                    cursor = raw_connection.cursor()
                    # Execute entire file content (psycopg2 supports multiple statements)
                    cursor.execute(sql_content)
                    cursor.close()
                    raw_connection.commit()
                    logger.debug(
                        f"Migration executed successfully: {migration_file.name}"
                    )
                except Exception as e:
                    logger.error(f"Migration failed: {migration_file.name} - {e}")
                    raw_connection.rollback()
                    raise
            else:
                # For other databases, parse statements by semicolon
                statements = []
                current_stmt = []
                for line in sql_content.split("\n"):
                    stripped = line.strip()
                    # Skip comment-only lines and empty lines
                    if stripped.startswith("--") or not stripped:
                        continue
                    current_stmt.append(line)
                    # Statement ends with semicolon
                    if stripped.endswith(";"):
                        stmt_text = "\n".join(current_stmt).strip()
                        if stmt_text:
                            statements.append(stmt_text)
                        current_stmt = []

                logger.debug(f"Found {len(statements)} SQL statements to execute")

                # Execute each statement in transaction
                for idx, statement in enumerate(statements, 1):
                    if statement:
                        # Log first 100 chars of statement for debugging
                        stmt_preview = (
                            statement[:100] + "..."
                            if len(statement) > 100
                            else statement
                        )
                        logger.debug(
                            f"  [{idx}/{len(statements)}] Executing: {stmt_preview}"
                        )

                        try:
                            self.db_session.execute(text(statement))
                            logger.debug(
                                f"  [{idx}/{len(statements)}] Statement executed successfully"
                            )
                        except Exception as stmt_error:
                            logger.error(
                                f"  [{idx}/{len(statements)}] Statement failed: {stmt_preview}"
                            )
                            logger.error(f"  Error details: {stmt_error}")
                            raise

            self.db_session.commit()
            logger.debug(f"Migration completed successfully: {migration_file.name}")

        except Exception as e:
            logger.error(f"Migration failed: {migration_file.name} - {e}")
            self.db_session.rollback()
            raise

    def run_migrations(self) -> None:
        """Run all pending migrations.

        Raises:
            Exception: If any migration fails
        """
        migration_files = self.get_migration_files()

        if not migration_files:
            logger.debug("No migration files found")
            return

        logger.debug(f"Found {len(migration_files)} migration file(s)")

        # Exclude SQLite-specific files (SQLite support removed)
        migration_files = [
            f for f in migration_files if not f.name.endswith("_sqlite.sql")
        ]

        # Exclude Snowflake-specific files (run separately)
        migration_files = [
            f for f in migration_files if not self._is_snowflake_specific(f)
        ]

        logger.debug(f"Filtered to {len(migration_files)} PostgreSQL migration file(s)")

        for migration_file in migration_files:
            self.execute_migration(migration_file)

        logger.debug("All migrations completed successfully")

    def verify_schema(self) -> bool:
        """Verify expected database schema exists.

        Returns:
            True if all expected tables exist

        Raises:
            RuntimeError: If critical tables are missing
        """
        expected_tables = [
            "investigation_states",
            "investigation_templates",
            "investigation_audit_log",
        ]

        try:
            # Use PostgreSQL-compatible query (information_schema)
            # SQLite support has been removed - PostgreSQL only
            result = self.db_session.execute(
                text(
                    """
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_type = 'BASE TABLE'
                """
                )
            )
            existing_tables = {row[0] for row in result}

            missing_tables = [
                table for table in expected_tables if table not in existing_tables
            ]

            if missing_tables:
                error_msg = f"Missing database tables: {', '.join(missing_tables)}"
                logger.error(error_msg)
                raise RuntimeError(error_msg)

            logger.debug("Schema verification passed: All tables exist")
            return True

        except Exception as e:
            logger.error(f"Schema verification failed: {e}")
            raise


def run_wizard_state_migrations(db_session: Session) -> None:
    """Run wizard state migrations and verify schema.

    Args:
        db_session: SQLAlchemy database session

    Raises:
        RuntimeError: If migrations fail or schema is invalid
    """
    runner = MigrationRunner(db_session)

    try:
        # Execute migrations
        runner.run_migrations()

        # Verify schema
        runner.verify_schema()

    except Exception as e:
        logger.error(f"Wizard state migration failed: {e}")
        raise RuntimeError(f"Database migration failed – refusing to start: {e}")
