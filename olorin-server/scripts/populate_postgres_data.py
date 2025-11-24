#!/usr/bin/env python3
"""
PostgreSQL Data Population Script - Comprehensive Field Population

This script populates ALL NULL columns in the transactions_enriched table
with realistic fraud detection data for all 5000 records.

Author: Gil Klainert
Date: 2025-11-06
Version: 1.0.0

Usage:
    poetry run python scripts/populate_postgres_data.py
"""

import asyncio
import sys
from typing import Dict, List, Optional
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.agent.tools.database_tool.postgres_client import PostgreSQLProvider
from app.service.logging import get_bridge_logger
from scripts.data_generators import FraudDataGenerator

logger = get_bridge_logger(__name__)


class DataPopulator:
    """Populates NULL columns with realistic fraud detection data."""

    def __init__(self):
        """Initialize with PostgreSQL provider and data generator."""
        self.db = PostgreSQLProvider()
        self.generator = FraudDataGenerator()

    async def populate_all_fields(self) -> Dict[str, int]:
        """
        Populate all NULL fields in all records.

        Returns:
            Dictionary with update statistics
        """
        logger.info("Starting comprehensive data population for all 5000 records...")

        stats = {
            "total_records": 0,
            "records_updated": 0,
            "fields_populated": 0,
            "errors": 0
        }

        try:
            # Get all records with their current state
            table_name = self.db.get_full_table_name()
            query = f"""
                SELECT tx_id_key, tx_datetime, email, ip, user_id,
                       device_id, model_score, paid_amount_value
                FROM {table_name}
                ORDER BY tx_datetime DESC
            """

            records = await self.db.execute_query(query)
            stats["total_records"] = len(records)

            logger.info(f"Retrieved {len(records)} records to populate")

            # Process in batches for efficiency
            batch_size = 100
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                batch_stats = await self._populate_batch(batch)

                stats["records_updated"] += batch_stats["updated"]
                stats["fields_populated"] += batch_stats["fields"]

                logger.info(
                    f"Processed batch {i//batch_size + 1}/{(len(records)-1)//batch_size + 1}: "
                    f"{batch_stats['updated']} records, {batch_stats['fields']} fields"
                )

            logger.info(
                f"✅ Data population complete: "
                f"{stats['records_updated']}/{stats['total_records']} records updated, "
                f"{stats['fields_populated']} fields populated"
            )

        except Exception as e:
            logger.error(f"Data population failed: {e}")
            stats["errors"] = 1
            raise

        return stats

    async def _populate_batch(self, batch: List[Dict]) -> Dict[str, int]:
        """Populate a batch of records."""
        stats = {"updated": 0, "fields": 0}

        table_name = self.db.get_full_table_name()

        for record in batch:
            tx_id = record["tx_id_key"]
            base_data = self._generate_realistic_data(record)

            # Build UPDATE query for this record
            update_query = self._build_update_query(table_name, tx_id, base_data)

            if update_query:
                try:
                    await self.db.execute_query(update_query)
                    stats["updated"] += 1
                    stats["fields"] += len(base_data)
                except Exception as e:
                    logger.error(f"Failed to update {tx_id}: {e}")

        return stats

    def _generate_realistic_data(self, record: Dict) -> Dict[str, any]:
        """Generate realistic data based on existing record context."""
        return self.generator.generate_all_fields(record)

    def _build_update_query(self, table: str, tx_id: str, data: Dict) -> Optional[str]:
        """Build UPDATE query from data dictionary."""
        if not data:
            return None

        set_clauses = []
        for col, val in data.items():
            if isinstance(val, bool):
                set_clauses.append(f"{col} = {val}")
            elif isinstance(val, (int, float)):
                set_clauses.append(f"{col} = {val}")
            elif val is None:
                set_clauses.append(f"{col} = NULL")
            else:
                # Escape single quotes in strings
                escaped = str(val).replace("'", "''")
                set_clauses.append(f"{col} = '{escaped}'")

        return f"UPDATE {table} SET {', '.join(set_clauses)} WHERE tx_id_key = '{tx_id}'"


async def main():
    """Main execution function."""
    logger.info("=" * 80)
    logger.info("PostgreSQL Data Population - Comprehensive Field Population")
    logger.info("=" * 80)

    populator = DataPopulator()

    try:
        stats = await populator.populate_all_fields()

        logger.info("")
        logger.info("=" * 80)
        logger.info("FINAL STATISTICS")
        logger.info("=" * 80)
        logger.info(f"Total Records:     {stats['total_records']}")
        logger.info(f"Records Updated:   {stats['records_updated']}")
        logger.info(f"Fields Populated:  {stats['fields_populated']}")
        logger.info(f"Errors:            {stats['errors']}")
        logger.info("=" * 80)

        if stats["errors"] == 0:
            logger.info("✅ Data population completed successfully!")
            return 0
        else:
            logger.error("❌ Data population completed with errors")
            return 1

    except Exception as e:
        logger.error(f"❌ Data population failed: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
