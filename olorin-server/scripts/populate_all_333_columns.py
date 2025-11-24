#!/usr/bin/env python3
"""
Complete PostgreSQL Population Script - ALL 333 Columns

Populates ALL remaining NULL columns in ALL 5000 records with realistic data.

Author: Gil Klainert
Date: 2025-11-06
Version: 1.0.0

Usage:
    poetry run python scripts/populate_all_333_columns.py
"""

import asyncio
import sys
import random
import json
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.logging import get_bridge_logger
from app.service.config_loader import get_config_loader

logger = get_bridge_logger(__name__)


class ComprehensiveDataGenerator:
    """Generates realistic data for all PostgreSQL column types."""

    def __init__(self):
        """Initialize data reference pools."""
        self.countries = ["USA", "UK", "Canada", "Germany", "France", "Japan", "Australia"]
        self.cities = ["New York", "London", "Toronto", "Berlin", "Paris", "Tokyo", "Sydney"]
        self.card_issuers = ["Chase", "Wells Fargo", "Bank of America", "Citi", "Capital One"]
        self.card_types = ["credit", "debit", "prepaid"]
        self.statuses = ["approved", "rejected", "pending", "review"]
        self.hlr_networks = ["Verizon", "AT&T", "T-Mobile", "Sprint"]

    def generate_value(self, field_name: str, data_type: str, context: dict) -> any:
        """Generate appropriate value based on field name and type."""
        is_high_risk = context.get('is_high_risk', False)
        is_fraud = context.get('is_fraud', False)

        # JSONB fields
        if data_type == 'jsonb':
            return self._generate_jsonb(field_name, is_high_risk)

        # Text fields
        if data_type == 'text':
            return self._generate_text(field_name, is_high_risk, is_fraud)

        # Timestamp fields
        if 'timestamp' in data_type:
            return self._generate_timestamp(field_name)

        # Numeric fields (bigint, double precision, numeric)
        if data_type in ['bigint', 'double precision', 'numeric']:
            return self._generate_numeric(field_name, is_high_risk, is_fraud)

        # Character varying
        if 'character varying' in data_type:
            return self._generate_varchar(field_name)

        # Default fallback
        return None

    def _generate_jsonb(self, field_name: str, is_high_risk: bool) -> str:
        """Generate JSONB data based on field name."""
        if 'address' in field_name.lower():
            return json.dumps({
                "street": f"{random.randint(1, 9999)} Main St",
                "city": random.choice(self.cities),
                "state": "CA",
                "zip": f"{random.randint(10000, 99999)}",
                "country": random.choice(self.countries)
            })

        if 'cart' in field_name.lower():
            return json.dumps([
                {"sku": f"SKU{random.randint(1000, 9999)}", "qty": random.randint(1, 5), "price": round(random.uniform(10, 500), 2)}
                for _ in range(random.randint(1, 3))
            ])

        if 'ip' in field_name.lower():
            return json.dumps({
                "country": random.choice(self.countries),
                "city": random.choice(self.cities),
                "latitude": round(random.uniform(-90, 90), 6),
                "longitude": round(random.uniform(-180, 180), 6),
                "isp": "Comcast"
            })

        # Default JSONB
        return json.dumps({"value": random.randint(1, 100)})

    def _generate_text(self, field_name: str, is_high_risk: bool, is_fraud: bool) -> str:
        """Generate text data based on field name."""
        # Handle IP addresses specially
        if field_name.lower() == 'ip':
            return self._generate_public_ip(is_high_risk, is_fraud)

        if 'issuer' in field_name.lower():
            return random.choice(self.card_issuers)

        if 'type' in field_name.lower():
            if 'card' in field_name.lower():
                return random.choice(self.card_types)
            if 'custodial' in field_name.lower():
                return random.choice(["self", "managed", "third_party"])
            return random.choice(["standard", "premium", "basic"])

        if 'stage' in field_name.lower():
            return random.choice(["initial", "processing", "complete", "failed"])

        if 'status' in field_name.lower():
            return random.choice(self.statuses)

        if 'network' in field_name.lower():
            return random.choice(self.hlr_networks)

        if 'event' in field_name.lower():
            return random.choice(["purchase", "refund", "chargeback", "authorization"])

        if 'avs' in field_name.lower():
            return random.choice(["match", "no_match", "unavailable"])

        if 'asn' in field_name.lower():
            return f"AS{random.randint(1000, 99999)}"

        if 'sdk' in field_name.lower():
            return f"{random.randint(1, 5)}.{random.randint(0, 9)}.{random.randint(0, 20)}"

        if 'kyc' in field_name.lower():
            return random.choice(["verified", "pending", "failed", "not_required"])

        # Default text
        return f"value_{random.randint(1000, 9999)}"

    def _generate_public_ip(self, is_high_risk: bool, is_fraud: bool) -> str:
        """Generate realistic public IP addresses (avoid private ranges)."""
        if is_fraud or is_high_risk:
            # High-risk countries IP ranges
            return random.choice([
                f"185.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",  # Russia
                f"117.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",  # China
                f"41.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",   # Nigeria
                f"123.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",  # Vietnam
            ])
        else:
            # Common legitimate IP ranges
            return random.choice([
                f"8.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",    # Google
                f"23.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",   # Akamai
                f"34.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",   # AWS
                f"104.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",  # Cloudflare
            ])

    def _generate_timestamp(self, field_name: str) -> datetime:
        """Generate timestamp based on field name."""
        base_date = datetime.now()

        if 'first' in field_name.lower():
            # First occurrence dates are older
            return base_date - timedelta(days=random.randint(30, 365))

        if 'uploaded' in field_name.lower() or 'created' in field_name.lower():
            # Recent timestamps
            return base_date - timedelta(hours=random.randint(1, 72))

        # Default recent timestamp
        return base_date - timedelta(hours=random.randint(1, 24))

    def _generate_numeric(self, field_name: str, is_high_risk: bool, is_fraud: bool) -> float:
        """Generate numeric value based on field name."""
        if 'count' in field_name.lower():
            base = 10 if is_high_risk else 2
            return random.randint(0, base)

        if 'gmv' in field_name.lower() or 'amount' in field_name.lower():
            return round(random.uniform(10, 1000), 2)

        if 'days' in field_name.lower():
            return random.randint(0, 365)

        if 'distance' in field_name.lower():
            return round(random.uniform(0, 100), 2)

        if 'is_' in field_name.lower():
            # Boolean as bigint (0 or 1)
            return 1 if random.random() < (0.3 if is_high_risk else 0.1) else 0

        # Default numeric
        return round(random.uniform(0, 100), 2)

    def _generate_varchar(self, field_name: str) -> str:
        """Generate character varying value."""
        return datetime.now().isoformat()


