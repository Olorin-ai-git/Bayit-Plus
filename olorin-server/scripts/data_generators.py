"""
Data Generation Module - Realistic Field Population

Generates realistic fraud detection data for PostgreSQL population.
Uses context-aware generation based on risk scores and transaction patterns.

Author: Gil Klainert
Date: 2025-11-06
Version: 1.0.0
"""

import random
from datetime import datetime, timedelta
from typing import Dict, List


class FraudDataGenerator:
    """Generates realistic fraud detection data based on context."""

    def __init__(self):
        """Initialize reference data pools."""
        self.device_types = ["mobile", "desktop", "tablet"]
        self.os_names = ["iOS", "Android", "Windows", "macOS", "Linux"]
        self.browsers = ["Chrome", "Safari", "Firefox", "Edge", "Opera"]
        self.countries = ["USA", "Canada", "UK", "Germany", "France", "Japan", "Australia", "Brazil"]
        self.cities_by_country = {
            "USA": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"],
            "Canada": ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
            "UK": ["London", "Manchester", "Birmingham", "Leeds", "Glasgow"],
            "Germany": ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt"]
        }
        self.isps = ["Comcast", "AT&T", "Verizon", "CenturyLink", "Charter", "Cox"]
        self.card_types = ["debit", "credit", "prepaid"]
        self.merchants = ["Amazon", "Walmart", "Target", "Best Buy", "Apple Store", "eBay"]

    def generate_all_fields(self, record: Dict) -> Dict:
        """Generate comprehensive field data based on record context."""
        risk_score = record.get("model_score", 0.5)
        is_high_risk = risk_score > 0.7
        is_fraud = record.get("is_fraud_tx", 0) == 1
        tx_time = record.get("tx_datetime")

        data = {}
        if not record.get("device_id"):
            data.update(self.generate_device_fields(is_high_risk))
        data.update(self.generate_network_fields(is_high_risk, is_fraud))
        data.update(self.generate_card_fields())
        data.update(self.generate_user_fields(tx_time))
        data.update(self.generate_merchant_fields())
        data.update(self.generate_velocity_fields(risk_score))
        data.update(self.generate_third_party_scores(risk_score))
        data.update(self.generate_session_fields())
        data.update(self.generate_auth_fields(is_high_risk))
        data.update(self.generate_address_fields())
        data.update(self.generate_marketing_fields())

        return data

    def generate_device_fields(self, is_high_risk: bool) -> Dict:
        """Generate device and browser fields."""
        device_type = random.choice(self.device_types)
        os_name = random.choice(self.os_names)
        browser = random.choice(self.browsers)

        return {
            "device_id": f"dev_{random.randint(100000, 999999)}",
            "device_type": device_type,
            "device_model": f"Model-{random.randint(1, 20)}",
            "device_manufacturer": random.choice(["Apple", "Samsung", "Google", "Dell", "HP"]),
            "device_os": os_name,
            "device_os_version": f"{random.randint(10, 15)}.{random.randint(0, 9)}",
            "browser_name": browser,
            "browser_version": f"{random.randint(90, 120)}.0",
            "user_agent": f"Mozilla/5.0 ({os_name}) {browser}/{random.randint(90, 120)}.0",
            "screen_resolution": random.choice(["1920x1080", "1366x768", "2560x1440", "1440x900"]),
            "device_fingerprint": f"fp_{random.randint(1000000, 9999999)}",
            "is_mobile": device_type == "mobile",
            "is_tablet": device_type == "tablet",
            "is_desktop": device_type == "desktop"
        }

    def generate_network_fields(self, is_high_risk: bool, is_fraud: bool) -> Dict:
        """Generate network and IP fields."""
        country = random.choice(self.countries)
        cities = self.cities_by_country.get(country, ["Unknown City"])

        return {
            "ip_country": country,
            "ip_country_code": country[:2].upper(),
            "ip_city": random.choice(cities),
            "ip_region": random.choice(cities),
            "ip_postal_code": f"{random.randint(10000, 99999)}",
            "ip_latitude": round(random.uniform(-90, 90), 6),
            "ip_longitude": round(random.uniform(-180, 180), 6),
            "ip_isp": random.choice(self.isps),
            "ip_organization": random.choice(self.isps),
            "ip_asn": f"AS{random.randint(1000, 99999)}",
            "is_vpn": is_fraud and random.random() < 0.4,
            "is_proxy": is_high_risk and random.random() < 0.2,
            "is_tor": is_fraud and random.random() < 0.15,
            "is_datacenter": random.random() < 0.05,
            "connection_type": "vpn" if is_fraud else "broadband"
        }

    def generate_card_fields(self) -> Dict:
        """Generate card related fields."""
        card_type = random.choice(self.card_types)
        return {
            "card_type": card_type,
            "card_category": "personal" if random.random() < 0.8 else "business",
            "card_bin": f"{random.randint(400000, 599999)}",
            "card_last_4": f"{random.randint(1000, 9999)}",
            "card_expiry_date": f"{random.randint(1, 12):02d}/{random.randint(25, 30)}",
            "card_issuer_bank": random.choice(["Chase", "Wells Fargo", "Bank of America", "Citi"]),
            "card_issuer_country": random.choice(self.countries),
            "is_prepaid_card": card_type == "prepaid",
            "is_business_card": random.random() < 0.15
        }

    def generate_user_fields(self, tx_time) -> Dict:
        """Generate user profile fields."""
        age = random.randint(18, 75)
        account_age = random.randint(1, 1000)

        return {
            "age": age,
            "gender": random.choice(["male", "female", "other"]),
            "phone_number": f"+1{random.randint(2000000000, 9999999999)}",
            "phone_country_code": "+1",
            "date_of_birth": (datetime.now() - timedelta(days=age*365)).date(),
            "user_account_age_days": account_age,
            "user_first_tx_date": (datetime.now() - timedelta(days=account_age)).date(),
            "user_total_tx_count": random.randint(1, 500),
            "user_total_spend": round(random.uniform(100, 50000), 2),
            "user_avg_tx_amount": round(random.uniform(50, 500), 2),
            "user_fraud_history_count": random.randint(0, 3),
            "user_dispute_count": random.randint(0, 5),
            "user_chargeback_count": random.randint(0, 2),
            "is_repeat_customer": random.random() < 0.6,
            "customer_lifetime_value": round(random.uniform(500, 10000), 2)
        }

    def generate_merchant_fields(self) -> Dict:
        """Generate merchant fields."""
        merchant = random.choice(self.merchants)
        return {
            "merchant_id": f"merch_{random.randint(1000, 9999)}",
            "merchant_name": merchant,
            "merchant_category": random.choice(["retail", "electronics", "groceries", "services"]),
            "merchant_category_code": f"{random.randint(1000, 9999)}",
            "merchant_country": random.choice(self.countries),
            "merchant_risk_level": random.choice(["low", "medium", "high"])
        }

    def generate_velocity_fields(self, risk_score: float) -> Dict:
        """Generate velocity and behavioral metrics."""
        base_count = int(risk_score * 20) + 1
        return {
            "tx_count_1h": random.randint(0, base_count),
            "tx_count_24h": random.randint(base_count, base_count * 5),
            "tx_count_7d": random.randint(base_count * 5, base_count * 20),
            "tx_count_30d": random.randint(base_count * 10, base_count * 50),
            "unique_cards_24h": random.randint(1, 3),
            "unique_ips_24h": random.randint(1, 5),
            "unique_devices_24h": random.randint(1, 3),
            "failed_tx_count_24h": random.randint(0, max(1, int(risk_score * 10)))
        }

    def generate_third_party_scores(self, base_score: float) -> Dict:
        """Generate third-party risk scores."""
        variance = 0.1
        return {
            "maxmind_risk_score": round(max(0, min(1, base_score + random.uniform(-variance, variance))), 3),
            "emailage_score": round(max(0, min(1, base_score + random.uniform(-variance, variance))), 3),
            "sift_score": round(max(0, min(1, base_score + random.uniform(-variance, variance))), 3),
            "threatmetrix_score": round(max(0, min(1, base_score + random.uniform(-variance, variance))), 3)
        }

    def generate_session_fields(self) -> Dict:
        """Generate session and interaction fields."""
        return {
            "session_id": f"sess_{random.randint(100000, 999999)}",
            "session_duration_seconds": random.randint(30, 1800),
            "page_views_count": random.randint(1, 50),
            "clicks_count": random.randint(1, 100),
            "time_to_purchase_seconds": random.randint(60, 600)
        }

    def generate_auth_fields(self, is_high_risk: bool) -> Dict:
        """Generate authentication fields."""
        return {
            "auth_method": random.choice(["password", "sms", "email", "biometric"]),
            "auth_attempts": random.randint(1, 3 if is_high_risk else 1),
            "is_2fa_enabled": not is_high_risk and random.random() < 0.7,
            "is_biometric_auth": random.random() < 0.3,
            "password_age_days": random.randint(1, 365),
            "email_verified": random.random() < 0.8,
            "phone_verified": random.random() < 0.6
        }

    def generate_address_fields(self) -> Dict:
        """Generate billing and shipping address fields."""
        country = random.choice(self.countries)
        cities = self.cities_by_country.get(country, ["Unknown"])
        city = random.choice(cities)
        same_address = random.random() < 0.8

        return {
            "billing_city": city,
            "billing_country": country,
            "billing_postal_code": f"{random.randint(10000, 99999)}",
            "shipping_city": city if same_address else random.choice(cities),
            "shipping_country": country if same_address else random.choice(self.countries),
            "shipping_postal_code": f"{random.randint(10000, 99999)}",
            "is_billing_shipping_same": same_address
        }

    def generate_marketing_fields(self) -> Dict:
        """Generate marketing and attribution fields."""
        return {
            "acquisition_channel": random.choice(["organic", "paid", "social", "email", "referral"]),
            "campaign_id": f"camp_{random.randint(1000, 9999)}",
            "promo_code": f"PROMO{random.randint(100, 999)}" if random.random() < 0.2 else None
        }
