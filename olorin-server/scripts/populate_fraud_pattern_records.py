#!/usr/bin/env python3
"""
Populate 1999 Records with Detectable Fraud Patterns

Creates realistic fraud transaction records that reveal patterns:
- IP address clustering (same suspicious IPs)
- Velocity attacks (rapid transactions)
- Geographic mismatches (billing vs shipping vs IP)
- Device fingerprint anomalies
- Stolen card patterns (same card, different users)
- Account takeover patterns

Author: Gil Klainert
Date: 2025-11-06
Version: 1.0.0

Usage:
    poetry run python scripts/populate_fraud_pattern_records.py
"""

import asyncio
import json
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger
from scripts.populate_all_333_columns import ComprehensiveDataGenerator

logger = get_bridge_logger(__name__)


class FraudPatternGenerator:
    """Generates transaction records with detectable fraud patterns."""

    def __init__(self):
        self.base_generator = ComprehensiveDataGenerator()

        # Fraud pattern IPs (will be reused across multiple transactions)
        self.fraud_ips = [
            "185.220.101.42",  # Russia - used in 50+ transactions
            "185.220.101.43",  # Russia - velocity attack IP
            "117.22.69.113",  # China - card testing IP
            "117.22.69.114",  # China - account takeover IP
            "41.17.184.175",  # Nigeria - BIN attack IP
            "41.17.184.176",  # Nigeria - shipping fraud IP
            "123.251.74.248",  # Vietnam - gift card fraud IP
            "123.251.74.249",  # Vietnam - velocity pattern
        ]

        # Compromised card details (reused across users)
        self.stolen_cards = [
            {"bin": "424242", "last_four": "4242", "brand": "Visa", "issuer": "Chase"},
            {
                "bin": "555555",
                "last_four": "5555",
                "brand": "Mastercard",
                "issuer": "Citi",
            },
            {
                "bin": "378282",
                "last_four": "1007",
                "brand": "Amex",
                "issuer": "American Express",
            },
        ]

        # Suspicious email domains
        self.fraud_email_domains = [
            "temp-mail.org",
            "10minutemail.com",
            "guerrillamail.com",
            "mailinator.com",
        ]

        # Device fingerprints (reused by fraudsters)
        self.fraud_devices = [
            {"id": str(uuid4()), "model": "iPhone 13 Pro", "os": "iOS 16.5"},
            {"id": str(uuid4()), "model": "Samsung Galaxy S21", "os": "Android 12"},
            {"id": str(uuid4()), "model": "iPhone 12", "os": "iOS 15.7"},
        ]

        # Shipping addresses for fraud
        self.drop_addresses = [
            {
                "street": "123 Abandoned Building",
                "city": "New York",
                "state": "NY",
                "zip": "10001",
                "country": "US",
            },
            {
                "street": "456 Vacant Lot",
                "city": "Los Angeles",
                "state": "CA",
                "zip": "90001",
                "country": "US",
            },
            {
                "street": "789 Empty Office",
                "city": "Miami",
                "state": "FL",
                "zip": "33101",
                "country": "US",
            },
        ]

    def generate_fraud_pattern_record(self, record_num: int, base_time: datetime):
        """Generate a record with specific fraud pattern."""

        # Determine fraud pattern type for this record
        pattern_type = record_num % 8

        # Base context
        is_fraud = record_num % 3 != 0  # 66% fraud rate
        is_high_risk = is_fraud or (record_num % 5 == 0)

        context = {"is_high_risk": is_high_risk, "is_fraud": is_fraud}

        # Generate base record
        record = {}

        # Pattern 1: IP Clustering (same IPs used repeatedly)
        if pattern_type == 0:
            ip_address = self.fraud_ips[0]  # Same Russia IP
            email_domain = random.choice(self.fraud_email_domains)
            user_id = str(uuid4())
            email = f"user{record_num}@{email_domain}"

        # Pattern 2: Velocity Attack (rapid transactions from same IP)
        elif pattern_type == 1:
            ip_address = self.fraud_ips[1]
            time_offset = timedelta(minutes=record_num % 60)  # All within 1 hour
            base_time = base_time + time_offset
            email_domain = random.choice(self.fraud_email_domains)
            user_id = str(uuid4())
            email = f"rapid{record_num}@{email_domain}"

        # Pattern 3: Stolen Card Pattern (same card, different users)
        elif pattern_type == 2:
            stolen_card = self.stolen_cards[record_num % len(self.stolen_cards)]
            ip_address = random.choice(self.fraud_ips)
            email_domain = random.choice(self.fraud_email_domains)
            user_id = str(uuid4())
            email = f"victim{record_num}@example.com"

        # Pattern 4: Account Takeover (legitimate user, suspicious behavior)
        elif pattern_type == 3:
            ip_address = self.fraud_ips[3]  # Different IP than usual
            user_id = f"legitimate-user-{record_num % 50}"  # Reuse user IDs
            email = f"realuser{record_num % 50}@gmail.com"

        # Pattern 5: BIN Attack (testing multiple cards from same IP)
        elif pattern_type == 4:
            ip_address = self.fraud_ips[4]
            bin_number = f"{400000 + (record_num % 100):06d}"
            email_domain = random.choice(self.fraud_email_domains)
            user_id = str(uuid4())
            email = f"tester{record_num}@{email_domain}"

        # Pattern 6: Shipping Fraud (mismatched addresses)
        elif pattern_type == 5:
            ip_address = random.choice(self.fraud_ips[:3])  # Russia/China IPs
            drop_address = random.choice(self.drop_addresses)  # US addresses
            email_domain = random.choice(self.fraud_email_domains)
            user_id = str(uuid4())
            email = f"shipper{record_num}@{email_domain}"

        # Pattern 7: Gift Card Fraud (high-value gift card purchases)
        elif pattern_type == 6:
            ip_address = self.fraud_ips[6]
            email_domain = random.choice(self.fraud_email_domains)
            user_id = str(uuid4())
            email = f"giftcard{record_num}@{email_domain}"
            product_type = "gift_card"
            amount = random.choice([500.00, 1000.00, 2500.00])

        # Pattern 8: Device Fingerprint Reuse
        else:
            ip_address = random.choice(self.fraud_ips)
            fraud_device = self.fraud_devices[record_num % len(self.fraud_devices)]
            email_domain = random.choice(self.fraud_email_domains)
            user_id = str(uuid4())
            email = f"device{record_num}@{email_domain}"

        # Build complete record with all fields
        tx_id = str(uuid4())
        tx_datetime = base_time - timedelta(hours=record_num % 48)  # Spread over 2 days

        # Core fields
        record["tx_id_key"] = tx_id
        record["unique_user_id"] = user_id if "user_id" in locals() else str(uuid4())
        record["tx_datetime"] = tx_datetime
        record["email"] = (
            email if "email" in locals() else f"user{record_num}@fraud-example.com"
        )

        # Names
        first_names = [
            "John",
            "Jane",
            "Bob",
            "Alice",
            "Charlie",
            "Diana",
            "Frank",
            "Grace",
        ]
        last_names = [
            "Smith",
            "Jones",
            "Brown",
            "Wilson",
            "Taylor",
            "Anderson",
            "Thomas",
            "Moore",
        ]
        record["first_name"] = random.choice(first_names)
        record["last_name"] = random.choice(last_names)
        record["phone_number"] = f"+1-555-{random.randint(1000, 9999):04d}"

        # IP and network
        record["ip"] = (
            ip_address if "ip_address" in locals() else random.choice(self.fraud_ips)
        )
        record["ip_country_code"] = (
            "RU"
            if record["ip"].startswith("185")
            else "CN" if record["ip"].startswith("117") else "NG"
        )

        # Device
        if "fraud_device" in locals():
            record["device_id"] = fraud_device["id"]
            record["device_model"] = fraud_device["model"]
            record["device_os_version"] = fraud_device["os"]
        else:
            record["device_id"] = str(uuid4())
            record["device_model"] = random.choice(
                ["iPhone 13 Pro", "Samsung Galaxy S21", "Google Pixel 6"]
            )
            record["device_os_version"] = random.choice(
                ["iOS 16.5", "Android 12", "Android 13"]
            )

        record["device_type"] = "mobile"
        record["user_agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)"

        # Payment
        if "stolen_card" in locals():
            record["bin"] = stolen_card["bin"]
            record["last_four"] = stolen_card["last_four"]
            record["card_brand"] = stolen_card["brand"]
            record["card_issuer"] = stolen_card["issuer"]
        else:
            record["bin"] = (
                bin_number
                if "bin_number" in locals()
                else f"{random.randint(400000, 499999):06d}"
            )
            record["last_four"] = f"{random.randint(1000, 9999):04d}"
            record["card_brand"] = random.choice(["Visa", "Mastercard", "Amex"])
            record["card_issuer"] = random.choice(["Chase", "Citi", "Wells Fargo"])

        record["payment_method"] = "credit_card"
        record["processor"] = "Stripe"
        record["card_holder_name"] = f"{record['first_name']} {record['last_name']}"
        record["paid_amount_value_in_currency"] = (
            amount if "amount" in locals() else round(random.uniform(50, 1500), 2)
        )

        # Risk scores
        if is_fraud:
            record["model_score"] = round(random.uniform(0.75, 0.99), 2)
            record["maxmind_risk_score"] = round(random.uniform(0.70, 0.95), 2)
            record["is_fraud_tx"] = 1
            record["nsure_last_decision"] = random.choice(["REJECT", "REVIEW"])
            record["is_failed_tx"] = 1
            record["is_processor_rejected_due_to_fraud"] = random.choice([0, 1])
        else:
            record["model_score"] = round(random.uniform(0.10, 0.50), 2)
            record["maxmind_risk_score"] = round(random.uniform(0.05, 0.45), 2)
            record["is_fraud_tx"] = 0
            record["nsure_last_decision"] = "APPROVE"
            record["is_failed_tx"] = 0
            record["is_processor_rejected_due_to_fraud"] = 0

        # Addresses with geographic mismatches for fraud
        if "drop_address" in locals():
            shipping = drop_address
        else:
            shipping = {
                "street": f"{random.randint(100, 9999)} Main St",
                "city": random.choice(
                    ["New York", "Los Angeles", "Chicago", "Houston"]
                ),
                "state": random.choice(["NY", "CA", "IL", "TX"]),
                "zip": f"{random.randint(10000, 99999):05d}",
                "country": "US",
            }

        if is_fraud and pattern_type == 5:
            # Billing in Russia, Shipping in US
            billing = {
                "street": "Red Square 1",
                "city": "Moscow",
                "state": "Moscow Oblast",
                "zip": "101000",
                "country": "RU",
            }
        else:
            billing = shipping.copy()

        record["billing_address"] = json.dumps(billing)

        # Velocity indicators (higher for fraud)
        if is_fraud:
            record["user_tx_count_last_24h"] = random.randint(5, 25)
            record["ip_tx_count_last_24h"] = random.randint(10, 50)
            record["device_tx_count_last_24h"] = random.randint(8, 35)
        else:
            record["user_tx_count_last_24h"] = random.randint(0, 3)
            record["ip_tx_count_last_24h"] = random.randint(1, 5)
            record["device_tx_count_last_24h"] = random.randint(0, 4)

        # Flags
        record["is_sent_for_nsure_review"] = 1 if is_fraud else 0
        record["is_anonymous"] = 0
        record["is_gifting"] = 1 if pattern_type == 6 else 0
        record["is_delivery_method_email_only"] = 1 if pattern_type == 6 else 0
        record["count_triggered_rules"] = (
            random.randint(5, 12) if is_fraud else random.randint(0, 3)
        )
        record["is_reviewed"] = 1
        record["is_suspicious_amount"] = (
            1 if record["paid_amount_value_in_currency"] > 500 else 0
        )
        record["fipp_is_incognito"] = (
            True if is_fraud and random.random() > 0.5 else False
        )
        record["is_user_first_tx_event"] = 1 if pattern_type == 3 else 0
        record["is_digital"] = 1 if pattern_type == 6 else 0

        return record, context


async def populate_fraud_patterns():
    """Populate 1999 records with fraud patterns."""
    import asyncpg

    config_loader = get_config_loader()
    pg_config = config_loader.load_postgresql_config()

    conn_str = f"postgresql://{pg_config['user']}:{pg_config['password']}@{pg_config['host']}:{pg_config['port']}/{pg_config['database']}"

    logger.info("=" * 80)
    logger.info("Populating 1999 Records with Fraud Patterns")
    logger.info("=" * 80)

    try:
        conn = await asyncpg.connect(conn_str)
        logger.info(f"✅ Connected to PostgreSQL: {pg_config['database']}")

        schema = pg_config.get("schema", "public")
        table = pg_config.get("transactions_table", "transactions_enriched")
        full_table = f"{schema}.{table}"

        # Get current count
        current_count = await conn.fetchrow(
            f"SELECT COUNT(*) as count FROM {full_table}"
        )
        logger.info(f"📊 Current records: {current_count['count']}")

        # Get all columns with types
        columns_query = """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'transactions_enriched'
            ORDER BY ordinal_position
        """
        columns_info = await conn.fetch(columns_query)

        # Initialize generators
        pattern_gen = FraudPatternGenerator()
        base_gen = ComprehensiveDataGenerator()

        base_time = datetime.now()

        # Generate 1999 records
        batch_size = 100
        total_inserted = 0

        for batch_start in range(0, 1999, batch_size):
            batch_end = min(batch_start + batch_size, 1999)

            async with conn.transaction():
                for i in range(batch_start, batch_end):
                    # Generate pattern-based record
                    record, context = pattern_gen.generate_fraud_pattern_record(
                        i, base_time
                    )

                    # Fill remaining columns with base generator
                    for col_info in columns_info:
                        col_name = col_info["column_name"]
                        if col_name not in record:
                            value = base_gen.generate_value(
                                col_name, col_info["data_type"], context
                            )
                            if value is not None:
                                record[col_name] = value

                    # Insert record
                    column_names = ", ".join(record.keys())
                    placeholders = ", ".join([f"${j+1}" for j in range(len(record))])
                    values = list(record.values())

                    insert_sql = f"""
                        INSERT INTO {full_table} ({column_names})
                        VALUES ({placeholders})
                    """

                    await conn.execute(insert_sql, *values)
                    total_inserted += 1

            # Progress logging
            progress_pct = (batch_end * 100) // 1999
            logger.info(
                f"Progress: {batch_end}/1999 ({progress_pct}%) - Fraud patterns inserted"
            )

        # Final verification
        final_count = await conn.fetchrow(f"SELECT COUNT(*) as count FROM {full_table}")

        # Count fraud records
        fraud_count = await conn.fetchrow(
            f"SELECT COUNT(*) as count FROM {full_table} WHERE is_fraud_tx = 1"
        )

        await conn.close()

        logger.info("")
        logger.info("=" * 80)
        logger.info("FRAUD PATTERN POPULATION COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Total records: {final_count['count']}")
        logger.info(f"Fraud records: {fraud_count['count']}")
        logger.info(f"Clean records: {final_count['count'] - fraud_count['count']}")
        logger.info(
            f"Fraud rate: {fraud_count['count'] * 100 // final_count['count']}%"
        )
        logger.info("")
        logger.info("Fraud Patterns Included:")
        logger.info("  1. IP Clustering - Same suspicious IPs reused")
        logger.info("  2. Velocity Attacks - Rapid transactions from same IP")
        logger.info("  3. Stolen Cards - Same cards used by multiple users")
        logger.info("  4. Account Takeover - Legitimate users, suspicious behavior")
        logger.info("  5. BIN Testing - Multiple cards tested from same IP")
        logger.info("  6. Shipping Fraud - Geographic mismatches")
        logger.info("  7. Gift Card Fraud - High-value gift card purchases")
        logger.info("  8. Device Reuse - Same device fingerprints across users")
        logger.info("=" * 80)

        return 0

    except Exception as e:
        logger.error(f"❌ Population failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(populate_fraud_patterns())
    sys.exit(exit_code)
