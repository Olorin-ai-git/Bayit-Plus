#!/usr/bin/env python3
"""
Script to create transaction_windows view in PostgreSQL.
This view aggregates transaction data into 15-minute windows for anomaly detection.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncpg

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def create_view():
    """Create transaction_windows view using direct PostgreSQL connection."""
    # Read migration file
    migration_file = (
        Path(__file__).parent.parent
        / "app"
        / "persistence"
        / "migrations"
        / "006_add_transaction_windows_view.sql"
    )

    if not migration_file.exists():
        logger.error(f"Migration file not found: {migration_file}")
        return False

    sql_content = migration_file.read_text()

    # Get connection details using config loader
    from app.service.config_loader import get_config_loader

    config_loader = get_config_loader()
    pg_config = config_loader.load_postgresql_config()

    host = pg_config.get("host", "localhost")
    port = int(pg_config.get("port", 5432))
    database = pg_config.get("database", "olorin")
    user = pg_config.get("user", "postgres")
    password = pg_config.get("password", "postgres")

    try:
        # Connect directly to PostgreSQL
        conn = await asyncpg.connect(
            host=host, port=port, database=database, user=user, password=password
        )
        logger.info(f"Connected to PostgreSQL: {database}@{host}:{port}")

        # Parse and execute SQL statements
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

        logger.info(f"Found {len(statements)} SQL statements to execute")

        # Execute each statement
        for idx, statement in enumerate(statements, 1):
            if statement:
                logger.info(f"Executing statement {idx}/{len(statements)}")
                try:
                    await conn.execute(statement)
                    logger.info(f"Statement {idx} executed successfully")
                except Exception as e:
                    logger.error(f"Statement {idx} failed: {e}")
                    logger.error(f"Statement: {statement[:200]}...")
                    raise

        await conn.close()
        logger.info("✅ transaction_windows view created successfully")
        return True

    except Exception as e:
        logger.error(f"❌ Failed to create view: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(create_view())
    sys.exit(0 if success else 1)
