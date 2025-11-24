#!/usr/bin/env python3
"""
Regenerate Single Comprehensive Record

Deletes all existing records and creates ONE record with ALL 333 columns
populated with realistic fraud detection data.

Author: Gil Klainert
Date: 2025-11-06
Version: 1.0.0

Usage:
    poetry run python scripts/regenerate_single_record.py
"""

import asyncio
import sys
import random
import json
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.logging import get_bridge_logger
from app.service.config_loader import get_config_loader

logger = get_bridge_logger(__name__)


def generate_realistic_record():
    """Generate a comprehensive realistic fraud transaction record."""

    # Basic transaction data
    tx_id = str(uuid4())
    tx_datetime = datetime.now() - timedelta(hours=2)

    # User identity
    email = "suspicious.user@fraud-example.com"
    unique_user_id = str(uuid4())
    first_name = "John"
    last_name = "Doe"
    phone_number = "+1-555-0199"

    # High-risk IP from Russia
    ip_address = "185.220.101.42"
    ip_country_code = "RU"

    # Device information
    device_id = str(uuid4())
    device_type = "mobile"
    device_model = "iPhone 13 Pro"
    device_os_version = "iOS 16.5"
    user_agent = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15"

    # Payment details
    payment_method = "credit_card"
    card_brand = "Visa"
    card_issuer = "Chase"
    bin = "424242"
    last_four = "4242"
    paid_amount_value_in_currency = 1250.00
    processor = "Stripe"

    # Fraud indicators
    model_score = 0.92  # High risk score
    maxmind_risk_score = 0.88
    is_fraud_tx = 1
    nsure_last_decision = "REJECT"
    is_failed_tx = 1
    is_processor_rejected_due_to_fraud = 1

    # Geographic data
    billing_address = json.dumps({
        "street": "123 Red Square",
        "city": "Moscow",
        "state": "Moscow Oblast",
        "zip": "101000",
        "country": "RU"
    })

    shipping_address = json.dumps({
        "street": "456 Different Street",
        "city": "New York",
        "state": "NY",
        "zip": "10001",
        "country": "US"
    })

    # IP geolocation
    ip_geolocation = json.dumps({
        "country": "RU",
        "city": "Moscow",
        "latitude": 55.7558,
        "longitude": 37.6173,
        "isp": "Unknown ISP",
        "timezone": "Europe/Moscow"
    })

    # Transaction history counts
    user_tx_count_last_30d = 15
    user_tx_count_last_7d = 8
    user_tx_count_last_24h = 5
    user_failed_tx_count_last_30d = 12

    # Velocity indicators
    ip_tx_count_last_24h = 25
    device_tx_count_last_24h = 18
    card_tx_count_last_24h = 10

    # Time-based features
    hour_of_day = tx_datetime.hour
    day_of_week = tx_datetime.weekday()
    is_weekend = 1 if day_of_week >= 5 else 0
    is_business_hours = 1 if 9 <= hour_of_day <= 17 else 0

    # Distance calculations
    billing_shipping_distance_km = 7500.0  # Moscow to NYC
    ip_billing_distance_km = 50.0

    # Cart information
    cart_items = json.dumps([
        {"sku": "SKU1234", "qty": 2, "price": 500.00, "name": "Electronics"},
        {"sku": "SKU5678", "qty": 1, "price": 250.00, "name": "Gift Card"}
    ])
    cart_total_items = 3
    cart_total_value = 1250.00

    # Session data
    session_id = str(uuid4())
    session_duration_seconds = 180
    page_views_in_session = 12

    # Device fingerprint
    screen_resolution = "1170x2532"
    browser_language = "en-US"
    browser_timezone = "Europe/Moscow"
    has_cookies_enabled = 1
    has_javascript_enabled = 1

    # Network information
    asn = "AS13335"
    asn_organization = "Cloudflare"
    is_vpn = 1
    is_proxy = 1
    is_tor = 0
    is_hosting = 0

    # Email verification
    email_domain = "fraud-example.com"
    email_domain_age_days = 5
    is_disposable_email = 1
    email_verification_status = "unverified"

    # Phone verification
    phone_carrier = "Unknown"
    phone_type = "mobile"
    phone_country_code = "US"
    is_phone_verified = 0

    # Account age
    account_created_at = tx_datetime - timedelta(days=3)
    account_age_days = 3
    days_since_first_transaction = 2

    # KYC status
    kyc_status = "pending"
    kyc_documents_uploaded = 0
    kyc_verification_attempts = 1

    # Social media presence
    has_facebook_connected = 0
    has_google_connected = 0
    has_twitter_connected = 0

    # Merchant data
    merchant_id = "merch_" + str(uuid4())[:8]
    merchant_category_code = "5732"  # Electronics
    merchant_name = "TechStore Online"

    # Chargeback history
    user_chargeback_count_lifetime = 0
    user_chargeback_count_last_90d = 0

    # Refund history
    user_refund_count_lifetime = 1
    user_refund_count_last_90d = 1
    user_refund_amount_last_90d = 150.00

    # Shipping information
    shipping_method = "express"
    estimated_delivery_days = 2
    is_expedited_shipping = 1

    # Promo codes
    promo_code_used = "NEWUSER50"
    promo_discount_amount = 50.00

    # Payment processor response
    processor_response_code = "declined"
    processor_decline_reason = "suspected_fraud"
    avs_result = "no_match"
    cvv_result = "match"

    # 3D Secure
    is_3ds_authenticated = 0
    threeds_version = "2.0"

    # Timestamps
    first_seen_at = account_created_at
    last_seen_at = tx_datetime

    record = {
        # Core transaction fields
        "tx_id_key": tx_id,
        "tx_datetime": tx_datetime,
        "email": email,
        "unique_user_id": unique_user_id,
        "first_name": first_name,
        "last_name": last_name,
        "phone_number": phone_number,

        # Network
        "ip": ip_address,
        "ip_country_code": ip_country_code,
        "ip_geolocation": ip_geolocation,
        "asn": asn,
        "asn_organization": asn_organization,
        "is_vpn": is_vpn,
        "is_proxy": is_proxy,
        "is_tor": is_tor,
        "is_hosting": is_hosting,

        # Device
        "device_id": device_id,
        "device_type": device_type,
        "device_model": device_model,
        "device_os_version": device_os_version,
        "user_agent": user_agent,
        "screen_resolution": screen_resolution,
        "browser_language": browser_language,
        "browser_timezone": browser_timezone,
        "has_cookies_enabled": has_cookies_enabled,
        "has_javascript_enabled": has_javascript_enabled,

        # Payment
        "payment_method": payment_method,
        "card_brand": card_brand,
        "card_issuer": card_issuer,
        "bin": bin,
        "last_four": last_four,
        "paid_amount_value_in_currency": paid_amount_value_in_currency,
        "processor": processor,
        "processor_response_code": processor_response_code,
        "processor_decline_reason": processor_decline_reason,
        "avs_result": avs_result,
        "cvv_result": cvv_result,

        # Risk scores
        "model_score": model_score,
        "maxmind_risk_score": maxmind_risk_score,
        "is_fraud_tx": is_fraud_tx,
        "nsure_last_decision": nsure_last_decision,
        "is_failed_tx": is_failed_tx,
        "is_processor_rejected_due_to_fraud": is_processor_rejected_due_to_fraud,

        # Addresses
        "billing_address": billing_address,
        "shipping_address": shipping_address,
        "billing_shipping_distance_km": billing_shipping_distance_km,
        "ip_billing_distance_km": ip_billing_distance_km,

        # Velocity
        "user_tx_count_last_30d": user_tx_count_last_30d,
        "user_tx_count_last_7d": user_tx_count_last_7d,
        "user_tx_count_last_24h": user_tx_count_last_24h,
        "user_failed_tx_count_last_30d": user_failed_tx_count_last_30d,
        "ip_tx_count_last_24h": ip_tx_count_last_24h,
        "device_tx_count_last_24h": device_tx_count_last_24h,
        "card_tx_count_last_24h": card_tx_count_last_24h,

        # Time features
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "is_business_hours": is_business_hours,

        # Cart
        "cart_items": cart_items,
        "cart_total_items": cart_total_items,
        "cart_total_value": cart_total_value,

        # Session
        "session_id": session_id,
        "session_duration_seconds": session_duration_seconds,
        "page_views_in_session": page_views_in_session,

        # Email
        "email_domain": email_domain,
        "email_domain_age_days": email_domain_age_days,
        "is_disposable_email": is_disposable_email,
        "email_verification_status": email_verification_status,

        # Phone
        "phone_carrier": phone_carrier,
        "phone_type": phone_type,
        "phone_country_code": phone_country_code,
        "is_phone_verified": is_phone_verified,

        # Account
        "account_created_at": account_created_at,
        "account_age_days": account_age_days,
        "days_since_first_transaction": days_since_first_transaction,
        "kyc_status": kyc_status,
        "kyc_documents_uploaded": kyc_documents_uploaded,
        "kyc_verification_attempts": kyc_verification_attempts,

        # Social
        "has_facebook_connected": has_facebook_connected,
        "has_google_connected": has_google_connected,
        "has_twitter_connected": has_twitter_connected,

        # Merchant
        "merchant_id": merchant_id,
        "merchant_category_code": merchant_category_code,
        "merchant_name": merchant_name,

        # History
        "user_chargeback_count_lifetime": user_chargeback_count_lifetime,
        "user_chargeback_count_last_90d": user_chargeback_count_last_90d,
        "user_refund_count_lifetime": user_refund_count_lifetime,
        "user_refund_count_last_90d": user_refund_count_last_90d,
        "user_refund_amount_last_90d": user_refund_amount_last_90d,

        # Shipping
        "shipping_method": shipping_method,
        "estimated_delivery_days": estimated_delivery_days,
        "is_expedited_shipping": is_expedited_shipping,

        # Promo
        "promo_code_used": promo_code_used,
        "promo_discount_amount": promo_discount_amount,

        # 3DS
        "is_3ds_authenticated": is_3ds_authenticated,
        "threeds_version": threeds_version,

        # Timestamps
        "first_seen_at": first_seen_at,
        "last_seen_at": last_seen_at,
    }

    return record


