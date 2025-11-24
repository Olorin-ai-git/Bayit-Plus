#!/usr/bin/env python3
"""
Populate 1999 Additional Records with Fraud Patterns

Uses the same successful approach as regenerate_complete_record.py
but repeats 1999 times with fraud pattern variations.

Author: Gil Klainert
Date: 2025-11-06
Version: 1.0.0

Usage:
    poetry run python scripts/populate_1999_fraud_records.py
"""

import asyncio
import sys
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timedelta
import random

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.populate_all_333_columns import ComprehensiveDataGenerator
from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


# Fraud pattern data pools
FRAUD_IPS = [
    "185.220.101.42", "185.220.101.43", "185.220.101.44",  # Russia
    "117.22.69.113", "117.22.69.114", "117.22.69.115",     # China
    "41.17.184.175", "41.17.184.176", "41.17.184.177",     # Nigeria
    "123.251.74.248", "123.251.74.249", "123.251.74.250",  # Vietnam
]

FRAUD_EMAILS = [
    "suspicious.user@fraud-example.com",
    "scammer@temp-mail.org",
    "fraudster@10minutemail.com",
    "fake.user@guerrillamail.com",
]


async def populate_1999_records():
    """Populate 1999 records using the same method as the first record."""
    import asyncpg

    config_loader = get_config_loader()
    pg_config = config_loader.load_postgresql_config()

    conn_str = f"postgresql://{pg_config['user']}:{pg_config['password']}@{pg_config['host']}:{pg_config['port']}/{pg_config['database']}"

    logger.info("=" * 80)
    logger.info("Populating 1999 Additional Records with Fraud Patterns")
    logger.info("=" * 80)

    try:
        conn = await asyncpg.connect(conn_str)
        logger.info(f"✅ Connected to PostgreSQL: {pg_config['database']}")

        schema = pg_config.get('schema', 'public')
        table = pg_config.get('transactions_table', 'transactions_enriched')
        full_table = f"{schema}.{table}"

        # Get current count
        current = await conn.fetchrow(f"SELECT COUNT(*) as count FROM {full_table}")
        logger.info(f"📊 Current records: {current['count']}")

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

        base_time = datetime.now()
        batch_size = 50
        total_inserted = 0

        for batch_start in range(0, 1999, batch_size):
            batch_end = min(batch_start + batch_size, 1999)

            async with conn.transaction():
                for i in range(batch_start, batch_end):
                    # Determine if this transaction is fraud (66% fraud rate)
                    is_fraud = (i % 3) != 0
                    is_high_risk = is_fraud or (i % 5 == 0)

                    context = {
                        'is_high_risk': is_high_risk,
                        'is_fraud': is_fraud
                    }

                    # Generate values for ALL columns
                    record = {}
                    for col_info in columns_info:
                        col_name = col_info['column_name']
                        data_type = col_info['data_type']

                        # Core required fields with varied realistic values
                        if col_name == 'tx_id_key':
                            record[col_name] = str(uuid4())
                        elif col_name == 'unique_user_id':
                            # Reuse some user IDs for account takeover patterns
                            if i % 10 == 0:
                                record[col_name] = f"user-{i % 100}"
                            else:
                                record[col_name] = str(uuid4())
                        elif col_name == 'email':
                            if is_fraud:
                                record[col_name] = f"user{i}@{random.choice(['temp-mail.org', '10minutemail.com', 'fraud-example.com'])}"
                            else:
                                record[col_name] = f"legitimate{i}@gmail.com"
                        elif col_name == 'first_name':
                            record[col_name] = random.choice(["John", "Jane", "Bob", "Alice", "Charlie", "Diana"])
                        elif col_name == 'last_name':
                            record[col_name] = random.choice(["Smith", "Jones", "Brown", "Wilson", "Taylor", "Moore"])
                        elif col_name == 'device_model':
                            record[col_name] = random.choice(["iPhone 13 Pro", "Samsung Galaxy S21", "Google Pixel 6", "iPhone 12"])
                        elif col_name == 'user_agent':
                            record[col_name] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)'
                        elif col_name == 'payment_method':
                            record[col_name] = 'credit_card'
                        elif col_name == 'processor':
                            record[col_name] = random.choice(['Stripe', 'PayPal', 'Square'])
                        elif col_name == 'card_holder_name':
                            record[col_name] = f"{record.get('first_name', 'John')} {record.get('last_name', 'Doe')}"
                        elif col_name == 'model_score':
                            if is_fraud:
                                record[col_name] = round(random.uniform(0.75, 0.99), 2)
                            else:
                                record[col_name] = round(random.uniform(0.10, 0.50), 2)
                        elif col_name == 'maxmind_risk_score':
                            if is_fraud:
                                record[col_name] = round(random.uniform(0.70, 0.95), 2)
                            else:
                                record[col_name] = round(random.uniform(0.05, 0.45), 2)
                        elif col_name == 'nsure_last_decision':
                            record[col_name] = 'REJECT' if is_fraud else 'APPROVE'
                        elif col_name == 'is_failed_tx':
                            record[col_name] = 1 if is_fraud else 0
                        elif col_name == 'is_fraud_tx':
                            record[col_name] = 1 if is_fraud else 0
                        elif col_name == 'is_processor_rejected_due_to_fraud':
                            record[col_name] = 1 if (is_fraud and random.random() > 0.5) else 0
                        elif col_name == 'tx_datetime':
                            # Spread transactions over last 48 hours
                            record[col_name] = base_time - timedelta(hours=i % 48, minutes=i % 60)
                        elif col_name == 'ip':
                            # Use fraud IPs for patterns, vary others
                            if is_fraud:
                                # Create IP clustering pattern - same IPs used multiple times
                                record[col_name] = FRAUD_IPS[i % len(FRAUD_IPS)]
                            else:
                                # Generate unique legitimate IPs
                                record[col_name] = generator.generate_value(col_name, data_type, context)
                        else:
                            # Use generator for all other fields
                            value = generator.generate_value(col_name, data_type, context)
                            if value is not None:
                                record[col_name] = value

                    # Build INSERT statement
                    column_names = ', '.join(record.keys())
                    placeholders = ', '.join([f'${j+1}' for j in range(len(record))])
                    values = list(record.values())

                    insert_sql = f"""
                        INSERT INTO {full_table} ({column_names})
                        VALUES ({placeholders})
                    """

                    await conn.execute(insert_sql, *values)
                    total_inserted += 1

            # Progress logging
            progress_pct = (batch_end * 100) // 1999
            if (batch_start // batch_size) % 10 == 0:
                logger.info(f"Progress: {batch_end}/1999 ({progress_pct}%)")

        # Final verification
        final_count = await conn.fetchrow(f"SELECT COUNT(*) as count FROM {full_table}")
        fraud_count = await conn.fetchrow(f"SELECT COUNT(*) as count FROM {full_table} WHERE is_fraud_tx = 1")

        await conn.close()

        logger.info("")
        logger.info("=" * 80)
        logger.info("POPULATION COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Total records: {final_count['count']}")
        logger.info(f"Fraud records: {fraud_count['count']}")
        logger.info(f"Clean records: {final_count['count'] - fraud_count['count']}")
        logger.info(f"Fraud rate: ~{fraud_count['count'] * 100 // final_count['count']}%")
        logger.info("")
        logger.info("Detectable Fraud Patterns:")
        logger.info(f"  • IP Clustering: {len(FRAUD_IPS)} suspicious IPs reused across multiple transactions")
        logger.info("  • Account Takeover: Same user IDs with suspicious behavior")
        logger.info("  • Velocity Patterns: Transactions clustered in time")
        logger.info("  • Geographic Anomalies: High-risk country IPs")
        logger.info("  • Risk Score Patterns: High scores correlating with fraud")
        logger.info("=" * 80)

        return 0

    except Exception as e:
        logger.error(f"❌ Population failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(populate_1999_records())
    sys.exit(exit_code)
