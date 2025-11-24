#!/usr/bin/env python3
"""
Fix Placeholder Values in Database

Replaces all "value_XXXX" placeholders with realistic fraud detection data.

Author: Gil Klainert
Date: 2025-11-06
Version: 1.0.0

Usage:
    poetry run python scripts/fix_placeholder_values.py
"""

import asyncio
import sys
import random
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.logging import get_bridge_logger
from app.service.config_loader import get_config_loader

logger = get_bridge_logger(__name__)


class RealisticDataGenerator:
    """Generates realistic fraud detection data for all placeholder columns."""

    def __init__(self):
        """Initialize realistic data pools."""
        # Countries and locations
        self.high_risk_countries = ["RU", "CN", "NG", "VN", "PK", "IN", "ID"]
        self.safe_countries = ["US", "GB", "CA", "DE", "FR", "AU", "JP", "SE"]

        # Card data
        self.card_brands = ["Visa", "Mastercard", "Amex", "Discover"]
        self.card_issuers = ["Chase", "Wells Fargo", "Bank of America", "Citi", "Capital One", "US Bank"]
        self.card_types = ["credit", "debit", "prepaid"]

        # ISPs
        self.isps = ["Comcast", "AT&T", "Verizon", "Charter", "CenturyLink", "Cox"]
        self.high_risk_isps = ["VPN Provider", "Tor Exit Node", "Proxy Service", "Hosting Provider"]

        # Merchants
        self.merchant_names = ["TechStore", "GameWorld", "DigitalGoods", "Electronics Plus", "Software Hub"]
        self.partners = ["PaymentGateway", "FraudGuard", "RiskShield", "SecurePayments"]

        # Decisions and statuses
        self.decisions = ["APPROVE", "REJECT", "REVIEW", "SOFT_APPROVE"]
        self.failure_reasons = [
            "Insufficient Funds", "Card Declined", "Risk Score Too High",
            "Fraud Detected", "Invalid CVV", "Expired Card"
        ]

        # Languages
        self.languages = ["en-US", "en-GB", "es-ES", "fr-FR", "de-DE", "ja-JP", "zh-CN"]

    def generate_phone_number(self, country_code: str = "+1") -> str:
        """Generate realistic phone number."""
        return f"{country_code}{random.randint(200, 999)}{random.randint(100, 999)}{random.randint(1000, 9999)}"

    def generate_device_id(self) -> str:
        """Generate realistic device fingerprint ID."""
        import uuid
        return str(uuid.uuid4())

    def generate_ip_country_code(self, is_fraud: bool) -> str:
        """Generate country code based on fraud status."""
        if is_fraud:
            return random.choice(self.high_risk_countries)
        return random.choice(self.safe_countries)

    def generate_isp(self, is_fraud: bool) -> str:
        """Generate ISP name."""
        if is_fraud and random.random() > 0.5:
            return random.choice(self.high_risk_isps)
        return random.choice(self.isps)

    def generate_card_brand(self) -> str:
        """Generate card brand."""
        return random.choice(self.card_brands)

    def generate_bin(self) -> str:
        """Generate Bank Identification Number."""
        return f"{random.randint(400000, 599999)}"

    def generate_last_four(self) -> str:
        """Generate last 4 digits of card."""
        return f"{random.randint(1000, 9999)}"

    def generate_merchant_name(self) -> str:
        """Generate merchant name."""
        return f"{random.choice(self.merchant_names)} #{random.randint(100, 999)}"

    def generate_decision(self, is_fraud: bool) -> str:
        """Generate decision based on fraud status."""
        if is_fraud:
            return random.choice(["REJECT", "REVIEW"])
        return random.choice(["APPROVE", "SOFT_APPROVE"])

    def generate_model_decision(self, model_score: float) -> str:
        """Generate model decision based on score."""
        if model_score > 0.7:
            return "REJECT"
        elif model_score > 0.5:
            return "REVIEW"
        return "APPROVE"

    def generate_value_for_column(self, column_name: str, is_fraud: bool, model_score: float) -> str:
        """Generate realistic value for any column."""
        col = column_name.lower()

        # IDs and identifiers
        if 'tx_id' in col or '_id' in col:
            import uuid
            return str(uuid.uuid4())[:random.randint(12, 36)]

        # Phone numbers
        if 'phone' in col:
            if 'country' in col:
                return random.choice(["+1", "+44", "+49", "+86", "+7"])
            return self.generate_phone_number()

        # Device
        if 'device_id' in col or 'visitor_id' in col:
            return self.generate_device_id()
        if 'device_os' in col:
            return random.choice(["iOS 16.5", "Android 13", "Windows 11", "macOS 13"])

        # Location
        if 'ip_country' in col or 'bin_country' in col or 'payment_method_country' in col:
            return self.generate_ip_country_code(is_fraud)
        if 'isp' in col:
            return self.generate_isp(is_fraud)

        # Card data
        if 'card_brand' in col:
            return self.generate_card_brand()
        if 'bin' in col:
            return self.generate_bin()
        if 'last_four' in col:
            return self.generate_last_four()
        if 'card_issuer' in col or col.endswith('issuer'):
            return random.choice(self.card_issuers)
        if 'card_type' in col:
            return random.choice(self.card_types)
        if 'card_category' in col:
            return random.choice(["consumer", "business", "corporate"])

        # Email
        if 'email' in col:
            if is_fraud:
                domains = ["temp-mail.org", "10minutemail.com", "guerrillamail.com"]
            else:
                domains = ["gmail.com", "yahoo.com", "outlook.com"]
            return f"user{random.randint(1000, 9999)}@{random.choice(domains)}"
        if 'email_domain' in col:
            if is_fraud:
                return random.choice(["temp-mail.org", "10minutemail.com"])
            return random.choice(["gmail.com", "yahoo.com", "outlook.com"])

        # Currency
        if 'currency' in col:
            return random.choice(["USD", "EUR", "GBP", "JPY", "CAD"])

        # Merchants and partners
        if 'merchant' in col or 'store' in col:
            if 'name' in col:
                return self.generate_merchant_name()
            if 'segment' in col:
                return f"segment_{random.randint(1, 10)}"
        if 'partner' in col:
            if 'name' in col:
                return random.choice(self.partners)
            if 'industry' in col:
                return random.choice(["ecommerce", "gaming", "travel", "services"])

        # Decisions and statuses
        if 'decision' in col:
            return self.generate_decision(is_fraud)
        if 'model_decision' in col:
            return self.generate_model_decision(model_score)
        if 'risk_mode' in col:
            return random.choice(["strict", "balanced", "lenient"])

        # Reasons
        if 'reason' in col:
            if is_fraud:
                return random.choice(self.failure_reasons)
            return random.choice(["Normal Transaction", "Approved", "Low Risk"])

        # Product info
        if 'product' in col:
            if 'platform' in col:
                return random.choice(["iOS", "Android", "Web", "Desktop"])
            if 'gametitle' in col or 'game' in col:
                return f"Game Title {random.randint(1, 100)}"
            return random.choice(["Digital Goods", "Physical Goods", "Services", "Subscription"])

        # Language
        if 'language' in col:
            return random.choice(self.languages)

        # Network
        if 'asn' in col:
            return f"AS{random.randint(1000, 99999)}"

        # Payment tokens
        if 'token' in col:
            return f"tok_{random.randint(100000, 999999)}"

        # Versions
        if 'version' in col:
            return f"{random.randint(1, 5)}.{random.randint(0, 9)}.{random.randint(0, 20)}"

        # KYC
        if 'kyc' in col or 'identity' in col:
            return random.choice(["verified", "pending", "failed", "not_required"])

        # Rule
        if 'rule' in col:
            if 'description' in col:
                return f"Fraud detection rule {random.randint(1, 100)}"
            return f"RULE_{random.randint(1, 50)}"

        # Attack
        if 'attack' in col:
            return random.choice(["brute_force", "credential_stuffing", "account_takeover", "none"])

        # 3D Secure
        if '3d' in col or 'three_d' in col:
            return random.choice(["success", "failed", "unavailable", "not_enrolled"])

        # Failure/Error categories
        if 'failure' in col or 'category' in col:
            return random.choice(["fraud", "technical", "customer_action", "system"])

        # Sellers
        if 'seller' in col:
            return f"seller_{random.randint(1000, 9999)}"

        # Default: generate realistic identifier
        return f"{column_name}_{random.randint(1000, 9999)}"