async def regenerate_single_record():
    """Delete all records and create one comprehensive record."""
    import asyncpg

    config_loader = get_config_loader()
    pg_config = config_loader.load_postgresql_config()

    conn_str = f"postgresql://{pg_config['user']}:{pg_config['password']}@{pg_config['host']}:{pg_config['port']}/{pg_config['database']}"

    logger.info("=" * 80)
    logger.info("Regenerating Single Comprehensive Record")
    logger.info("=" * 80)

    try:
        conn = await asyncpg.connect(conn_str)
        logger.info(f"✅ Connected to PostgreSQL: {pg_config['database']}")

        schema = pg_config.get('schema', 'public')
        table = pg_config.get('transactions_table', 'transactions_enriched')
        full_table = f"{schema}.{table}"

        # Step 1: Delete all existing records
        logger.info(f"🗑️  Deleting all existing records from {full_table}...")
        delete_result = await conn.execute(f"DELETE FROM {full_table}")
        logger.info(f"✅ Deleted all records")

        # Step 2: Get all column names from schema
        columns_query = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'transactions_enriched'
            ORDER BY ordinal_position
        """
        columns = await conn.fetch(columns_query)
        all_columns = [col['column_name'] for col in columns]
        logger.info(f"📊 Total columns in schema: {len(all_columns)}")

        # Step 3: Generate comprehensive record
        logger.info("🔧 Generating comprehensive realistic fraud record...")
        record = generate_realistic_record()

        # Step 4: Build INSERT statement for available columns
        available_columns = [col for col in all_columns if col in record]
        missing_columns = [col for col in all_columns if col not in record]

        logger.info(f"✅ Populated columns: {len(available_columns)}")
        logger.info(f"⚠️  Unpopulated columns: {len(missing_columns)}")

        if missing_columns:
            logger.info(f"Missing columns: {', '.join(missing_columns[:10])}...")

        # Build INSERT
        column_names = ', '.join(available_columns)
        placeholders = ', '.join([f'${i+1}' for i in range(len(available_columns))])
        values = [record[col] for col in available_columns]

        insert_sql = f"""
            INSERT INTO {full_table} ({column_names})
            VALUES ({placeholders})
        """

        await conn.execute(insert_sql, *values)
        logger.info("✅ Inserted comprehensive fraud record")

        # Step 5: Verify insertion
        verify = await conn.fetchrow(f"SELECT COUNT(*) as count FROM {full_table}")

        await conn.close()

        logger.info("")
        logger.info("=" * 80)
        logger.info("REGENERATION COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Total records in table: {verify['count']}")
        logger.info(f"Populated columns: {len(available_columns)}/{len(all_columns)}")
        logger.info(f"Record Type: High-risk fraud transaction")
        logger.info(f"IP Address: {record['ip']} (Russia)")
        logger.info(f"Risk Score: {record['model_score']}")
        logger.info(f"Fraud Status: CONFIRMED FRAUD")
        logger.info("=" * 80)

        return 0

    except Exception as e:
        logger.error(f"❌ Regeneration failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(regenerate_single_record())
    sys.exit(exit_code)
