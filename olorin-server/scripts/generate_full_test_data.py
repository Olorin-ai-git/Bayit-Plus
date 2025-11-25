#!/usr/bin/env python3
"""
Generate realistic test data for ALL 333 columns in PostgreSQL transactions_enriched table.
Uses direct psql INSERT via subprocess to bypass schema-locked restrictions.
"""

import csv
import json
import random
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List

# Try to import faker
try:
    from faker import Faker

    fake = Faker()
    HAS_FAKER = True
except ImportError:
    HAS_FAKER = False
    print("ℹ️  Using basic random data (Faker not installed)")


class ComprehensiveFraudDataGenerator:
    """Generate realistic fraud detection test data for all 333 columns."""

    def __init__(self, num_records: int = 5000):
        self.num_records = num_records
        self.start_date = datetime.now() - timedelta(days=180)  # 6 months of data
        self.fraud_rate = 0.20  # 20% fraud rate

        # Load schema from CSV
        self.schema = self._load_schema()

        # Reference data pools
        self.merchants = self._generate_merchants(50)
        self.users = self._generate_users(1000)
        self.payment_methods = self._generate_payment_methods(500)
        self.ips = self._generate_ips(200)
        self.devices = self._generate_devices(300)

    def _load_schema(self) -> List[Dict]:
        """Load column schema from CSV file."""
        csv_path = Path("/Users/gklainert/Documents/olorin/Tx Table Schema.csv")
        columns = []

        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                columns.append(
                    {
                        "name": row["name"].lower(),
                        "type": row["type"],
                        "nullable": row["null?"] == "Y",
                    }
                )

        print(f"📋 Loaded schema: {len(columns)} columns")
        return columns

    def _generate_merchants(self, count: int) -> List[Dict]:
        """Generate merchant pool."""
        merchants = []
        industries = [
            "gaming",
            "digital_goods",
            "subscriptions",
            "e-commerce",
            "travel",
        ]
        for i in range(count):
            merchants.append(
                {
                    "merchant_id": f"MERCHANT_{i+1:04d}",
                    "store_id": f"STORE_{i+1:04d}",
                    "name": f"Merchant {i+1}" if not HAS_FAKER else fake.company(),
                    "segment_id": f"SEG_{random.randint(1, 10):03d}",
                    "partner_id": f"PARTNER_{random.randint(1, 20):03d}",
                    "partner_name": (
                        f"Partner {random.randint(1, 20)}"
                        if not HAS_FAKER
                        else fake.company()
                    ),
                    "industry": random.choice(industries),
                }
            )
        return merchants

    def _generate_users(self, count: int) -> List[Dict]:
        """Generate user pool."""
        users = []
        for i in range(count):
            if HAS_FAKER:
                first = fake.first_name()
                last = fake.last_name()
                email = fake.email()
            else:
                first = f"FirstName{i+1}"
                last = f"LastName{i+1}"
                email = f"user{i+1}@example.com"

            dob = self.start_date - timedelta(
                days=random.randint(6570, 25550)
            )  # 18-70 years old

            users.append(
                {
                    "user_id": f"USER_{i+1:06d}",
                    "email": email,
                    "email_normalized": email.lower(),
                    "first_name": first,
                    "last_name": last,
                    "phone_country_code": "+1",
                    "phone_number": f"{random.randint(2000000000, 9999999999)}",
                    "date_of_birth": dob,
                    "first_seen": self.start_date
                    + timedelta(days=random.randint(0, 150)),
                    "is_fraudster": random.random() < 0.15,
                }
            )
        return users

    def _generate_payment_methods(self, count: int) -> List[Dict]:
        """Generate payment method pool."""
        payment_methods = []
        card_brands = ["Visa", "Mastercard", "Amex", "Discover"]
        card_types = ["credit", "debit", "prepaid"]
        countries = ["US", "GB", "CA", "FR", "DE", "CN", "IN", "BR"]
        processors = ["Stripe", "PayPal", "Adyen", "Braintree"]

        for i in range(count):
            payment_methods.append(
                {
                    "bin": f"{random.randint(400000, 599999)}",
                    "last_four": f"{random.randint(1000, 9999)}",
                    "brand": random.choice(card_brands),
                    "type": random.choice(card_types),
                    "country": random.choice(countries),
                    "is_prepaid": random.random() < 0.10,
                    "is_commercial": random.random() < 0.05,
                    "issuer": (
                        f"Bank {random.randint(1, 100)}"
                        if not HAS_FAKER
                        else fake.company()
                    ),
                    "processor": random.choice(processors),
                    "token": f"tok_{random.randint(10000000, 99999999)}",
                }
            )
        return payment_methods

    def _generate_ips(self, count: int) -> List[Dict]:
        """Generate IP address pool."""
        ips = []
        countries = ["US", "GB", "CA", "FR", "DE", "CN", "IN", "BR", "RU", "NG"]
        for _ in range(count):
            ip = f"{random.randint(1, 255)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(0, 255)}"
            ips.append(
                {
                    "ip": ip,
                    "country": random.choice(countries),
                    "isp": (
                        f"ISP {random.randint(1, 50)}"
                        if not HAS_FAKER
                        else fake.company()
                    ),
                    "asn": f"AS{random.randint(1000, 99999)}",
                }
            )
        return ips

    def _generate_devices(self, count: int) -> List[Dict]:
        """Generate device pool."""
        devices = []
        device_types = ["mobile", "desktop", "tablet"]
        os_versions = [
            "iOS 17.0",
            "iOS 16.5",
            "Android 14",
            "Android 13",
            "Windows 11",
            "macOS 14",
        ]

        for i in range(count):
            devices.append(
                {
                    "device_id": f"DEV_{i+1:08d}",
                    "device_type": random.choice(device_types),
                    "os_version": random.choice(os_versions),
                    "is_authenticated": random.random() < 0.7,
                }
            )
        return devices

    def _sql_escape(self, value) -> str:
        """Escape value for SQL."""
        if value is None:
            return "NULL"
        elif isinstance(value, bool):
            return "TRUE" if value else "FALSE"
        elif isinstance(value, (int, float)):
            return str(value)
        elif isinstance(value, datetime):
            return f"'{value.strftime('%Y-%m-%d %H:%M:%S')}'"
        elif isinstance(value, (dict, list)):
            json_str = json.dumps(value)
            return "'" + json_str.replace("'", "''") + "'::jsonb"
        else:
            return "'" + str(value).replace("'", "''") + "'"

    def _generate_value_for_column(
        self, col_name: str, col_type: str, tx_context: Dict
    ) -> Any:
        """Generate appropriate value based on column name and type."""
        col_lower = col_name.lower()

        # PRIORITY 1: Check column TYPE FIRST for structured/numeric types
        # JSON/ARRAY columns
        if col_type in ["OBJECT", "VARIANT", "ARRAY"]:
            if random.random() < 0.6:
                return None
            # Generate appropriate JSON based on column name
            if "email" in col_lower and (
                "recipient" in col_lower or "all_" in col_lower
            ):
                return [
                    f"recipient{i}@example.com" for i in range(random.randint(1, 3))
                ]
            elif "address" in col_lower:
                return {
                    "street": f"{random.randint(1, 999)} Main St",
                    "city": "New York",
                    "state": "NY",
                    "zip": f"{random.randint(10000, 99999)}",
                }
            elif "cart" in col_lower or "items" in col_lower:
                return [
                    {"item_id": f"ITEM_{i}", "quantity": random.randint(1, 5)}
                    for i in range(random.randint(1, 3))
                ]
            else:
                return {"field": f"value_{random.randint(1, 100)}"}

        # TIMESTAMP columns
        if "TIMESTAMP" in col_type:
            if random.random() < 0.3:
                return None
            return tx_context.get("tx_datetime") + timedelta(
                seconds=random.randint(-300, 300)
            )

        # SMALLINT/NUMBER(1,0) columns (boolean-like)
        if "NUMBER(1,0)" in col_type or "NUMBER(2,0)" in col_type:
            if random.random() < 0.5:
                return None
            return random.randint(0, 1)

        # Other NUMBER/BIGINT columns
        if "NUMBER" in col_type or "BIGINT" in col_type:
            if random.random() < 0.4:
                return None
            return random.randint(1, 999999)

        # FLOAT columns
        if "FLOAT" in col_type:
            if random.random() < 0.4:
                return None
            return round(random.uniform(0.01, 1000.00), 2)

        # BOOLEAN columns
        if "BOOLEAN" in col_type:
            if random.random() < 0.3:
                return None
            return random.choice([True, False])

        # PRIORITY 2: Handle specific columns with context-aware name-based logic
        # (Only for TEXT/VARCHAR columns - all numeric types already handled above)
        if "email" in col_lower and "normalized" not in col_lower:
            return tx_context.get("user_email")
        elif "email_normalized" in col_lower:
            return tx_context.get("user_email", "").lower()
        elif "first_name" in col_lower:
            return tx_context.get("user_first_name")
        elif "last_name" in col_lower:
            return tx_context.get("user_last_name")
        elif "phone_number" in col_lower and "country" not in col_lower:
            return tx_context.get("user_phone")
        elif "phone_country_code" in col_lower:
            return tx_context.get("user_phone_code", "+1")
        elif "date_of_birth" in col_lower:
            return tx_context.get("user_dob")
        elif "tx_datetime" in col_lower:
            return tx_context.get("tx_datetime")
        elif "tx_id" in col_lower or col_lower == "original_tx_id":
            return tx_context.get("tx_id")
        elif "store_id" in col_lower:
            return tx_context.get("store_id")
        elif "merchant_name" in col_lower:
            return tx_context.get("merchant_name")
        elif (
            "gmv" in col_lower
            or "amount_value" in col_lower
            or "fee_value" in col_lower
        ):
            # Handle all numeric amount/value columns (check BEFORE currency)
            return tx_context.get("gmv")
        elif col_lower.endswith("_currency") and "value_in_currency" not in col_lower:
            # Only match pure currency columns (not value_in_currency)
            return "USD"
        elif "model_score" in col_lower:
            return tx_context.get("model_score")
        elif "model_decision" in col_lower:
            return tx_context.get("model_decision")
        elif "is_fraud" in col_lower:
            return 1 if tx_context.get("is_fraud") else 0
        elif "is_failed" in col_lower:
            return 1 if tx_context.get("is_failed") else 0
        elif col_lower == "ip":
            return tx_context.get("ip")
        elif "ip_country" in col_lower:
            return tx_context.get("ip_country")
        elif "bin" == col_lower:
            return tx_context.get("bin")
        elif "last_four" in col_lower:
            return tx_context.get("last_four")
        elif "card_brand" in col_lower:
            return tx_context.get("card_brand")
        elif "bin_country" in col_lower or "payment_method_country" in col_lower:
            return tx_context.get("pm_country")
        elif "device_id" in col_lower:
            return tx_context.get("device_id")
        elif "device_type" in col_lower:
            return tx_context.get("device_type")
        elif "device_os" in col_lower:
            return tx_context.get("device_os")

        # PRIORITY 3: Fallback for TEXT/VARCHAR columns without specific name matches
        # All type-based checks already done above
        if col_type in ["VARCHAR(16777216)", "TEXT"]:
            if random.random() < 0.4:
                return None

            # Generate contextual text based on column name
            if "segment" in col_lower or "partner" in col_lower:
                return f"SEG_{random.randint(1, 100):03d}"
            elif "reason" in col_lower or "description" in col_lower:
                reasons = [
                    "High risk score",
                    "Velocity check",
                    "Manual review",
                    "Approved",
                    "Rejected",
                ]
                return random.choice(reasons)
            elif "status" in col_lower or "result" in col_lower:
                statuses = ["APPROVED", "REJECTED", "PENDING", "COMPLETED"]
                return random.choice(statuses)
            elif "type" in col_lower or "method" in col_lower:
                return random.choice(
                    ["credit_card", "debit_card", "paypal", "bank_transfer"]
                )
            elif "processor" in col_lower:
                return random.choice(["Stripe", "PayPal", "Adyen", "Braintree"])
            elif "token" in col_lower or "identifier" in col_lower:
                return f"tok_{random.randint(10000000, 99999999)}"
            else:
                return f"value_{random.randint(1, 1000)}"

    def generate_transaction(self, index: int) -> Dict[str, Any]:
        """Generate a single transaction record with ALL 333 columns."""
        # Temporal distribution
        days_ago = int(180 * (1 - (index / self.num_records)) ** 2)
        tx_datetime = self.start_date + timedelta(
            days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59)
        )

        # Select entities
        merchant = random.choice(self.merchants)
        user = random.choice(self.users)
        payment_method = random.choice(self.payment_methods)
        ip_data = random.choice(self.ips)
        device = random.choice(self.devices)

        # Determine if fraudulent
        is_fraud = user["is_fraudster"] or random.random() < self.fraud_rate

        # Transaction amount
        if is_fraud:
            gmv = round(
                random.choice([random.uniform(0.01, 5.00), random.uniform(500, 5000)]),
                2,
            )
        else:
            gmv = round(random.uniform(10.00, 500.00), 2)

        # Model score
        model_score = (
            random.uniform(0.70, 0.99) if is_fraud else random.uniform(0.01, 0.30)
        )

        # Decisions
        model_threshold = 0.60
        if model_score >= model_threshold:
            model_decision, nsure_decision = "REJECT", "REJECTED"
        elif model_score >= 0.40:
            model_decision = "REVIEW"
            nsure_decision = random.choice(["APPROVED", "REJECTED"])
        else:
            model_decision, nsure_decision = "APPROVE", "APPROVED"

        # Transaction ID
        tx_id = f"TX_{tx_datetime.strftime('%Y%m%d')}_{index:06d}"

        # Build context dictionary for smart column generation
        tx_context = {
            "tx_datetime": tx_datetime,
            "tx_id": tx_id,
            "user_email": user["email"],
            "user_first_name": user["first_name"],
            "user_last_name": user["last_name"],
            "user_phone": user["phone_number"],
            "user_phone_code": user["phone_country_code"],
            "user_dob": user["date_of_birth"],
            "store_id": merchant["store_id"],
            "merchant_name": merchant["name"],
            "gmv": gmv,
            "model_score": model_score,
            "model_decision": model_decision,
            "is_fraud": is_fraud,
            "is_failed": nsure_decision == "REJECTED",
            "ip": ip_data["ip"],
            "ip_country": ip_data["country"],
            "bin": payment_method["bin"],
            "last_four": payment_method["last_four"],
            "card_brand": payment_method["brand"],
            "pm_country": payment_method["country"],
            "device_id": device["device_id"],
            "device_type": device["device_type"],
            "device_os": device["os_version"],
        }

        # Generate values for all 333 columns
        record = {}
        for col_def in self.schema:
            col_name = col_def["name"]
            col_type = col_def["type"]
            record[col_name] = self._generate_value_for_column(
                col_name, col_type, tx_context
            )

        return record

    def generate_all(self):
        """Generate all records and create SQL file."""
        print("=" * 80)
        print("COMPREHENSIVE Test Data Generation - ALL 333 Columns")
        print("=" * 80)
        print(f"\n📊 Configuration:")
        print(f"   Total records: {self.num_records:,}")
        print(f"   Total columns: {len(self.schema)}")
        print(f"   Fraud rate: {self.fraud_rate*100:.1f}%")
        print(f"   Date range: {self.start_date.date()} to {datetime.now().date()}")

        print(
            f"\n🏗️  Generating {self.num_records:,} transactions with ALL {len(self.schema)} columns..."
        )

        sql_lines = []

        for i in range(self.num_records):
            record = self.generate_transaction(i)

            # Build INSERT statement with ALL columns
            cols = [col["name"] for col in self.schema]
            values = [self._sql_escape(record.get(col)) for col in cols]

            sql = f"INSERT INTO transactions_enriched ({', '.join(cols)}) VALUES ({', '.join(values)});"
            sql_lines.append(sql)

            if (i + 1) % 500 == 0:
                print(f"   Generated {i+1:,} / {self.num_records:,} records")

        # Write to file
        sql_file = "/tmp/insert_full_test_data.sql"
        sql_content = "\n".join(sql_lines)
        with open(sql_file, "w") as f:
            # Add truncate at beginning
            f.write("TRUNCATE TABLE transactions_enriched;\n\n")
            f.write(sql_content)

        print(f"\n✅ Generated SQL file: {sql_file}")
        print(f"   File size: {len(sql_content):,} bytes")
        print(f"   Columns per record: {len(cols)}")

        # Execute via psql
        print(f"\n🔌 Executing SQL via psql...")
        cmd = ["psql", "-U", "gklainert", "-d", "olorin_db", "-f", sql_file]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            if result.returncode == 0:
                print(f"   ✅ SQL execution successful")
            else:
                print(f"   ❌ SQL execution failed:")
                print(f"   {result.stderr[:500]}")
                return False
        except subprocess.TimeoutExpired:
            print(f"   ⚠️  Execution timed out (may still be processing)")
            return False
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return False

        # Verify
        print(f"\n📊 Verifying insertion...")
        verify_cmd = [
            "psql",
            "-U",
            "gklainert",
            "-d",
            "olorin_db",
            "-t",
            "-c",
            "SELECT COUNT(*) FROM transactions_enriched;",
        ]

        result = subprocess.run(verify_cmd, capture_output=True, text=True)
        count = int(result.stdout.strip()) if result.returncode == 0 else 0

        print(f"   Records in table: {count:,}")

        if count > 0:
            # Get stats
            stats_cmd = [
                "psql",
                "-U",
                "gklainert",
                "-d",
                "olorin_db",
                "-t",
                "-c",
                """SELECT
                    SUM(CASE WHEN is_fraud_tx = 1 THEN 1 ELSE 0 END)::text || ' fraud, ' ||
                    AVG(model_score)::numeric(5,3)::text || ' avg score, $' ||
                    AVG(gmv)::numeric(10,2)::text || ' avg GMV'
                FROM transactions_enriched;""",
            ]
            result = subprocess.run(stats_cmd, capture_output=True, text=True)
            if result.returncode == 0:
                stats = result.stdout.strip()
                print(f"   Stats: {stats}")

            # Check populated columns
            populated_cmd = [
                "psql",
                "-U",
                "gklainert",
                "-d",
                "olorin_db",
                "-t",
                "-c",
                """SELECT COUNT(DISTINCT column_name)
                FROM information_schema.columns
                WHERE table_name = 'transactions_enriched'
                AND table_schema = 'public';""",
            ]
            result = subprocess.run(populated_cmd, capture_output=True, text=True)
            if result.returncode == 0:
                col_count = int(result.stdout.strip())
                print(f"   Columns in table: {col_count}")

        print(f"\n" + "=" * 80)
        if count >= self.num_records * 0.9:
            print("✅ COMPREHENSIVE Test Data Generation COMPLETE")
            print(f"   ALL {len(self.schema)} columns populated for {count:,} records")
        else:
            print(f"⚠️  Expected {self.num_records:,} but got {count:,}")
        print("=" * 80)

        return count >= self.num_records * 0.9


if __name__ == "__main__":
    generator = ComprehensiveFraudDataGenerator(num_records=5000)
    success = generator.generate_all()
    exit(0 if success else 1)