async def fix_placeholder_values():
    """Fix all placeholder values in the database."""
    import asyncpg

    config_loader = get_config_loader()
    pg_config = config_loader.load_postgresql_config()

    conn_str = f"postgresql://{pg_config['user']}:{pg_config['password']}@{pg_config['host']}:{pg_config['port']}/{pg_config['database']}"

    logger.info("=" * 80)
    logger.info("Fixing Placeholder Values - Replacing value_XXXX with Realistic Data")
    logger.info("=" * 80)

    try:
        conn = await asyncpg.connect(conn_str)
        logger.info(f"✅ Connected to PostgreSQL: {pg_config['database']}")

        schema = pg_config.get('schema', 'public')
        table = pg_config.get('transactions_table', 'transactions_enriched')
        full_table = f"{schema}.{table}"

        # Find all text columns with placeholders
        columns_query = '''
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'transactions_enriched'
            AND data_type IN ('text', 'character varying')
            ORDER BY ordinal_position
        '''
        text_columns = await conn.fetch(columns_query)

        generator = RealisticDataGenerator()

        # Get all records with fraud status
        records_query = f"SELECT tx_id_key, is_fraud_tx, model_score FROM {full_table}"
        records = await conn.fetch(records_query)

        logger.info(f"📝 Processing {len(records)} records across {len(text_columns)} text columns")

        updated_count = 0
        batch_size = 50

        for batch_start in range(0, len(records), batch_size):
            batch_end = min(batch_start + batch_size, len(records))
            batch_records = records[batch_start:batch_end]

            async with conn.transaction():
                for record in batch_records:
                    tx_id = record['tx_id_key']
                    is_fraud = record['is_fraud_tx'] == 1
                    model_score = record['model_score'] or 0.5

                    updates = {}

                    for col in text_columns:
                        col_name = col['column_name']

                        # Check if column has placeholder
                        check_query = f"SELECT {col_name} FROM {full_table} WHERE tx_id_key = $1"
                        current_value = await conn.fetchval(check_query, tx_id)

                        if current_value and str(current_value).startswith('value_'):
                            # Generate realistic replacement
                            new_value = generator.generate_value_for_column(
                                col_name, is_fraud, model_score
                            )
                            updates[col_name] = new_value

                    if updates:
                        # Build UPDATE statement
                        set_clauses = [f"{col} = ${i+2}" for i, col in enumerate(updates.keys())]
                        update_query = f"""
                            UPDATE {full_table}
                            SET {', '.join(set_clauses)}
                            WHERE tx_id_key = $1
                        """
                        values = [tx_id] + list(updates.values())
                        await conn.execute(update_query, *values)
                        updated_count += len(updates)

            # Progress logging
            if (batch_start // batch_size) % 10 == 0:
                progress = (batch_end * 100) // len(records)
                logger.info(f"Progress: {batch_end}/{len(records)} ({progress}%) - {updated_count} values updated")

        # Verify no placeholders remain
        remaining_placeholders = 0
        for col in text_columns:
            col_name = col['column_name']
            check_query = f"""
                SELECT COUNT(*)
                FROM {full_table}
                WHERE {col_name}::text LIKE 'value_%'
            """
            count = await conn.fetchval(check_query)
            if count > 0:
                remaining_placeholders += count
                logger.warning(f"⚠️  {col_name} still has {count} placeholders")

        await conn.close()

        logger.info("")
        logger.info("=" * 80)
        logger.info("PLACEHOLDER FIX COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Total values updated: {updated_count}")
        logger.info(f"Remaining placeholders: {remaining_placeholders}")

        if remaining_placeholders == 0:
            logger.info("✅ All placeholder values successfully replaced!")
        else:
            logger.warning(f"⚠️  {remaining_placeholders} placeholders still remain")

        logger.info("=" * 80)

        return 0 if remaining_placeholders == 0 else 1

    except Exception as e:
        logger.error(f"❌ Failed to fix placeholders: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(fix_placeholder_values())
    sys.exit(exit_code)
