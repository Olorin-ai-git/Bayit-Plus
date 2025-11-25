#!/usr/bin/env python3
"""
Generate 10,000 diverse records for Snowflake TRANSACTIONS_ENRICHED table.
This creates realistic fraud detection test data with various risk patterns.
"""

import hashlib
import os
import random
import string
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Tuple

import snowflake.connector
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))


class DataGenerator:
    """Generate realistic fraud detection test data."""

    def __init__(self):
        # Email domains with risk profiles
        self.safe_domains = [
            "gmail.com",
            "yahoo.com",
            "outlook.com",
            "hotmail.com",
            "company.com",
            "business.com",
            "corporate.net",
            "enterprise.org",
        ]
        self.risky_domains = [
            "tempmail.com",
            "guerrillamail.com",
            "mailinator.com",
            "throwaway.email",
            "temporary.net",
        ]
        self.fraud_domains = [
            "darkweb.onion",
            "stolen.cc",
            "fraud.net",
            "scam.org",
            "phishing.com",
            "hackers.io",
        ]

        # Device types
        self.device_types = ["iPhone", "Android", "iPad", "Windows", "Mac", "Linux"]
        self.browsers = ["Chrome", "Safari", "Firefox", "Edge", "Opera"]

        # Countries with risk levels
        self.low_risk_countries = ["US", "CA", "GB", "DE", "FR", "JP", "AU", "NZ"]
        self.medium_risk_countries = ["MX", "BR", "IN", "CN", "RU", "ZA", "AR", "CL"]
        self.high_risk_countries = ["NG", "PK", "BD", "VN", "PH", "ID", "TH", "MY"]

        # Merchant categories
        self.merchant_categories = {
            "low_risk": [
                "Groceries",
                "Gas Station",
                "Restaurant",
                "Coffee Shop",
                "Pharmacy",
            ],
            "medium_risk": [
                "Electronics",
                "Clothing",
                "Department Store",
                "Online Marketplace",
            ],
            "high_risk": [
                "Cryptocurrency",
                "Gambling",
                "Adult",
                "Money Transfer",
                "Gift Cards",
            ],
        }

        # Card types
        self.card_brands = ["Visa", "Mastercard", "Amex", "Discover"]
        self.card_types = ["Credit", "Debit", "Prepaid"]

        # Transaction types
        self.tx_types = ["PURCHASE", "WITHDRAWAL", "TRANSFER", "PAYMENT", "REFUND"]

    def generate_email(self, risk_level: str) -> str:
        """Generate email based on risk level."""
        username = "".join(
            random.choices(
                string.ascii_lowercase + string.digits, k=random.randint(5, 15)
            )
        )

        if risk_level == "low":
            domain = random.choice(self.safe_domains)
        elif risk_level == "medium":
            domain = random.choice(self.safe_domains + self.risky_domains)
        else:  # high
            domain = random.choice(self.risky_domains + self.fraud_domains)

        return f"{username}@{domain}"

    def generate_ip(self, risk_level: str) -> str:
        """Generate IP address based on risk level."""
        if risk_level == "low":
            # Regular residential IPs
            return f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
        elif risk_level == "medium":
            # Mix of residential and suspicious
            if random.random() < 0.3:
                # VPN/Proxy ranges
                return f"10.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
            return f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
        else:  # high
            # TOR exit nodes, VPNs, datacenter IPs
            prefixes = ["10.", "172.16.", "192.168.", "185.220.", "198.96."]
            prefix = random.choice(prefixes)
            return f"{prefix}{random.randint(0, 255)}.{random.randint(1, 254)}"

    def generate_device_id(self, user_id: int) -> str:
        """Generate device ID with some users having multiple devices."""
        if random.random() < 0.7:  # 70% use single device
            return f"DEV_{user_id:06d}_01"
        else:  # 30% have multiple devices
            return f"DEV_{user_id:06d}_{random.randint(1, 5):02d}"

    def generate_amount(self, risk_level: str, is_fraud: bool) -> float:
        """Generate transaction amount based on risk."""
        if is_fraud:
            # Fraudulent transactions tend to be higher
            return round(random.uniform(500, 50000), 2)

        if risk_level == "low":
            # Normal everyday transactions
            amounts = [9.99, 19.99, 29.99, 49.99, 99.99, 149.99, 199.99]
            base = random.choice(amounts)
            return round(base * random.uniform(0.8, 1.2), 2)
        elif risk_level == "medium":
            return round(random.uniform(100, 5000), 2)
        else:  # high
            return round(random.uniform(500, 25000), 2)

    def generate_risk_score(self, risk_level: str, is_fraud: bool) -> float:
        """Generate MODEL_SCORE based on risk level."""
        if is_fraud:
            return round(random.uniform(0.75, 0.99), 4)

        if risk_level == "low":
            return round(random.uniform(0.01, 0.35), 4)
        elif risk_level == "medium":
            return round(random.uniform(0.30, 0.70), 4)
        else:  # high
            return round(random.uniform(0.60, 0.95), 4)

    def generate_card_info(self) -> Tuple[str, str]:
        """Generate card BIN and last 4 digits."""
        # Common BINs
        bins = ["411111", "522222", "433333", "544444", "455555", "366666"]
        card_bin = random.choice(bins)
        card_last4 = "".join(random.choices(string.digits, k=4))
        return card_bin, card_last4

    def generate_merchant(self, risk_level: str) -> Tuple[str, str, str]:
        """Generate merchant information."""
        if risk_level == "low":
            category = random.choice(self.merchant_categories["low_risk"])
        elif risk_level == "medium":
            category = random.choice(self.merchant_categories["medium_risk"])
        else:
            category = random.choice(self.merchant_categories["high_risk"])

        merchant_name = f"{category}_{random.randint(1, 999):03d}"
        mcc = str(random.randint(1000, 9999))

        return merchant_name, category, mcc

    def generate_location_data(self, risk_level: str) -> dict:
        """Generate location-related fields."""
        if risk_level == "low":
            country = random.choice(self.low_risk_countries)
        elif risk_level == "medium":
            country = random.choice(self.medium_risk_countries)
        else:
            country = random.choice(self.high_risk_countries)

        cities = {
            "US": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"],
            "GB": ["London", "Manchester", "Birmingham", "Glasgow", "Liverpool"],
            "CA": ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
        }

        city = random.choice(
            cities.get(country, ["City_" + str(random.randint(1, 100))])
        )

        return {
            "country": country,
            "city": city,
            "postal": f"{random.randint(10000, 99999)}",
            "latitude": round(random.uniform(-90, 90), 6),
            "longitude": round(random.uniform(-180, 180), 6),
        }

    def generate_user_profile(self, user_id: int, risk_level: str) -> dict:
        """Generate consistent user profile."""
        first_names = [
            "John",
            "Jane",
            "Michael",
            "Sarah",
            "David",
            "Emma",
            "James",
            "Lisa",
        ]
        last_names = [
            "Smith",
            "Johnson",
            "Williams",
            "Brown",
            "Jones",
            "Garcia",
            "Miller",
        ]

        first_name = random.choice(first_names)
        last_name = random.choice(last_names)

        # Age correlates with risk
        if risk_level == "low":
            age = random.randint(30, 65)
        elif risk_level == "medium":
            age = random.randint(25, 45)
        else:
            age = random.randint(18, 35)

        dob = datetime.now() - timedelta(days=age * 365 + random.randint(0, 364))

        return {
            "first_name": first_name,
            "last_name": last_name,
            "full_name": f"{first_name} {last_name}",
            "username": f"{first_name.lower()}{last_name.lower()}{random.randint(1, 999)}",
            "dob": dob.date(),
            "age": age,
            "gender": random.choice(["M", "F", "Other"]),
        }


