#!/usr/bin/env python3
"""
Regenerate Complete Single Record with ALL 333 Columns

Deletes all existing records and creates ONE record with ALL 333 columns
populated with realistic fraud detection data using ComprehensiveDataGenerator.

Author: Gil Klainert
Date: 2025-11-06
Version: 1.0.0

Usage:
    poetry run python scripts/regenerate_complete_record.py
"""

import asyncio
import sys
from datetime import datetime
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger
from scripts.populate_all_333_columns import ComprehensiveDataGenerator

logger = get_bridge_logger(__name__)


async def regenerate_with_all_columns():
    """Delete all records and create one with ALL 333 columns populated."""
    import asyncpg

    config_loader = get_config_loader()
    pg_config = config_loader.load_postgresql_config()

    conn_str = f"postgresql://{pg_config['user']}:{pg_config['password']}@{pg_config['host']}:{pg_config['port']}/{pg_config['database']}"

    logger.info("=" * 80)
    logger.info("Regenerating Single Record with ALL 333 Columns")
    logger.info("=" * 80)

    try:
        conn = await asyncpg.connect(conn_str)
        logger.info(f"✅ Connected to PostgreSQL: {pg_config['database']}")

        schema = pg_config.get("schema", "public")
        table = pg_config.get("transactions_table", "transactions_enriched")
        full_table = f"{schema}.{table}"

        # Delete all records
        logger.info(f"🗑️  Deleting all records from {full_table}...")
        await conn.execute(f"DELETE FROM {full_table}")
        logger.info("✅ All records deleted")

        # Get all columns with types
        columns_query = """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'transactions_enriched'
            ORDER BY ordinal_position
        """
        columns_info = await conn.fetch(columns_query)
        logger.info(f"📊 Total columns: {len(columns_info)}")

        # Initialize generator
        generator = ComprehensiveDataGenerator()

        # High-risk fraud context
        context = {"is_high_risk": True, "is_fraud": True}

        # Generate values for ALL columns
        record = {}
        for col_info in columns_info:
            col_name = col_info["column_name"]
            data_type = col_info["data_type"]

            # Core required fields with realistic values
            if col_name == "tx_id_key":
                record[col_name] = str(uuid4())
            elif col_name == "unique_user_id":
                record[col_name] = str(uuid4())
            elif col_name == "email":
                record[col_name] = "suspicious.user@fraud-example.com"
            elif col_name == "first_name":
                record[col_name] = "John"
            elif col_name == "last_name":
                record[col_name] = "Doe"
            elif col_name == "device_model":
                record[col_name] = "iPhone 13 Pro"
            elif col_name == "user_agent":
                record[col_name] = (
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)"
                )
            elif col_name == "payment_method":
                record[col_name] = "credit_card"
            elif col_name == "processor":
                record[col_name] = "Stripe"
            elif col_name == "card_holder_name":
                record[col_name] = "John Doe"
            elif col_name == "model_score":
                record[col_name] = 0.92
            elif col_name == "maxmind_risk_score":
                record[col_name] = 0.88
            elif col_name == "nsure_last_decision":
                record[col_name] = "REJECT"
            elif col_name == "is_failed_tx":
                record[col_name] = 1
            elif col_name == "is_fraud_tx":
                record[col_name] = 1
            elif col_name == "is_processor_rejected_due_to_fraud":
                record[col_name] = 1
            else:
                # Use generator for all other fields
                value = generator.generate_value(col_name, data_type, context)
                if value is not None:
                    record[col_name] = value

        logger.info(f"🔧 Generated values for {len(record)} columns")

        # Build INSERT statement
        column_names = ", ".join(record.keys())
        placeholders = ", ".join([f"${i+1}" for i in range(len(record))])
        values = list(record.values())

        insert_sql = f"""
            INSERT INTO {full_table} ({column_names})
            VALUES ({placeholders})
        """

        await conn.execute(insert_sql, *values)
        logger.info("✅ Inserted comprehensive record with ALL columns")

        # Verify
        verify = await conn.fetchrow(f"SELECT COUNT(*) as count FROM {full_table}")
        populated_count = len(record)
        total_columns = len(columns_info)

        await conn.close()

        logger.info("")
        logger.info("=" * 80)
        logger.info("REGENERATION COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Total records: {verify['count']}")
        logger.info(f"Populated columns: {populated_count}/{total_columns}")
        logger.info(f"Coverage: {populated_count * 100 // total_columns}%")
        logger.info("=" * 80)

        return 0

    except Exception as e:
        logger.error(f"❌ Regeneration failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(regenerate_with_all_columns())
    sys.exit(exit_code)