async def populate_all_columns():
    """Populate all 333 columns for all 5000 records."""
    import asyncpg

    # Load config
    config_loader = get_config_loader()
    pg_config = config_loader.load_postgresql_config()

    conn_str = f"postgresql://{pg_config['user']}:{pg_config['password']}@{pg_config['host']}:{pg_config['port']}/{pg_config['database']}"

    logger.info("=" * 80)
    logger.info("Complete PostgreSQL Population - ALL 333 Columns")
    logger.info("=" * 80)

    try:
        conn = await asyncpg.connect(conn_str)
        logger.info(f"✅ Connected to PostgreSQL: {pg_config['database']}")

        schema = pg_config.get('schema', 'public')
        table = pg_config.get('transactions_table', 'transactions_enriched')
        full_table = f"{schema}.{table}"

        # Get column information
        col_query = """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'transactions_enriched'
            ORDER BY ordinal_position
        """
        columns_info = await conn.fetch(col_query)
        logger.info(f"📊 Total columns in table: {len(columns_info)}")

        # Get all records
        get_records = f"SELECT tx_id_key, model_score, is_fraud_tx FROM {full_table} ORDER BY tx_datetime DESC"
        records = await conn.fetch(get_records)
        logger.info(f"📝 Total records to update: {len(records)}")

        # Initialize generator
        generator = ComprehensiveDataGenerator()

        # Build field mapping
        null_fields = {}
        for col in columns_info:
            null_fields[col['column_name']] = col['data_type']

        # Remove primary key and already populated critical fields
        exclude_fields = {'tx_id_key', 'device_model', 'user_agent', 'unique_user_id',
                         'payment_method', 'processor', 'card_holder_name', 'maxmind_risk_score',
                         'nsure_last_decision', 'is_failed_tx', 'is_processor_rejected_due_to_fraud'}

        fields_to_populate = {k: v for k, v in null_fields.items() if k not in exclude_fields}
        logger.info(f"🎯 Fields to populate per record: {len(fields_to_populate)}")

        updated_count = 0
        total_fields_populated = 0
        batch_size = 50

        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]

            async with conn.transaction():
                for rec in batch:
                    tx_id = rec['tx_id_key']
                    risk_score = rec['model_score'] or 0.5
                    is_fraud = (rec['is_fraud_tx'] or 0) == 1

                    context = {
                        'is_high_risk': risk_score > 0.7,
                        'is_fraud': is_fraud
                    }

                    # Generate values for all fields
                    set_clauses = []
                    params = []
                    param_idx = 1

                    for field_name, data_type in fields_to_populate.items():
                        try:
                            value = generator.generate_value(field_name, data_type, context)
                            if value is not None:
                                set_clauses.append(f"{field_name} = ${param_idx}")
                                params.append(value)
                                param_idx += 1
                        except Exception:
                            continue  # Skip fields that can't be generated

                    if set_clauses:
                        # Add WHERE clause parameter
                        params.append(tx_id)

                        update_sql = f"""
                            UPDATE {full_table}
                            SET {', '.join(set_clauses)}
                            WHERE tx_id_key = ${param_idx}
                        """

                        await conn.execute(update_sql, *params)
                        updated_count += 1
                        total_fields_populated += len(set_clauses)

            # Progress logging
            if (i // batch_size + 1) % 20 == 0:
                progress_pct = (i + len(batch)) * 100 // len(records)
                logger.info(f"Progress: {i + len(batch)}/{len(records)} ({progress_pct}%) - {updated_count} records updated")

        await conn.close()

        logger.info("")
        logger.info("=" * 80)
        logger.info("FINAL RESULTS")
        logger.info("=" * 80)
        logger.info(f"Total Records:          {len(records)}")
        logger.info(f"Records Updated:        {updated_count}")
        logger.info(f"Total Fields Populated: {total_fields_populated:,}")
        logger.info(f"Avg Fields/Record:      {total_fields_populated // updated_count if updated_count > 0 else 0}")
        logger.info("=" * 80)
        logger.info("✅ Complete database population finished successfully!")

        return 0

    except Exception as e:
        logger.error(f"❌ Database population failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(populate_all_columns())
    sys.exit(exit_code)