def generate_transactions(num_records: int = 10000) -> List[Tuple]:
    """Generate transaction records."""
    generator = DataGenerator()
    transactions = []

    # User distribution
    num_users = num_records // 10  # Average 10 transactions per user

    # Risk distribution (20% low, 60% medium, 20% high)
    low_risk_users = int(num_users * 0.2)
    medium_risk_users = int(num_users * 0.6)
    high_risk_users = num_users - low_risk_users - medium_risk_users

    # Generate time range (last 90 days)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)

    print(f"\n📊 Generating {num_records:,} transactions for {num_users:,} users...")
    print(f"   Low risk users: {low_risk_users:,}")
    print(f"   Medium risk users: {medium_risk_users:,}")
    print(f"   High risk users: {high_risk_users:,}")

    tx_id = 10000

    # Generate transactions for each user group
    for user_id in range(num_users):
        # Determine risk level
        if user_id < low_risk_users:
            risk_level = "low"
            fraud_probability = 0.001  # 0.1% fraud rate
            num_transactions = random.randint(5, 15)
        elif user_id < low_risk_users + medium_risk_users:
            risk_level = "medium"
            fraud_probability = 0.02  # 2% fraud rate
            num_transactions = random.randint(8, 20)
        else:
            risk_level = "high"
            fraud_probability = 0.15  # 15% fraud rate
            num_transactions = random.randint(10, 30)

        # Generate user profile
        email = generator.generate_email(risk_level)
        user_profile = generator.generate_user_profile(user_id, risk_level)
        location = generator.generate_location_data(risk_level)

        # Generate transactions for this user
        for _ in range(num_transactions):
            tx_id += 1

            # Determine if fraudulent
            is_fraud = random.random() < fraud_probability

            # Generate transaction timestamp
            tx_datetime = start_date + timedelta(
                seconds=random.randint(0, int((end_date - start_date).total_seconds()))
            )

            # Generate transaction details
            amount = generator.generate_amount(risk_level, is_fraud)
            risk_score = generator.generate_risk_score(risk_level, is_fraud)
            device_id = generator.generate_device_id(user_id)
            ip = generator.generate_ip(risk_level)
            card_bin, card_last4 = generator.generate_card_info()
            merchant_name, merchant_cat, mcc = generator.generate_merchant(risk_level)

            # Determine status
            if is_fraud and risk_score > 0.85:
                tx_status = "BLOCKED"
            elif risk_score > 0.7:
                tx_status = "REVIEW"
            else:
                tx_status = "COMPLETED"

            # Create transaction record (only essential fields for simplified insert)
            transaction = (
                f"TX{tx_id:08d}",  # TX_ID_KEY
                tx_datetime,  # TX_DATETIME
                random.choice(generator.tx_types),  # TX_TYPE
                tx_status,  # TX_STATUS
                # Amount fields
                amount,  # PAID_AMOUNT_VALUE_IN_CURRENCY
                "USD",  # PAID_CURRENCY_CODE
                amount,  # ORIGINAL_AMOUNT_VALUE
                "USD",  # ORIGINAL_CURRENCY_CODE
                1.0,  # EXCHANGE_RATE
                # User fields
                f"USER_{user_id:06d}",  # USER_ID
                email,  # EMAIL
                email.split("@")[1],  # EMAIL_DOMAIN
                user_profile["username"],  # USERNAME
                user_profile["first_name"],  # FIRST_NAME
                user_profile["last_name"],  # LAST_NAME
                user_profile["full_name"],  # FULL_NAME
                user_profile["dob"],  # DATE_OF_BIRTH
                user_profile["age"],  # AGE_AT_TX
                user_profile["gender"],  # GENDER
                # Account fields
                f"ACC_{user_id:06d}",  # ACCOUNT_ID
                "STANDARD",  # ACCOUNT_TYPE
                "ACTIVE",  # ACCOUNT_STATUS
                tx_datetime
                - timedelta(days=random.randint(30, 1000)),  # ACCOUNT_CREATED_DATE
                random.randint(30, 1000),  # ACCOUNT_AGE_DAYS
                (
                    "VERIFIED"
                    if risk_level == "low"
                    else random.choice(["VERIFIED", "PENDING", "UNVERIFIED"])
                ),  # ACCOUNT_VERIFICATION_STATUS
                (
                    "COMPLETED"
                    if risk_level == "low"
                    else random.choice(["COMPLETED", "PARTIAL", "NONE"])
                ),  # KYC_STATUS
                str(random.randint(1, 3)),  # KYC_LEVEL
                # Device fields
                device_id,  # DEVICE_ID
                random.choice(generator.device_types),  # DEVICE_TYPE
                random.choice(
                    ["iOS", "Android", "Windows", "MacOS", "Linux"]
                ),  # DEVICE_OS
                f"{random.randint(10, 15)}.{random.randint(0, 9)}",  # DEVICE_OS_VERSION
                random.choice(generator.browsers),  # DEVICE_BROWSER
                f"{random.randint(80, 120)}.{random.randint(0, 9)}",  # DEVICE_BROWSER_VERSION
                hashlib.md5(
                    f"{device_id}_{user_id}".encode()
                ).hexdigest(),  # DEVICE_FINGERPRINT
                f"SESSION_{tx_id:08d}",  # SESSION_ID
                random.randint(60, 3600),  # SESSION_DURATION_SECONDS
                # Location fields
                ip,  # IP
                location["country"],  # IP_COUNTRY
                f"{location['country']}_Region",  # IP_REGION
                location["city"],  # IP_CITY
                location["postal"],  # IP_POSTAL_CODE
                location["latitude"],  # IP_LATITUDE
                location["longitude"],  # IP_LONGITUDE
                f"ISP_{random.randint(1, 100)}",  # IP_ISP
                f"ORG_{random.randint(1, 100)}",  # IP_ORG
                f"AS{random.randint(1000, 9999)}",  # IP_ASN
                (
                    "RESIDENTIAL"
                    if risk_level == "low"
                    else random.choice(["RESIDENTIAL", "BUSINESS", "DATACENTER", "VPN"])
                ),  # IP_TYPE
                # Card fields
                card_bin,  # CARD_BIN
                card_last4,  # CARD_LAST4
                random.choice(generator.card_types),  # CARD_TYPE
                random.choice(generator.card_brands),  # CARD_BRAND
                f"Bank_{random.randint(1, 50)}",  # CARD_ISSUER
                location["country"],  # CARD_ISSUER_COUNTRY
                random.choice(["CREDIT", "DEBIT", "PREPAID"]),  # CARD_FUNDING_TYPE
                "CARD",  # PAYMENT_METHOD
                random.choice(
                    ["Stripe", "PayPal", "Square", "Adyen"]
                ),  # PAYMENT_PROCESSOR
                # Merchant fields
                f"MERCH_{random.randint(1, 1000):05d}",  # MERCHANT_ID
                merchant_name,  # MERCHANT_NAME
                merchant_cat,  # MERCHANT_CATEGORY
                mcc,  # MERCHANT_CATEGORY_CODE
                location["country"],  # MERCHANT_COUNTRY
                location["city"],  # MERCHANT_CITY
                # Risk scores
                risk_score,  # MODEL_SCORE
                risk_score,  # RISK_SCORE
                risk_score,  # FRAUD_PROBABILITY
                random.uniform(0, 1),  # ANOMALY_SCORE
                random.uniform(0, 1),  # VELOCITY_SCORE
                random.uniform(0, 1),  # BEHAVIOR_SCORE
                random.uniform(0, 1),  # REPUTATION_SCORE
                # Third-party scores
                (
                    random.uniform(0, 1) if random.random() > 0.5 else None
                ),  # MAXMIND_RISK_SCORE
                random.uniform(0, 100) if random.random() > 0.5 else None,  # SIFT_SCORE
                (
                    random.uniform(0, 1000) if random.random() > 0.5 else None
                ),  # EMAILAGE_SCORE
                (
                    random.uniform(0, 1) if random.random() > 0.5 else None
                ),  # IPQUALITYSCORE
                (
                    random.uniform(0, 100) if random.random() > 0.5 else None
                ),  # THREATMETRIX_SCORE
                # Fraud labels
                is_fraud,  # IS_FRAUD_TX
                "CARD_FRAUD" if is_fraud else None,  # FRAUD_TYPE
                "High risk pattern detected" if is_fraud else None,  # FRAUD_REASON
                risk_score > 0.7,  # MANUAL_REVIEW_FLAG
                "BLOCKED" if is_fraud else None,  # MANUAL_REVIEW_DECISION
                "Fraud confirmed" if is_fraud else None,  # MANUAL_REVIEW_REASON
                (
                    f"AGENT_{random.randint(1, 10):03d}" if is_fraud else None
                ),  # MANUAL_REVIEW_AGENT
                (
                    tx_datetime + timedelta(minutes=random.randint(5, 60))
                    if is_fraud
                    else None
                ),  # MANUAL_REVIEW_DATETIME
                # Decision fields
                "REJECT" if is_fraud else "APPROVE",  # NSURE_LAST_DECISION
                (
                    "Risk threshold exceeded" if risk_score > 0.7 else None
                ),  # DECISION_REASON
                tx_datetime,  # DECISION_DATETIME
                "BLOCK" if risk_score > 0.85 else "PASS",  # AUTO_DECISION
                "BLOCK" if is_fraud else "PASS",  # FINAL_DECISION
            )

            transactions.append(transaction)

            # Progress indicator
            if len(transactions) % 1000 == 0:
                print(f"   Generated {len(transactions):,} transactions...")

        # Stop when we have enough
        if len(transactions) >= num_records:
            break

    return transactions[:num_records]  # Ensure exactly num_records


