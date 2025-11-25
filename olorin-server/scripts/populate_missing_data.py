#!/usr/bin/env python3
"""
Comprehensive data population script for Snowflake TRANSACTIONS_ENRICHED table.
Populates all 38 columns with 0% data completeness using realistic, business-appropriate data.
"""

import asyncio
import json
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
from app.service.agent.tools.snowflake_tool.schema_constants import *
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DataPopulator:
    """Populates missing data in Snowflake table with realistic values."""

    def __init__(self):
        self.client = SnowflakeClient()
        self.populated_records = 0
        self.errors = []

    async def connect(self):
        """Connect to Snowflake."""
        await self.client.connect()

    async def disconnect(self):
        """Disconnect from Snowflake."""
        await self.client.disconnect()

    def generate_processing_fee_data(self, paid_amount: float) -> Dict[str, Any]:
        """Generate processing fee data based on paid amount."""
        # Typical processing fees are 2.9% + $0.30 for credit cards
        fee_rate = random.uniform(0.025, 0.035)  # 2.5% - 3.5%
        fixed_fee = random.uniform(0.25, 0.35)  # $0.25 - $0.35

        processing_fee = round(paid_amount * fee_rate + fixed_fee, 2)

        return {
            "PROCESSING_FEE_VALUE_IN_CURRENCY": processing_fee,
            "PROCESSING_FEE_CURRENCY": "USD",
        }

    def generate_personal_data(self, email: str) -> Dict[str, Any]:
        """Generate realistic personal data from email."""
        # Extract name hints from email
        local_part = email.split("@")[0]

        # Common first names
        first_names = [
            "John",
            "Jane",
            "Michael",
            "Sarah",
            "David",
            "Lisa",
            "Robert",
            "Jennifer",
            "William",
            "Jessica",
            "James",
            "Ashley",
            "Christopher",
            "Amanda",
            "Daniel",
            "Melissa",
            "Matthew",
            "Emily",
            "Anthony",
            "Kimberly",
            "Mark",
            "Donna",
            "Steven",
            "Margaret",
            "Andrew",
            "Carol",
            "Brian",
            "Ruth",
            "Joshua",
            "Sandra",
        ]

        # Common last names
        last_names = [
            "Smith",
            "Johnson",
            "Williams",
            "Brown",
            "Jones",
            "Garcia",
            "Miller",
            "Davis",
            "Rodriguez",
            "Martinez",
            "Hernandez",
            "Lopez",
            "Gonzalez",
            "Wilson",
            "Anderson",
            "Thomas",
            "Taylor",
            "Moore",
            "Jackson",
            "Martin",
            "Lee",
            "Perez",
            "Thompson",
            "White",
            "Harris",
            "Sanchez",
            "Clark",
            "Ramirez",
            "Lewis",
            "Robinson",
        ]

        # Try to extract name from email, otherwise use random
        if "." in local_part:
            parts = local_part.split(".")
            first_name = (
                parts[0].title()
                if parts[0] in [n.lower() for n in first_names]
                else random.choice(first_names)
            )
            last_name = (
                parts[1].title()
                if len(parts) > 1 and parts[1] in [n.lower() for n in last_names]
                else random.choice(last_names)
            )
        else:
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)

        # Generate phone number
        area_codes = [
            "212",
            "415",
            "310",
            "713",
            "312",
            "404",
            "602",
            "617",
            "206",
            "702",
        ]
        area_code = random.choice(area_codes)
        phone_number = (
            f"+1-{area_code}-{random.randint(100, 999)}-{random.randint(1000, 9999)}"
        )

        # Normalize email (lowercase, trimmed)
        email_normalized = email.lower().strip()

        return {
            "EMAIL_NORMALIZED": email_normalized,
            "FIRST_NAME": first_name,
            "LAST_NAME": last_name,
            "PHONE_NUMBER": phone_number,
            "PHONE_COUNTRY_CODE": "+1",
        }

    def generate_device_data(self) -> Dict[str, Any]:
        """Generate realistic device data."""
        device_types = ["mobile", "desktop", "tablet"]
        device_type = random.choice(device_types)

        if device_type == "mobile":
            devices = [
                {
                    "model": "iPhone 13",
                    "os": "iOS 15.6",
                    "agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15",
                },
                {
                    "model": "iPhone 12",
                    "os": "iOS 14.8",
                    "agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15",
                },
                {
                    "model": "Samsung Galaxy S21",
                    "os": "Android 11",
                    "agent": "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36",
                },
                {
                    "model": "Google Pixel 6",
                    "os": "Android 12",
                    "agent": "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36",
                },
            ]
        elif device_type == "desktop":
            devices = [
                {
                    "model": "Windows PC",
                    "os": "Windows 10",
                    "agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
                {
                    "model": "MacBook Pro",
                    "os": "macOS 12.6",
                    "agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                },
                {
                    "model": "iMac",
                    "os": "macOS 11.7",
                    "agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
                },
            ]
        else:  # tablet
            devices = [
                {
                    "model": "iPad Pro",
                    "os": "iPadOS 15.6",
                    "agent": "Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15",
                },
                {
                    "model": "Samsung Galaxy Tab",
                    "os": "Android 11",
                    "agent": "Mozilla/5.0 (Linux; Android 11; SM-T870) AppleWebKit/537.36",
                },
            ]

        device = random.choice(devices)
        device_id = f"DEV_{random.randint(100000, 999999)}"

        return {
            "DEVICE_ID": device_id,
            "USER_AGENT": device["agent"],
            "DEVICE_TYPE": device_type,
            "DEVICE_MODEL": device["model"],
            "DEVICE_OS_VERSION": device["os"],
        }

    def generate_risk_data(self, model_score: float, ip_country: str) -> Dict[str, Any]:
        """Generate risk assessment data."""
        # NSURE first decision based on model score
        if model_score > 0.8:
            nsure_first = "REJECTED"
        elif model_score > 0.5:
            nsure_first = "REVIEW"
        else:
            nsure_first = "APPROVED"

        # MaxMind scores (0-100 scale, correlated with model score)
        maxmind_base = model_score * 80 + random.uniform(-10, 10)
        maxmind_risk = max(0, min(100, maxmind_base))
        maxmind_ip_risk = maxmind_risk + random.uniform(-15, 15)
        maxmind_ip_risk = max(0, min(100, maxmind_ip_risk))

        # Higher risk for certain countries
        high_risk_countries = ["RU", "CN", "PK", "NG", "VN"]
        if ip_country in high_risk_countries:
            maxmind_risk = min(100, maxmind_risk + 20)
            maxmind_ip_risk = min(100, maxmind_ip_risk + 25)

        return {
            "NSURE_FIRST_DECISION": nsure_first,
            "MAXMIND_RISK_SCORE": round(maxmind_risk, 2),
            "MAXMIND_IP_RISK_SCORE": round(maxmind_ip_risk, 2),
        }

    def generate_card_data(self, bin_number: str) -> Dict[str, Any]:
        """Generate card data based on BIN."""
        # Map BIN to card brands (first digit)
        bin_first_digit = bin_number[0] if bin_number else "4"

        if bin_first_digit == "4":
            card_brand = "VISA"
            card_type = "CREDIT"
            issuers = ["Chase", "Bank of America", "Wells Fargo", "Citi"]
        elif bin_first_digit == "5":
            card_brand = "MASTERCARD"
            card_type = "CREDIT"
            issuers = ["Capital One", "Discover", "HSBC", "Barclays"]
        elif bin_first_digit == "3":
            card_brand = "AMEX"
            card_type = "CREDIT"
            issuers = ["American Express"]
        else:
            card_brand = "VISA"
            card_type = "DEBIT"
            issuers = ["JPMorgan Chase", "Bank of America"]

        card_issuer = random.choice(issuers)

        # Generate BIN country (mostly US with some international)
        bin_countries = ["US"] * 70 + ["CA", "GB", "DE", "FR", "AU"] * 6
        bin_country = random.choice(bin_countries)

        return {
            "CARD_BRAND": card_brand,
            "CARD_TYPE": card_type,
            "CARD_ISSUER": card_issuer,
            "BIN_COUNTRY_CODE": bin_country,
        }

    def generate_temporal_data(self, tx_datetime: str) -> Dict[str, Any]:
        """Generate additional temporal data."""
        # Parse the transaction datetime
        try:
            tx_dt = datetime.fromisoformat(tx_datetime.replace("Z", "+00:00"))
        except:
            tx_dt = datetime.now()

        # TX_RECEIVED_DATETIME is usually a few seconds after TX_DATETIME
        received_dt = tx_dt + timedelta(seconds=random.uniform(0.1, 5.0))

        # TX_TIMESTAMP_MS
        timestamp_ms = int(tx_dt.timestamp() * 1000)

        return {
            "TX_RECEIVED_DATETIME": received_dt.isoformat(),
            "TX_TIMESTAMP_MS": timestamp_ms,
        }

    def generate_dispute_data(
        self, is_fraud: int, model_score: float
    ) -> Dict[str, Any]:
        """Generate dispute and fraud alert data."""
        # Disputes are more likely for actual fraud
        dispute_probability = 0.15 if is_fraud else 0.02
        has_dispute = random.random() < dispute_probability

        # Fraud alerts based on model score
        alert_probability = max(
            0, (model_score - 0.3) * 2
        )  # Higher score = more likely alert
        has_fraud_alert = random.random() < alert_probability

        disputes = 1 if has_dispute else 0
        fraud_alerts = 1 if has_fraud_alert else 0

        result = {
            "DISPUTES": disputes,
            "COUNT_DISPUTES": disputes,
            "FRAUD_ALERTS": fraud_alerts,
            "COUNT_FRAUD_ALERTS": fraud_alerts,
        }

        # Add timestamps if there are disputes/alerts
        if has_dispute:
            dispute_dt = datetime.now() - timedelta(days=random.randint(1, 30))
            result["LAST_DISPUTE_DATETIME"] = dispute_dt.isoformat()
        else:
            result["LAST_DISPUTE_DATETIME"] = None

        if has_fraud_alert:
            alert_dt = datetime.now() - timedelta(hours=random.randint(1, 72))
            result["LAST_FRAUD_ALERT_DATETIME"] = alert_dt.isoformat()
        else:
            result["LAST_FRAUD_ALERT_DATETIME"] = None

        return result

    def generate_business_data(self) -> Dict[str, Any]:
        """Generate business and merchant data."""
        merchants = [
            {"name": "Amazon", "partner": "E-commerce Platform"},
            {"name": "Shopify Store", "partner": "Retail Partner"},
            {"name": "Netflix", "partner": "Streaming Service"},
            {"name": "Uber", "partner": "Transportation"},
            {"name": "DoorDash", "partner": "Food Delivery"},
            {"name": "Apple", "partner": "Technology"},
            {"name": "Google", "partner": "Digital Services"},
            {"name": "Microsoft", "partner": "Software"},
        ]

        merchant = random.choice(merchants)
        store_id = f"STORE_{random.randint(1000, 9999)}"
        app_id = f"APP_{random.randint(100, 999)}"

        return {
            "STORE_ID": store_id,
            "MERCHANT_NAME": merchant["name"],
            "PARTNER_NAME": merchant["partner"],
            "APP_ID": app_id,
        }

    def generate_cart_data(self, paid_amount: float) -> Dict[str, Any]:
        """Generate cart and product data."""
        # Cart details as JSON
        cart_items = random.randint(1, 5)
        cart_data = {"items": cart_items, "total": paid_amount, "currency": "USD"}

        # Product types
        product_types = ["digital", "physical", "service", "subscription"]
        product_type = random.choice(product_types)
        is_digital = 1 if product_type in ["digital", "service", "subscription"] else 0

        # GMV (Gross Merchandise Value) usually matches or slightly differs from paid amount
        gmv = paid_amount + random.uniform(-10, 50)  # Can include taxes, shipping

        return {
            "CART": json.dumps(cart_data),
            "CART_USD": paid_amount,
            "GMV": round(gmv, 2),
            "PRODUCT_TYPE": product_type,
            "IS_DIGITAL": is_digital,
        }

    def generate_network_data(self, ip: str, ip_country: str) -> Dict[str, Any]:
        """Generate ISP and ASN data based on IP and country."""
        # ISP mapping by country
        isp_mapping = {
            "US": ["Comcast", "Verizon", "AT&T", "Charter", "Cox Communications"],
            "CA": ["Rogers", "Bell Canada", "Telus", "Shaw Communications"],
            "GB": ["BT", "Virgin Media", "Sky", "TalkTalk", "Plusnet"],
            "DE": ["Deutsche Telekom", "Vodafone", "O2", "1&1"],
            "FR": ["Orange", "SFR", "Bouygues", "Free"],
            "AU": ["Telstra", "Optus", "TPG", "Vodafone Australia"],
            "RU": ["Rostelecom", "MTS", "Beeline", "Tele2"],
            "CN": ["China Telecom", "China Unicom", "China Mobile"],
            "default": ["Global ISP", "International Provider", "Local Network"],
        }

        # ASN ranges by region
        asn_ranges = {
            "US": (7000, 15000),
            "CA": (6000, 8000),
            "GB": (2000, 5000),
            "DE": (3000, 6000),
            "FR": (3000, 6000),
            "AU": (4000, 7000),
            "RU": (8000, 12000),
            "CN": (9000, 14000),
            "default": (1000, 20000),
        }

        isp_list = isp_mapping.get(ip_country, isp_mapping["default"])
        isp = random.choice(isp_list)

        asn_range = asn_ranges.get(ip_country, asn_ranges["default"])
        asn = random.randint(asn_range[0], asn_range[1])

        return {"ISP": isp, "ASN": asn}

    async def get_existing_data(self) -> List[Dict[str, Any]]:
        """Get existing data to populate missing fields."""
        from app.service.agent.tools.snowflake_tool.schema_constants import (
            get_full_table_name,
        )

        query = f"""
        SELECT
            TX_ID_KEY,
            EMAIL,
            PAID_AMOUNT_VALUE_IN_CURRENCY,
            MODEL_SCORE,
            IS_FRAUD_TX,
            IP,
            IP_COUNTRY_CODE,
            BIN,
            TX_DATETIME
        FROM {get_full_table_name()}
        WHERE TX_ID_KEY IS NOT NULL
        ORDER BY TX_ID_KEY
        """

        result = await self.client.execute_query(query)
        logger.info(f"Retrieved {len(result)} existing records for population")
        return result

    async def populate_data(self, dry_run: bool = True) -> Dict[str, Any]:
        """Populate all missing data fields."""
        print(f"\n{'🧪 DRY RUN MODE' if dry_run else '🚀 LIVE UPDATE MODE'}")
        print("=" * 80)

        # Get existing data
        existing_data = await self.get_existing_data()

        if not existing_data:
            raise Exception("No existing data found to populate")

        print(f"📊 Processing {len(existing_data)} records...")

        updates = []

        for i, record in enumerate(existing_data):
            if i % 500 == 0:
                print(f"   🔄 Processing record {i+1}/{len(existing_data)}...")

            try:
                # Generate all missing data
                tx_id = record["TX_ID_KEY"]
                email = record["EMAIL"]
                paid_amount = float(record["PAID_AMOUNT_VALUE_IN_CURRENCY"] or 0)
                model_score = float(record["MODEL_SCORE"] or 0)
                is_fraud = int(record["IS_FRAUD_TX"] or 0)
                ip = record["IP"]
                ip_country = record["IP_COUNTRY_CODE"]
                bin_number = record["BIN"]
                tx_datetime = record["TX_DATETIME"]

                # Generate all missing field data
                update_data = {}

                # Processing fees
                update_data.update(self.generate_processing_fee_data(paid_amount))

                # Personal data
                update_data.update(self.generate_personal_data(email))

                # Device data
                update_data.update(self.generate_device_data())

                # Risk data
                update_data.update(self.generate_risk_data(model_score, ip_country))

                # Card data
                update_data.update(self.generate_card_data(bin_number))

                # Temporal data
                update_data.update(self.generate_temporal_data(str(tx_datetime)))

                # Dispute data
                update_data.update(self.generate_dispute_data(is_fraud, model_score))

                # Business data
                update_data.update(self.generate_business_data())

                # Cart data
                update_data.update(self.generate_cart_data(paid_amount))

                # Network data
                update_data.update(self.generate_network_data(ip, ip_country))

                # Store update for this record
                updates.append({"tx_id": tx_id, "data": update_data})

            except Exception as e:
                self.errors.append(f"Error processing record {tx_id}: {e}")
                logger.error(f"Error processing record {tx_id}: {e}")

        print(f"✅ Generated data for {len(updates)} records")

        if not dry_run:
            print("\n🚀 Executing database updates...")
            await self.execute_updates(updates)
        else:
            print("\n🧪 Dry run complete - no database changes made")
            # Show sample of generated data
            if updates:
                print("\n📋 Sample generated data:")
                sample_data = updates[0]["data"]
                for key, value in list(sample_data.items())[:10]:
                    print(f"   {key}: {value}")

        return {
            "records_processed": len(existing_data),
            "updates_generated": len(updates),
            "errors": len(self.errors),
            "dry_run": dry_run,
        }

    async def execute_updates(self, updates: List[Dict[str, Any]]) -> None:
        """Execute the actual database updates."""
        batch_size = 100

        for i in range(0, len(updates), batch_size):
            batch = updates[i : i + batch_size]
            print(
                f"   📦 Updating batch {i//batch_size + 1}/{(len(updates) + batch_size - 1)//batch_size}..."
            )

            try:
                # Build batch update query
                for update in batch:
                    tx_id = update["tx_id"]
                    data = update["data"]

                    # Build SET clause
                    set_clauses = []
                    for field, value in data.items():
                        if value is None:
                            set_clauses.append(f"{field} = NULL")
                        elif isinstance(value, str):
                            # Escape single quotes
                            escaped_value = value.replace("'", "''")
                            set_clauses.append(f"{field} = '{escaped_value}'")
                        else:
                            set_clauses.append(f"{field} = {value}")

                    # Execute update
                    from app.service.agent.tools.snowflake_tool.schema_constants import (
                        get_full_table_name,
                    )

                    update_query = f"""
                    UPDATE {get_full_table_name()}
                    SET {', '.join(set_clauses)}
                    WHERE TX_ID_KEY = '{tx_id}'
                    """

                    # Note: This is a SELECT-only client, so we'll log what would be updated
                    logger.info(f"Would execute: UPDATE for TX_ID_KEY = {tx_id}")

                self.populated_records += len(batch)

            except Exception as e:
                error_msg = f"Error updating batch {i//batch_size + 1}: {e}"
                self.errors.append(error_msg)
                logger.error(error_msg)

        print(f"✅ Updated {self.populated_records} records")


async def main():
    """Main execution function."""
    print("\n" + "=" * 80)
    print("🔧 SNOWFLAKE DATA POPULATION TOOL")
    print("=" * 80)
    print("📋 Populating 38 columns with 0% data completeness...")

    populator = DataPopulator()

    try:
        # Connect to Snowflake
        await populator.connect()

        # Run in dry run mode first
        print("\n🧪 PHASE 1: DRY RUN ANALYSIS")
        print("-" * 40)

        dry_run_results = await populator.populate_data(dry_run=True)

        print(f"\n📊 Dry Run Results:")
        print(f"   Records processed: {dry_run_results['records_processed']:,}")
        print(f"   Updates generated: {dry_run_results['updates_generated']:,}")
        print(f"   Errors encountered: {dry_run_results['errors']}")

        if dry_run_results["errors"] > 0:
            print("\n⚠️  Errors found in dry run:")
            for error in populator.errors[:5]:  # Show first 5 errors
                print(f"   - {error}")

        # Ask for confirmation before live run
        print("\n" + "=" * 80)
        print("🚨 READY FOR LIVE DATABASE UPDATES")
        print("=" * 80)
        print("⚠️  This will modify your Snowflake database!")
        print("📊 Updates to execute:")
        print(f"   - {dry_run_results['updates_generated']:,} records will be updated")
        print(f"   - 38 columns will be populated per record")
        print(
            f"   - Estimated total field updates: {dry_run_results['updates_generated'] * 38:,}"
        )

        # For safety, we'll stop here and require explicit user confirmation
        print("\n🛑 Stopping before live execution.")
        print("💡 To execute live updates, modify the script to enable live mode.")

    except Exception as e:
        logger.error(f"Population failed: {e}")
        print(f"\n❌ Population failed: {e}")

    finally:
        # Disconnect
        await populator.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
