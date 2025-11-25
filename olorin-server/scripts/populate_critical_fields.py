#!/usr/bin/env python3
"""
PostgreSQL Critical Fields Population Script

Populates NULL values for critical fraud detection fields that domain agents use.
Focuses on the most important fields for device, network, and risk analysis.

Author: Gil Klainert
Date: 2025-11-06
Version: 1.0.0

Usage:
    poetry run python scripts/populate_critical_fields.py
"""

import asyncio
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.agent.tools.database_tool.postgres_client import PostgreSQLProvider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class CriticalFieldsPopulator:
    """Populates critical NULL fields used by domain agents."""

    def __init__(self):
        """Initialize with PostgreSQL provider."""
        self.db = PostgreSQLProvider()

        # Reference data (realistic patterns for fraud detection)
        self.devices = [
            "iPhone 14 Pro",
            "Samsung Galaxy S23",
            "Google Pixel 7",
            "OnePlus 11",
            "Xiaomi 13",
            "iPad Pro",
            "MacBook Pro",
            "Dell XPS 13",
            "ThinkPad X1 Carbon",
        ]
        self.browsers = ["Chrome", "Safari", "Firefox", "Edge", "Opera"]
        self.os_list = ["iOS", "Android", "Windows", "macOS", "Linux"]
        self.processors = ["Stripe", "PayPal", "Square", "Authorize.net", "Adyen"]
        self.payment_methods = [
            "credit_card",
            "debit_card",
            "paypal",
            "apple_pay",
            "google_pay",
        ]
        self.decisions = ["APPROVED", "REJECTED", "REVIEW", "PENDING"]

    async def populate_all_records(self) -> Dict[str, int]:
        """Populate critical fields for all records."""
        logger.info("=" * 80)
        logger.info("Populating critical fraud detection fields...")
        logger.info("=" * 80)

        stats = {
            "total_records": 0,
            "records_updated": 0,
            "fields_populated": 0,
            "errors": 0,
        }

        try:
            table_name = self.db.get_full_table_name()

            # Get all records
            query = f"""
                SELECT tx_id_key, model_score, is_fraud_tx, ip
                FROM {table_name}
                ORDER BY tx_datetime DESC
            """

            records = await self.db.execute_query(query)
            stats["total_records"] = len(records)

            logger.info(f"Retrieved {len(records)} records to populate")

            # Process in batches
            batch_size = 100
            for i in range(0, len(records), batch_size):
                batch = records[i : i + batch_size]
                batch_stats = await self._populate_batch(batch, table_name)

                stats["records_updated"] += batch_stats["updated"]
                stats["fields_populated"] += batch_stats["fields"]

                if (i // batch_size + 1) % 10 == 0:
                    logger.info(
                        f"Progress: {i + len(batch)}/{len(records)} records "
                        f"({(i + len(batch)) * 100 // len(records)}%)"
                    )

            logger.info("")
            logger.info("=" * 80)
            logger.info("FINAL STATISTICS")
            logger.info("=" * 80)
            logger.info(f"Total Records:     {stats['total_records']}")
            logger.info(f"Records Updated:   {stats['records_updated']}")
            logger.info(f"Fields Populated:  {stats['fields_populated']}")
            logger.info(f"Errors:            {stats['errors']}")
            logger.info("=" * 80)

        except Exception as e:
            logger.error(f"Population failed: {e}", exc_info=True)
            stats["errors"] = 1
            raise

        return stats

    async def _populate_batch(
        self, batch: List[Dict], table_name: str
    ) -> Dict[str, int]:
        """Populate a batch of records."""
        stats = {"updated": 0, "fields": 0}

        for record in batch:
            tx_id = record["tx_id_key"]
            risk_score = record.get("model_score") or 0.5  # Handle NULL
            is_fraud = (record.get("is_fraud_tx") or 0) == 1  # Handle NULL

            # Generate field values
            fields = self._generate_critical_fields(risk_score, is_fraud)

            if fields:
                update_query = self._build_update_query(table_name, tx_id, fields)
                try:
                    await self.db.execute_query(update_query)
                    stats["updated"] += 1
                    stats["fields"] += len(fields)
                except Exception as e:
                    logger.error(f"Failed to update {tx_id}: {e}")

        return stats

    def _generate_critical_fields(self, risk_score: float, is_fraud: bool) -> Dict:
        """Generate values for critical fraud detection fields."""
        is_high_risk = risk_score > 0.7

        device_model = random.choice(self.devices)
        browser = random.choice(self.browsers)
        os_name = random.choice(self.os_list)

        return {
            # Device fields (critical for device agent)
            "device_model": device_model,
            "user_agent": f"Mozilla/5.0 ({os_name}) {browser}/{random.randint(90, 120)}.0",
            # User fields
            "unique_user_id": f"user_{random.randint(100000, 999999)}",
            "date_of_birth": (
                datetime.now() - timedelta(days=random.randint(18, 75) * 365)
            ),
            # Payment fields
            "payment_method": random.choice(self.payment_methods),
            "processor": random.choice(self.processors),
            "card_holder_name": f"User {random.randint(1, 1000)}",
            # Risk scoring fields
            "maxmind_risk_score": round(
                max(0, min(1, risk_score + random.uniform(-0.1, 0.1))), 3
            ),
            # Decision fields
            "nsure_last_decision": (
                "REJECTED" if is_fraud else random.choice(self.decisions)
            ),
            # Fraud indicators
            "is_failed_tx": 1 if is_fraud else (1 if random.random() < 0.1 else 0),
            "is_processor_rejected_due_to_fraud": (
                1 if is_fraud and random.random() < 0.5 else 0
            ),
            # Timestamps
            "table_record_created_at": datetime.now().isoformat(),
            "table_record_updated_at": datetime.now().isoformat(),
        }

    def _build_update_query(self, table: str, tx_id: str, data: Dict) -> str:
        """Build UPDATE query from data dictionary."""
        set_clauses = []

        for col, val in data.items():
            if isinstance(val, bool) or isinstance(val, int):
                set_clauses.append(f"{col} = {val}")
            elif isinstance(val, float):
                set_clauses.append(f"{col} = {val}")
            elif isinstance(val, datetime):
                set_clauses.append(f"{col} = '{val.isoformat()}'")
            elif val is None:
                set_clauses.append(f"{col} = NULL")
            else:
                # Escape single quotes in strings
                escaped = str(val).replace("'", "''")
                set_clauses.append(f"{col} = '{escaped}'")

        return (
            f"UPDATE {table} SET {', '.join(set_clauses)} WHERE tx_id_key = '{tx_id}'"
        )


async def main():
    """Main execution function."""
    logger.info("PostgreSQL Critical Fields Population - Starting...")

    populator = CriticalFieldsPopulator()

    try:
        stats = await populator.populate_all_records()

        if stats["errors"] == 0:
            logger.info("✅ Critical fields population completed successfully!")
            return 0
        else:
            logger.error("❌ Critical fields population completed with errors")
            return 1

    except Exception as e:
        logger.error(f"❌ Critical fields population failed: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