def insert_to_snowflake(transactions: List[Tuple]):
    """Insert transactions into Snowflake."""
    print(f"\n📤 Connecting to Snowflake...")

    # Get database and schema from environment
    database = os.getenv("SNOWFLAKE_DATABASE", "GIL")
    schema = os.getenv("SNOWFLAKE_SCHEMA", "PUBLIC")
    table = os.getenv("SNOWFLAKE_TRANSACTIONS_TABLE", "TRANSACTIONS_ENRICHED")

    conn = snowflake.connector.connect(
        account=os.getenv("SNOWFLAKE_ACCOUNT", "")
        .replace("https://", "")
        .replace(".snowflakecomputing.com", ""),
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        database=database,
        schema=schema,
        warehouse=os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
        role="ACCOUNTADMIN",  # Need ACCOUNTADMIN for bulk insert
    )

    cursor = conn.cursor()

    try:
        # Clear existing data (optional - comment out to keep existing)
        print("\n🗑️  Clearing existing test data...")
        cursor.execute(
            f"DELETE FROM {database}.{schema}.{table} WHERE TX_ID_KEY LIKE 'TX%'"
        )

        print(f"\n📝 Inserting {len(transactions):,} transactions...")

        # Prepare insert statement for the fields we're populating
        insert_sql = f"""
        INSERT INTO {database}.{schema}.{table} (
            TX_ID_KEY, TX_DATETIME, TX_TYPE, TX_STATUS,
            PAID_AMOUNT_VALUE_IN_CURRENCY, PAID_CURRENCY_CODE, ORIGINAL_AMOUNT_VALUE, ORIGINAL_CURRENCY_CODE, EXCHANGE_RATE,
            USER_ID, EMAIL, EMAIL_DOMAIN, USERNAME, FIRST_NAME, LAST_NAME, FULL_NAME, DATE_OF_BIRTH, AGE_AT_TX, GENDER,
            ACCOUNT_ID, ACCOUNT_TYPE, ACCOUNT_STATUS, ACCOUNT_CREATED_DATE, ACCOUNT_AGE_DAYS, 
            ACCOUNT_VERIFICATION_STATUS, KYC_STATUS, KYC_LEVEL,
            DEVICE_ID, DEVICE_TYPE, DEVICE_OS, DEVICE_OS_VERSION, DEVICE_BROWSER, DEVICE_BROWSER_VERSION,
            DEVICE_FINGERPRINT, SESSION_ID, SESSION_DURATION_SECONDS,
            IP, IP_COUNTRY, IP_REGION, IP_CITY, IP_POSTAL_CODE, IP_LATITUDE, IP_LONGITUDE,
            IP_ISP, IP_ORG, IP_ASN, IP_TYPE,
            CARD_BIN, CARD_LAST4, CARD_TYPE, CARD_BRAND, CARD_ISSUER, CARD_ISSUER_COUNTRY,
            CARD_FUNDING_TYPE, PAYMENT_METHOD, PAYMENT_PROCESSOR,
            MERCHANT_ID, MERCHANT_NAME, MERCHANT_CATEGORY, MERCHANT_CATEGORY_CODE, MERCHANT_COUNTRY, MERCHANT_CITY,
            MODEL_SCORE, RISK_SCORE, FRAUD_PROBABILITY, ANOMALY_SCORE, VELOCITY_SCORE, BEHAVIOR_SCORE, REPUTATION_SCORE,
            MAXMIND_RISK_SCORE, SIFT_SCORE, EMAILAGE_SCORE, IPQUALITYSCORE, THREATMETRIX_SCORE,
            IS_FRAUD_TX, FRAUD_TYPE, FRAUD_REASON, MANUAL_REVIEW_FLAG, MANUAL_REVIEW_DECISION,
            MANUAL_REVIEW_REASON, MANUAL_REVIEW_AGENT, MANUAL_REVIEW_DATETIME,
            NSURE_LAST_DECISION, DECISION_REASON, DECISION_DATETIME, AUTO_DECISION, FINAL_DECISION
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                 %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s, %s)
        """

        # Batch insert for performance
        batch_size = 1000
        for i in range(0, len(transactions), batch_size):
            batch = transactions[i : i + batch_size]
            cursor.executemany(insert_sql, batch)
            print(
                f"   Inserted {min(i+batch_size, len(transactions)):,} / {len(transactions):,} records..."
            )

        print("\n✅ All transactions inserted successfully!")

        # Verify and show statistics
        print("\n📊 Verifying data...")

        cursor.execute(
            f"""
            SELECT
                COUNT(*) as total_records,
                COUNT(DISTINCT EMAIL) as unique_users,
                MIN(TX_DATETIME) as earliest_tx,
                MAX(TX_DATETIME) as latest_tx,
                AVG(MODEL_SCORE) as avg_risk_score,
                SUM(CASE WHEN IS_FRAUD_TX = TRUE THEN 1 ELSE 0 END) as fraud_count,
                AVG(PAID_AMOUNT_VALUE_IN_CURRENCY) as avg_amount,
                MAX(PAID_AMOUNT_VALUE_IN_CURRENCY) as max_amount
            FROM {database}.{schema}.{table}
        """
        )

        stats = cursor.fetchone()

        print("\n" + "=" * 70)
        print("📈 DATABASE STATISTICS")
        print("=" * 70)
        print(f"Total Records: {stats[0]:,}")
        print(f"Unique Users: {stats[1]:,}")
        print(f"Date Range: {stats[2]} to {stats[3]}")
        print(f"Average Risk Score: {stats[4]:.4f}")
        print(f"Fraud Transactions: {stats[5]:,} ({stats[5]/stats[0]*100:.2f}%)")
        print(f"Average Amount: ${stats[6]:,.2f}")
        print(f"Max Amount: ${stats[7]:,.2f}")

        # Show top risk entities
        print("\n" + "=" * 70)
        print("🎯 TOP 10 RISK ENTITIES (by risk-weighted value)")
        print("=" * 70)

        cursor.execute(
            f"""
            WITH risk_calc AS (
                SELECT
                    EMAIL,
                    COUNT(*) as tx_count,
                    SUM(MODEL_SCORE * PAID_AMOUNT_VALUE_IN_CURRENCY) as risk_value,
                    AVG(MODEL_SCORE) as avg_risk,
                    SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as total_amount,
                    SUM(CASE WHEN IS_FRAUD_TX = TRUE THEN 1 ELSE 0 END) as fraud_count
                FROM {database}.{schema}.{table}
                GROUP BY EMAIL
            )
            SELECT * FROM risk_calc
            ORDER BY risk_value DESC
            LIMIT 10
        """
        )

        print(
            f"{'Rank':<5} {'Email':<35} {'Risk Value':<15} {'Txns':<6} {'Avg Risk':<10} {'Frauds'}"
        )
        print("-" * 90)

        for i, row in enumerate(cursor.fetchall(), 1):
            email = row[0][:33] + ".." if len(row[0]) > 35 else row[0]
            print(
                f"{i:<5} {email:<35} ${row[2]:<14,.2f} {row[1]:<6} {row[3]:<10.4f} {row[5]}"
            )

    finally:
        cursor.close()
        conn.close()

    print("\n" + "=" * 70)
    print("✅ DATA GENERATION COMPLETE!")
    print("=" * 70)
    print("\nYou can now run:")
    print("  poetry run python scripts/get_top_risk_entities.py")
    print(
        "  poetry run python scripts/get_top_risk_entities.py --time-window 30d --top 5"
    )


def main():
    """Main function."""
    print("\n" + "=" * 70)
    print("🚀 GENERATING 10,000 TRANSACTION RECORDS")
    print("=" * 70)

    # Generate transactions
    transactions = generate_transactions(10000)

    # Insert to Snowflake
    insert_to_snowflake(transactions)


if __name__ == "__main__":
    main()
