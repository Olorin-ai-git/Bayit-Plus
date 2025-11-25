#!/usr/bin/env python3
"""
Fix IP Addresses in PostgreSQL Database

Replaces placeholder IP values with realistic public IP addresses.

Author: Gil Klainert
Date: 2025-11-06
Version: 1.0.0

Usage:
    poetry run python scripts/fix_ip_addresses.py
"""

import asyncio
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def generate_public_ip(is_high_risk: bool, is_fraud: bool) -> str:
    """Generate realistic public IP addresses (avoid private ranges)."""
    if is_fraud or is_high_risk:
        # High-risk countries IP ranges
        return random.choice(
            [
                f"185.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",  # Russia
                f"117.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",  # China
                f"41.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",  # Nigeria
                f"123.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",  # Vietnam
            ]
        )
    else:
        # Common legitimate IP ranges
        return random.choice(
            [
                f"8.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",  # Google
                f"23.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",  # Akamai
                f"34.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",  # AWS
                f"104.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",  # Cloudflare
            ]
        )


async def fix_ip_addresses():
    """Fix IP addresses in all records."""
    import asyncpg

    config_loader = get_config_loader()
    pg_config = config_loader.load_postgresql_config()

    conn_str = f"postgresql://{pg_config['user']}:{pg_config['password']}@{pg_config['host']}:{pg_config['port']}/{pg_config['database']}"

    logger.info("=" * 80)
    logger.info("Fixing IP Addresses in PostgreSQL")
    logger.info("=" * 80)

    try:
        conn = await asyncpg.connect(conn_str)
        logger.info(f"✅ Connected to PostgreSQL: {pg_config['database']}")

        schema = pg_config.get("schema", "public")
        table = pg_config.get("transactions_table", "transactions_enriched")
        full_table = f"{schema}.{table}"

        # Get all records
        query = f"SELECT tx_id_key, model_score, is_fraud_tx FROM {full_table}"
        records = await conn.fetch(query)
        logger.info(f"📝 Updating IP addresses for {len(records)} records")

        updated_count = 0
        batch_size = 100

        for i in range(0, len(records), batch_size):
            batch = records[i : i + batch_size]

            async with conn.transaction():
                for rec in batch:
                    tx_id = rec["tx_id_key"]
                    risk_score = rec["model_score"] or 0.5
                    is_fraud = (rec["is_fraud_tx"] or 0) == 1
                    is_high_risk = risk_score > 0.7

                    # Generate new IP
                    new_ip = generate_public_ip(is_high_risk, is_fraud)

                    # Update
                    update_sql = f"""
                        UPDATE {full_table}
                        SET ip = $1
                        WHERE tx_id_key = $2
                    """

                    await conn.execute(update_sql, new_ip, tx_id)
                    updated_count += 1

            if (i // batch_size + 1) % 10 == 0:
                progress_pct = (i + len(batch)) * 100 // len(records)
                logger.info(
                    f"Progress: {i + len(batch)}/{len(records)} ({progress_pct}%)"
                )

        await conn.close()

        logger.info("")
        logger.info("=" * 80)
        logger.info("FINAL RESULTS")
        logger.info("=" * 80)
        logger.info(f"Total Records:   {len(records)}")
        logger.info(f"IPs Updated:     {updated_count}")
        logger.info("=" * 80)
        logger.info("✅ IP addresses fixed successfully!")

        return 0

    except Exception as e:
        logger.error(f"❌ Failed to fix IP addresses: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(fix_ip_addresses())
    sys.exit(exit_code)
