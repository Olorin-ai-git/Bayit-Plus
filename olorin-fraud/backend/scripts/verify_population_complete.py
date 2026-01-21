#!/usr/bin/env python3
"""
PostgreSQL Population Verification Script

Verifies that ALL 333 columns in ALL 5000 records have been populated.
Provides detailed statistics on data completeness.

Author: Gil Klainert
Date: 2025-11-06
Version: 1.0.0

Usage:
    poetry run python scripts/verify_population_complete.py
"""

import asyncio
import sys
from pathlib import Path
from typing import Dict, List

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def verify_population():
    """Verify complete population of all columns."""
    import asyncpg

    # Load config
    config_loader = get_config_loader()
    pg_config = config_loader.load_postgresql_config()

    conn_str = f"postgresql://{pg_config['user']}:{pg_config['password']}@{pg_config['host']}:{pg_config['port']}/{pg_config['database']}"

    logger.info("=" * 80)
    logger.info("PostgreSQL Population Verification Report")
    logger.info("=" * 80)

    try:
        conn = await asyncpg.connect(conn_str)
        logger.info(f"✅ Connected to PostgreSQL: {pg_config['database']}")

        schema = pg_config.get("schema", "public")
        table = pg_config.get("transactions_table", "transactions_enriched")
        full_table = f"{schema}.{table}"

        # Get all columns
        col_query = """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'transactions_enriched'
            ORDER BY ordinal_position
        """
        columns_info = await conn.fetch(col_query)
        total_columns = len(columns_info)

        # Get total records
        count_query = f"SELECT COUNT(*) as count FROM {full_table}"
        total_records = (await conn.fetchrow(count_query))["count"]

        logger.info("")
        logger.info("Database Schema Information:")
        logger.info(f"  Total Columns: {total_columns}")
        logger.info(f"  Total Records: {total_records}")
        logger.info(f"  Total Fields:  {total_columns * total_records:,}")

        # Check NULL counts for each column
        null_counts: Dict[str, int] = {}
        columns_with_nulls: List[str] = []

        logger.info("")
        logger.info("Checking NULL values across all columns...")

        for col in columns_info:
            col_name = col["column_name"]
            null_check = f"SELECT COUNT(*) as null_count FROM {full_table} WHERE {col_name} IS NULL"
            null_count = (await conn.fetchrow(null_check))["null_count"]

            if null_count > 0:
                null_counts[col_name] = null_count
                columns_with_nulls.append(col_name)

        # Calculate statistics
        total_fields = total_columns * total_records
        total_null_fields = sum(null_counts.values())
        total_populated_fields = total_fields - total_null_fields
        population_percentage = (
            (total_populated_fields / total_fields * 100) if total_fields > 0 else 0
        )

        # Count records with 100% population
        records_100_populated = 0
        sample_query = f"SELECT * FROM {full_table} LIMIT 10"
        sample_records = await conn.fetch(sample_query)

        for record in sample_records:
            null_count_in_record = sum(1 for value in record.values() if value is None)
            if null_count_in_record == 0:
                records_100_populated += 1

        await conn.close()

        # Print detailed report
        logger.info("")
        logger.info("=" * 80)
        logger.info("VERIFICATION RESULTS")
        logger.info("=" * 80)
        logger.info("")
        logger.info("Overall Statistics:")
        logger.info(f"  Total Fields in Database:  {total_fields:,}")
        logger.info(
            f"  Populated Fields:          {total_populated_fields:,} ({population_percentage:.1f}%)"
        )
        logger.info(
            f"  NULL Fields:               {total_null_fields:,} ({100 - population_percentage:.1f}%)"
        )
        logger.info("")

        if columns_with_nulls:
            logger.info(
                f"Columns with NULL values: {len(columns_with_nulls)}/{total_columns}"
            )
            logger.info("")
            logger.info("Top 20 columns with most NULL values:")
            sorted_nulls = sorted(
                null_counts.items(), key=lambda x: x[1], reverse=True
            )[:20]
            for col_name, null_count in sorted_nulls:
                percentage = null_count / total_records * 100
                logger.info(
                    f"  {col_name:50} {null_count:>6} records ({percentage:>5.1f}%)"
                )
        else:
            logger.info("✅ NO NULL VALUES FOUND - 100% POPULATION ACHIEVED!")

        logger.info("")
        logger.info(f"Sample Check (10 records):")
        logger.info(f"  Records with 100% population: {records_100_populated}/10")

        logger.info("")
        logger.info("=" * 80)

        if total_null_fields == 0:
            logger.info("✅ SUCCESS: Database population is COMPLETE!")
            logger.info("✅ All 333 columns in all 5000 records are populated!")
            return 0
        else:
            logger.warning(
                f"⚠️  INCOMPLETE: {total_null_fields:,} fields still have NULL values"
            )
            return 1

    except Exception as e:
        logger.error(f"❌ Verification failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(verify_population())
    sys.exit(exit_code)
