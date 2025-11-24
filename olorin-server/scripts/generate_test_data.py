#!/usr/bin/env python3
"""
Generate realistic test data for PostgreSQL transactions_enriched table.

This script generates 5000 transaction records with:
- Fraudulent behavior patterns
- Temporal anomalies
- All 333 columns populated
- Realistic data using Faker
"""

import asyncio
import json
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List
from decimal import Decimal

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.agent.tools.database_tool import get_database_provider

# Try to import faker, if not available, we'll use basic random data
try:
    from faker import Faker
    fake = Faker()
    HAS_FAKER = True
except ImportError:
    HAS_FAKER = False
    print("⚠️  Faker not installed. Using basic random data. Install with: poetry add faker")


class FraudTestDataGenerator:
    """Generate realistic fraud detection test data."""

    def __init__(self, num_records: int = 5000):
        self.num_records = num_records
        self.start_date = datetime.now() - timedelta(days=180)  # 6 months of data

        # Fraud patterns (20% of transactions will be fraudulent)
        self.fraud_rate = 0.20

        # Reference data pools
        self.merchants = self._generate_merchants(50)
        self.users = self._generate_users(1000)
        self.payment_methods = self._generate_payment_methods(500)
        self.ips = self._generate_ips(200)

    def _generate_merchants(self, count: int) -> List[Dict]:
        """Generate merchant pool."""
        merchants = []
        industries = ['gaming', 'digital_goods', 'subscriptions', 'e-commerce', 'travel']

        for i in range(count):
            merchant_id = f"MERCHANT_{i+1:04d}"
            merchants.append({
                'merchant_id': merchant_id,
                'store_id': f"STORE_{i+1:04d}",
                'name': f"Merchant {i+1}" if not HAS_FAKER else fake.company(),
                'segment_id': f"SEG_{random.randint(1, 10):03d}",
                'partner_id': f"PARTNER_{random.randint(1, 20):03d}",
                'partner_name': f"Partner {random.randint(1, 20)}" if not HAS_FAKER else fake.company(),
                'industry': random.choice(industries)
            })
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

            user_id = f"USER_{i+1:06d}"
            users.append({
                'user_id': user_id,
                'email': email,
                'email_normalized': email.lower(),
                'first_name': first,
                'last_name': last,
                'phone_country_code': '+1',
                'phone_number': f"{random.randint(2000000000, 9999999999)}",
                'first_seen': self.start_date + timedelta(days=random.randint(0, 150)),
                'is_fraudster': random.random() < 0.15  # 15% are fraudsters
            })
        return users

    def _generate_payment_methods(self, count: int) -> List[Dict]:
        """Generate payment method pool."""
        payment_methods = []
        card_brands = ['Visa', 'Mastercard', 'Amex', 'Discover']
        card_types = ['credit', 'debit', 'prepaid']
        countries = ['US', 'GB', 'CA', 'FR', 'DE', 'CN', 'IN', 'BR']

        for i in range(count):
            bin_number = f"{random.randint(400000, 599999)}"
            payment_methods.append({
                'bin': bin_number,
                'last_four': f"{random.randint(1000, 9999)}",
                'brand': random.choice(card_brands),
                'type': random.choice(card_types),
                'country': random.choice(countries),
                'is_prepaid': random.random() < 0.10,
                'is_commercial': random.random() < 0.05,
                'issuer': f"Bank {random.randint(1, 100)}" if not HAS_FAKER else fake.company()
            })
        return payment_methods

    def _generate_ips(self, count: int) -> List[Dict]:
        """Generate IP address pool."""
        ips = []
        countries = ['US', 'GB', 'CA', 'FR', 'DE', 'CN', 'IN', 'BR', 'RU', 'NG']

        for _ in range(count):
            ip = f"{random.randint(1, 255)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(0, 255)}"
            ips.append({
                'ip': ip,
                'country': random.choice(countries),
                'isp': f"ISP {random.randint(1, 50)}" if not HAS_FAKER else fake.company(),
                'asn': f"AS{random.randint(1000, 99999)}"
            })
        return ips

    def generate_transaction(self, index: int) -> Dict[str, Any]:
        """Generate a single transaction record with all 333 columns."""

        # Temporal distribution (more recent = more transactions)
        days_ago = int(180 * (1 - (index / self.num_records)) ** 2)
        tx_datetime = self.start_date + timedelta(
            days=days_ago,
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59)
        )

        # Select entities
        merchant = random.choice(self.merchants)
        user = random.choice(self.users)
        payment_method = random.choice(self.payment_methods)
        ip_data = random.choice(self.ips)

        # Determine if this transaction is fraudulent
        is_fraud = user['is_fraudster'] or random.random() < self.fraud_rate

        # Transaction amount
        if is_fraud:
            # Fraudsters often test with small amounts then go big
            gmv = random.choice([
                round(random.uniform(0.01, 5.00), 2),    # Card testing
                round(random.uniform(500, 5000), 2)       # Big fraud
            ])
        else:
            gmv = round(random.uniform(10.00, 500.00), 2)

        # Model score (0-1, higher = more fraud risk)
        if is_fraud:
            model_score = random.uniform(0.70, 0.99)
        else:
            model_score = random.uniform(0.01, 0.30)

        # Decision based on model score
        model_threshold = 0.60
        if model_score >= model_threshold:
            model_decision = 'REJECT'
            nsure_decision = 'REJECTED'
        elif model_score >= 0.40:
            model_decision = 'REVIEW'
            nsure_decision = random.choice(['APPROVED', 'REJECTED'])
        else:
            model_decision = 'APPROVE'
            nsure_decision = 'APPROVED'

        # Generate transaction ID
        tx_id = f"TX_{tx_datetime.strftime('%Y%m%d')}_{index:06d}"

        # Cart items
        num_items = random.randint(1, 5)
        cart_items = []
        cart_types = []
        cart_skus = []
        cart_brands = []

        for _ in range(num_items):
            cart_items.append({
                'name': f"Product {random.randint(1, 1000)}" if not HAS_FAKER else fake.catch_phrase(),
                'price': round(random.uniform(10, 200), 2),
                'quantity': random.randint(1, 3)
            })
            cart_types.append(random.choice(['physical', 'digital', 'subscription']))
            cart_skus.append(f"SKU-{random.randint(10000, 99999)}")
            cart_brands.append(f"Brand {random.randint(1, 50)}" if not HAS_FAKER else fake.company())

        # Build complete record
        record = {
            # Timestamps and IDs
            'table_record_created_at': tx_datetime.isoformat(),
            'table_record_updated_at': tx_datetime.isoformat(),
            'event_type': random.choice(['TRANSACTION', 'AUTHORIZATION', 'CAPTURE']),
            'original_tx_id': tx_id,
            'store_id': merchant['store_id'],
            'client_request_id': f"REQ_{tx_id}",
            'app_id': f"APP_{random.randint(1, 10):03d}",
            'tx_id_key': tx_id,
            'surrogate_app_tx_id': f"SURROGATE_{tx_id}",
            'nsure_unique_tx_id': f"NSURE_{tx_id}",
            'unique_user_id': user['user_id'],
            'tx_datetime': tx_datetime.isoformat(),
            'tx_received_datetime': (tx_datetime + timedelta(milliseconds=random.randint(10, 500))).isoformat(),
            'tx_uploaded_to_snowflake': (tx_datetime + timedelta(minutes=random.randint(1, 10))).isoformat(),
            'tx_timestamp_ms': int(tx_datetime.timestamp() * 1000),
            'is_sent_for_nsure_review': 1 if model_score >= 0.40 else 0,
            'authorization_stage': random.choice(['AUTHORIZED', 'PENDING', 'CAPTURED']),

            # Personal Info
            'email': user['email'],
            'email_normalized': user['email_normalized'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'phone_country_code': user['phone_country_code'],
            'phone_number': user['phone_number'],
            'date_of_birth': None if random.random() < 0.3 else (datetime.now() - timedelta(days=random.randint(18*365, 80*365))).isoformat(),
            'personal_info_additional_data': json.dumps({'verified': random.choice([True, False])}),
            'merchant_segment_id': merchant['segment_id'],

            # Billing and Cart
            'billing_address': json.dumps({
                'street': f"{random.randint(1, 9999)} Main St" if not HAS_FAKER else fake.street_address(),
                'city': f"City {random.randint(1, 100)}" if not HAS_FAKER else fake.city(),
                'state': random.choice(['CA', 'NY', 'TX', 'FL', 'IL']),
                'zip': f"{random.randint(10000, 99999)}",
                'country': ip_data['country'] if not is_fraud else random.choice(['US', 'CN', 'NG', 'RU'])
            }),
            'cart': json.dumps(cart_items),
            'cart_items_types': json.dumps(cart_types),
            'product': cart_items[0]['name'] if cart_items else None,
            'cart_skus': json.dumps(cart_skus),
            'cart_brands': json.dumps(cart_brands),
            'cart_items_are_gifts': json.dumps([False] * len(cart_items)),
            'cart_items_fulfillment': json.dumps(['standard'] * len(cart_items)),
            'credit_use': json.dumps({'amount': 0, 'currency': 'USD'}),

            # Payment amounts
            'paid_amount_currency': 'USD',
            'paid_amount_value_in_currency': gmv,
            'processing_fee_currency': 'USD',
            'processing_fee_value_in_currency': round(gmv * 0.029 + 0.30, 2),

            # Payment method
            'bin': payment_method['bin'],
            'last_four': payment_method['last_four'],
            'payment_method': 'credit_card',
            'processor': random.choice(['stripe', 'braintree', 'adyen']),
            'processor_merchant_identifier': f"PROC_{merchant['merchant_id']}",
            'payment_method_token': f"TOK_{random.randint(100000, 999999)}",
            'payment_method_internal_identifier': f"PM_{random.randint(100000, 999999)}",
            'card_holder_name': f"{user['first_name']} {user['last_name']}" if not is_fraud else f"Different Name",
            'is_three_d_secure_verified': random.randint(0, 1),
            'three_d_secure_result': random.choice(['success', 'failed', None]),
            'is_under_three_d_secure': random.randint(0, 1),
            'paypal_email': None,
            'payment_method_details_additional_data': json.dumps({}),

            # Transaction status
            'is_anonymous': 0,
            'failure_reason': None if nsure_decision == 'APPROVED' else random.choice(['insufficient_funds', 'suspected_fraud', 'invalid_card']),
            'transaction_details_additional_data': json.dumps({}),

            # Device and session
            'device_id': f"DEVICE_{random.randint(100000, 999999)}",
            'ip': ip_data['ip'],
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'session_info_language': random.choice(['en-US', 'en-GB', 'fr-FR', 'de-DE']),
            'session_info_additional_data': json.dumps({}),

            # Recipient info
            'first_recipient_info': json.dumps({'email': user['email'], 'name': user['first_name']}),
            'first_recipient_email': user['email'],
            'first_recipient_phone': user['phone_number'],
            'all_recipient_info': json.dumps([{'email': user['email']}]),
            'all_recipient_emails': json.dumps([user['email']]),
            'all_recipient_emails_normalized': json.dumps([user['email_normalized']]),
            'is_gifting': 0,
            'cart_delivery_methods': json.dumps(['email']),
            'is_delivery_method_email_only': 1,
            'is_delivery_method_containing_on_screen': 0,

            # Merchant info
            'partner_id': merchant['partner_id'],
            'risk_mode': 'live',
            'tx_additional_data': json.dumps({}),

            # Calculated props
            'calculated_props_id': f"CALC_{tx_id}",
            'calculated_props_created_datetime': tx_datetime.isoformat(),
            'calculated_props_uploaded_to_snowflake': (tx_datetime + timedelta(minutes=1)).isoformat(),
            'cart_usd': json.dumps(cart_items),
            'gmv': gmv,

            # Email verification
            'is_email_verified_by_third_party': random.randint(0, 1),
            'is_recipient_email_verified_by_third_party': random.randint(0, 1),
            'email_first_seen': user['first_seen'].isoformat(),
            'paypal_email_first_seen': None,
            'recipient_email_first_seen': user['first_seen'].isoformat(),
            'email_data_third_party_risk_score': random.uniform(0.0, 1.0) if random.random() < 0.5 else None,

            # IP and location
            'ip_country_code': ip_data['country'],
            'is_device_id_authenticated': random.randint(0, 1),
            'is_paypal_address_confirmed': 0,
            'pipl_info_age': json.dumps({'age': random.randint(18, 80)}),
            'pipl_info_person': json.dumps({}),

            # Processor flags
            'is_processor_reported_stolen_card': 1 if is_fraud and random.random() < 0.2 else 0,
            'is_processor_rejected_due_to_fraud': 1 if is_fraud and random.random() < 0.3 else 0,

            # IP address info
            'ip_address_info': json.dumps({
                'country': ip_data['country'],
                'isp': ip_data['isp'],
                'asn': ip_data['asn']
            }),
            'isp': ip_data['isp'],
            'isp_array': json.dumps([ip_data['isp']]),
            'asn': ip_data['asn'],

            # Days calculations
            'days_from_first_email_seen_to_tx': (tx_datetime - user['first_seen']).days,
            'days_from_first_paypal_email_seen_to_tx': None,
            'days_from_first_recipient_email_seen_to_tx': (tx_datetime - user['first_seen']).days,

            # Merchant
            'merchant_name': merchant['name'],
            'partner_name': merchant['partner_name'],

            # Decisions
            'nsure_decisions': json.dumps([nsure_decision]),
            'count_nsure_decisions': 1,
            'nsure_first_decision': nsure_decision,
            'nsure_first_decision_datetime': (tx_datetime + timedelta(seconds=random.randint(1, 30))).isoformat(),
            'nsure_last_decision': nsure_decision,
            'nsure_last_decision_datetime': (tx_datetime + timedelta(seconds=random.randint(1, 30))).isoformat(),
            'nsure_last_decision_uploaded_to_snowflake': (tx_datetime + timedelta(minutes=2)).isoformat(),
            'is_reassessed_tx': 0,

            # Rules
            'triggered_rules': json.dumps([]),
            'count_triggered_rules': 0,
            'rule': None,
            'rule_decision': None,
            'rule_description': None,
            'is_rule_participating_in_lfs_po': 0,
            'triggered_lfs_rules': json.dumps([]),

            # Model
            'model_decision': model_decision,
            'model_score': model_score,
            'model_version': 'v2.1.0',
            'model_approval_threshold': model_threshold,
            'model_soft_approval_threshold': 0.40,
            'rejection_reason': None if nsure_decision == 'APPROVED' else 'HIGH_RISK_SCORE',
            'not_reviewed_reason': None,
            'simulated_decision': None,
            'simulated_segment_id': None,
            'nsure_segment_id': merchant['segment_id'],
            'additional_segments': json.dumps([]),

            # Merchant decisions
            'merchant_last_decision_uploaded_to_snowflake': (tx_datetime + timedelta(minutes=3)).isoformat(),
            'merchant_decisions': json.dumps([]),
            'count_merchant_decisions': 0,
            'merchant_last_decision': None,
            'merchant_last_decision_datetime': None,

            # Transaction flags
            'is_failed_tx': 1 if nsure_decision == 'REJECTED' else 0,
            'is_reviewed': 1 if model_score >= 0.40 else 0,
            'raw_processor_response': json.dumps({}),
            'raw_processor_response_source': 'processor',
            'raw_processor_request': json.dumps({}),
            'raw_processor_request_source': 'app',
            'is_under_nsure_liability': 1 if model_score >= 0.40 else 0,
            'is_soft_approved': 1 if 0.40 <= model_score < 0.60 else 0,

            # Device details
            'app_install_datetime': (user['first_seen'] - timedelta(days=random.randint(0, 30))).isoformat(),
            'device_type': random.choice(['mobile', 'desktop', 'tablet']),
            'device_model': random.choice(['iPhone 13', 'Samsung Galaxy', 'iPad', 'Desktop']),
            'device_os_version': random.choice(['iOS 15', 'Android 12', 'Windows 10']),
            'device_app_install_sdk_version': 'v1.2.3',
            'fipp_visitor_id': f"VIS_{random.randint(100000, 999999)}",
            'fipp_is_incognito': is_fraud and random.random() < 0.5,
            'days_from_first_app_install_to_tx': (tx_datetime - (user['first_seen'] - timedelta(days=random.randint(0, 30)))).days,

            # Card details
            'card_brand': payment_method['brand'],
            'card_category': random.choice(['consumer', 'business', 'corporate']),
            'card_type': payment_method['type'],
            'is_card_commercial': payment_method['is_commercial'],
            'is_card_prepaid': payment_method['is_prepaid'],
            'card_issuer': payment_method['issuer'],
            'bin_country_code': payment_method['country'],
            'card_issuer_normalized': payment_method['issuer'].upper().replace(' ', '_'),
            'bin_additional_data': json.dumps({}),
            'bin_created_time': tx_datetime.isoformat(),
            'bin_uploaded_to_snowflake': (tx_datetime + timedelta(minutes=1)).isoformat(),

            # HLR (phone validation)
            'hlr_phone_country_code': user['phone_country_code'],
            'hlr_is_valid': random.randint(0, 1),
            'hlr_number_valid': random.randint(0, 1),
            'hlr_is_mobile': 1,
            'hlr_is_ported': 0,
            'hlr_is_roaming': 0,
            'hlr_number_type': 'mobile',
            'hlr_origin_network': 'Network1',
            'hlr_status': 'active',
            'hlr_current_network': 'Network1',
            'hlr_ported_network': None,
            'hlr_additional_data': json.dumps({}),
            'hlr_created_time': tx_datetime.isoformat(),
            'hlr_uploaded_to_snowflake': (tx_datetime + timedelta(minutes=1)).isoformat(),

            # MaxMind
            'maxmind_ip_risk_score': random.uniform(0.0, 1.0) if is_fraud else random.uniform(0.0, 0.3),
            'maxmind_risk_score': random.uniform(0.0, 1.0) if is_fraud else random.uniform(0.0, 0.3),
            'maxmind_created_time': tx_datetime.isoformat(),
            'maxmind_uploaded_to_snowflake': (tx_datetime + timedelta(minutes=1)).isoformat(),

            # Email validation
            'buyer_email_smtpv_response': json.dumps({'valid': True}),
            'smtpv_buyer_email_created_time': tx_datetime.isoformat(),
            'smtpv_buyer_email_uploaded_to_snowflake': (tx_datetime + timedelta(minutes=1)).isoformat(),
            'email_validation_created': tx_datetime.isoformat(),
            'email_validation_uploaded_to_snowflake': (tx_datetime + timedelta(minutes=1)).isoformat(),
            'is_disposable_email': 1 if is_fraud and random.random() < 0.3 else 0,
            'is_freemail': 1 if '@gmail.com' in user['email'] or '@yahoo.com' in user['email'] else 0,
            'is_personal_email': 1,
            'is_valid_email': 1,
            'email_validation_additional_data': json.dumps({}),

            # Recipient email validation
            'recipient_email_validation_created': tx_datetime.isoformat(),
            'recipient_email_validation_uploaded_to_snowflake': (tx_datetime + timedelta(minutes=1)).isoformat(),
            'is_recipient_email_disposable': 0,
            'is_recipient_email_freemail': 1 if '@gmail.com' in user['email'] else 0,
            'is_recipient_email_personal': 1,
            'is_recipient_email_valid': 1,
            'recipient_email_validation_additional_data': json.dumps({}),

            # Disputes and chargebacks
            'disputes': json.dumps([]) if not (is_fraud and random.random() < 0.5) else json.dumps([{
                'datetime': (tx_datetime + timedelta(days=random.randint(30, 90))).isoformat(),
                'status': 'lost',
                'reason': 'fraud'
            }]),
            'count_disputes': 1 if (is_fraud and random.random() < 0.5) else 0,
            'first_dispute_datetime': (tx_datetime + timedelta(days=random.randint(30, 90))).isoformat() if (is_fraud and random.random() < 0.5) else None,
            'last_dispute_datetime': (tx_datetime + timedelta(days=random.randint(30, 90))).isoformat() if (is_fraud and random.random() < 0.5) else None,
            'last_dispute_uploaded_to_snowflake': None,
            'last_dispute_amount': json.dumps({'amount': gmv, 'currency': 'USD'}) if (is_fraud and random.random() < 0.5) else None,
            'last_dispute_status': 'lost' if (is_fraud and random.random() < 0.5) else None,
            'last_dispute_decision': 'merchant_lost' if (is_fraud and random.random() < 0.5) else None,
            'is_last_dispute_fraud_related_reason': 1 if (is_fraud and random.random() < 0.5) else 0,
            'last_dispute_reason': 'fraudulent' if (is_fraud and random.random() < 0.5) else None,
            'last_dispute_source': json.dumps({'source': 'customer'}) if (is_fraud and random.random() < 0.5) else None,
            'first_non_fraud_dispute_datetime': None,

            # Fraud alerts
            'fraud_alerts': json.dumps([]),
            'count_fraud_alerts': 0,
            'first_fraud_alert_datetime': None,
            'last_fraud_alert_datetime': None,
            'last_fraud_alert_uploaded_to_snowflake': None,

            # Refunds
            'nsure_initiated_refund_datetime': None,
            'last_nsure_initiated_refund_uploaded_to_snowflake': None,
            'tx_refund_reason': None,
            'tx_refund_datetime': None,
            'tx_refund_uploaded_to_snowflake': None,

            # MaxMind fraud alerts
            'last_maxmind_min_fraud_alert_datetime': None,
            'last_maxmind_min_fraud_alert_uploaded_to_snowflake': None,
            'last_maxmind_min_fraud_alert_new_risk_score': None,
            'last_maxmind_min_fraud_alert_reason_code': None,
            'maxmind_min_fraud_alerts': json.dumps([]),
            'count_maxmind_min_fraud_alerts': 0,

            # Retries
            'buyer_retry_tx_id': None,
            'nsure_retry_tx_id': None,
            'last_retry_uploaded_to_snowflake': None,

            # User timeline
            'first_nsure_tx_attempt_datetime': user['first_seen'].isoformat(),
            'first_user_tx_event_datetime': user['first_seen'].isoformat(),
            'is_user_first_tx_event': 1 if (tx_datetime - user['first_seen']).days < 1 else 0,
            'first_user_account_activity_date': user['first_seen'].isoformat(),
            'first_sign_in_identity_provider': random.choice(['google', 'facebook', 'email']),
            'first_user_failed_kyc_datetime': None,
            'first_user_successfully_fulfilled_kyc_datetime': None,
            'first_user_triggered_kyc_datetime': None,
            'model_manager_tx_features_uploaded_to_snowflake': (tx_datetime + timedelta(minutes=1)).isoformat(),

            # Transaction timeline
            'first_merchant_accepted_datetime': user['first_seen'].isoformat(),
            'first_payment_method_attempt_datetime': user['first_seen'].isoformat(),
            'first_tx_attempt_datetime': user['first_seen'].isoformat(),
            'days_from_first_tx_attempt_to_tx': (tx_datetime - user['first_seen']).days,
            'days_from_first_user_account_activity_date_to_tx': (tx_datetime - user['first_seen']).days,

            # Fraud status
            'first_fraud_status_datetime': (tx_datetime + timedelta(days=60)).isoformat() if is_fraud else None,
            'is_fraud_tx': 1 if is_fraud else 0,
            'is_disputed_non_fraud_tx': 0,

            # Geography
            'payment_method_country_code': payment_method['country'],
            'days_from_first_merchant_acceptance_to_tx': (tx_datetime - user['first_seen']).days,
            'days_from_first_payment_method_attempt_to_tx': (tx_datetime - user['first_seen']).days,

            # Distance metrics
            'local_part_to_name_distance': random.uniform(0.0, 1.0),
            'buyer_name_to_pipl_name_distance': random.uniform(0.0, 0.5) if not is_fraud else random.uniform(0.5, 1.0),
            'paypal_local_part_to_name_distance': None,
            'personal_info_email_to_recipient_email_local_parts_distance': 0.0,

            # Group metrics
            'group_new_buyers_gmv_in_last_day': random.uniform(0, 10000),
            'group_new_payment_methods_gmv_in_last_day': random.uniform(0, 10000),
            'group_new_buyers_txs_in_last_day': random.uniform(0, 100),
            'group_new_payment_methods_txs_in_last_day': random.uniform(0, 100),
            'group_max_maxmind_risk_score': random.uniform(0.0, 1.0),
            'group_tx_failure_count': random.uniform(0, 10),
            'group_tx_failure_gmv': random.uniform(0, 1000),
            'pm_accepted_txs_count': random.uniform(1, 100),
            'user_graph_size': random.uniform(1, 50),
            'bin_risky_gmv': random.uniform(0, 5000) if is_fraud else random.uniform(0, 500),

            # Demographics
            'buyer_age': random.uniform(18, 80),
            'days_from_visitor_id_age': random.uniform(0, 365),

            # User classification
            'is_recurring_user': 1 if (tx_datetime - user['first_seen']).days > 30 else 0,
            'is_new_buyer__model_feature': 1 if (tx_datetime - user['first_seen']).days < 7 else 0,
            'is_new_payment_method__model_feature': 1 if (tx_datetime - user['first_seen']).days < 7 else 0,
            'is_free_mail__model_feature': 1 if '@gmail.com' in user['email'] or '@yahoo.com' in user['email'] else 0,
            'is_email_verified__model_feature': random.randint(0, 1),
            'issuer_risky_gmv__model_feature': random.uniform(0, 5000) if is_fraud else random.uniform(0, 500),
            'pm_country_risky_gmv__model_feature': random.uniform(0, 5000) if is_fraud else random.uniform(0, 500),
            'seasonality_attuned_bin_risky_gmv__model_feature': random.uniform(0, 5000) if is_fraud else random.uniform(0, 500),

            # Cart features
            'cart_without_fee_items': json.dumps(cart_items),
            'is_digital': 1 if 'digital' in cart_types else 0,
            'is_suspicious_amount': 1 if gmv < 5 or gmv > 2000 else 0,
            'days_from_store_first_tx__model_feature': random.uniform(0, 365),
            'days_from_store_creation__model_feature': random.uniform(0, 730),

            # Additional fields
            'avs': random.choice(['Y', 'N', 'U', 'A']),
            'parsed_user_agent': json.dumps({'browser': 'Chrome', 'os': 'Windows'}),
            'prod_recipient_info': json.dumps({'email': user['email']}),

            # KYC fields (mostly null for test data)
            'first_user_completed_kyc_result': None,
            'first_user_completed_kyc_type': None,
            'first_user_completed_kyc_provider': None,
            'first_user_completed_num_of_kyc_attempts': None,
            'first_user_completed_kyc_create_date': None,
            'first_user_completed_kyc_review_answer_or_status': None,
            'first_user_completed_kyc_level_name': None,
            'first_user_completed_kyc_document_type': None,
            'first_user_completed_kyc_first_name': None,
            'first_user_completed_kyc_last_name': None,
            'first_user_completed_kyc_address_country_user_input': None,
            'first_user_completed_kyc_state_user_input': None,
            'first_user_completed_kyc_town_user_input': None,
            'first_user_completed_kyc_post_code_user_input': None,
            'first_user_completed_kyc_id_post_code_from_docs_array': None,
            'first_user_completed_kyc_id_country_of_birth': None,
            'first_user_completed_kyc_id_issuing_country_from_docs_array': None,

            # Additional configuration
            'custodial_type': None,
            'soft_approval_populations_list': json.dumps([]),
            'is_soft_approval_candidate': json.dumps(False),
            'is_router_device_id_authenticated': False,
            'reassessment_rejection_reason': None,
            'milliseconds_from_soft_approved_to_reassessment_response': None,
            'last_dispute_seller_buyer_chat': None,
            'last_disputed_item_buyer_notes': None,
            'buyer_email_domain': user['email'].split('@')[1] if '@' in user['email'] else None,
            'refusal_reason': None,
            'enriched_txs_uploaded_to_snowflake': (tx_datetime + timedelta(minutes=2)).isoformat(),
            'product_type': random.choice(['digital_game', 'physical_goods', 'subscription']),
            'first_user_successfully_fulfilled_kyc_date_of_birth': None,
            'kyc_user_age': None,
            'store_first_tx_timestamp': int(user['first_seen'].timestamp() * 1000),
            'failure_category': None if nsure_decision == 'APPROVED' else random.choice(['fraud', 'payment_failure']),
            'reassessment_result': None,

            # Crypto wallet metrics (mostly null)
            'days_from_crypto_wallet_first_incoming_native_tx': None,
            'days_from_crypto_wallet_first_incoming_non_native_tx': None,
            'days_from_crypto_wallet_first_outgoing_native_tx': None,
            'days_from_crypto_wallet_first_outgoing_non_native_tx': None,

            # Additional fields
            'normalized_avs_result_code': random.choice(['Y', 'N', 'U', 'A']),
            'production_payment_method_type': 'credit_card',
            'seller_id': None,
            'merchant_kpi_update_id': None,
            'product_country_codes': json.dumps(['US']),

            # Distance metrics for geo
            'distance_ip_product__model_feature': random.uniform(0, 10000) if is_fraud else random.uniform(0, 1000),
            'distance_local_product__model_feature': random.uniform(0, 10000) if is_fraud else random.uniform(0, 1000),
            'distance_payment_method_product__model_feature': random.uniform(0, 10000) if is_fraud else random.uniform(0, 1000),
            'distance_phone_product__model_feature': random.uniform(0, 10000) if is_fraud else random.uniform(0, 1000),

            # Product details
            'most_expensive_cart_usd_item': json.dumps(max(cart_items, key=lambda x: x['price']) if cart_items else {}),
            'product_regions': json.dumps(['NA']),
            'product_platform': random.choice(['PC', 'Xbox', 'PlayStation', 'Mobile']),
            'product_gametitle': random.choice(['Game1', 'Game2', 'Game3']) if merchant['industry'] == 'gaming' else None,

            # Attack reporting
            'last_reported_attack_id': None,
            'last_reported_attack_uploaded_to_snowflake': None,
            'is_btcc_test_tx_not_reviewed_by_nsure': False,

            # Partner details
            'partner_main_product_type': random.choice(['digital_goods', 'gaming', 'subscription']),
            'partner_industry': merchant['industry'],
            'is_user_first_tx_attempt': 1 if (tx_datetime - user['first_seen']).days < 1 else 0,
        }

        return record

    async def insert_batch(self, pg_provider, records: List[Dict], batch_num: int):
        """Insert a batch of records into PostgreSQL."""
        columns = list(records[0].keys())

        # Build INSERT statement
        placeholders = ', '.join([f'${i+1}' for i in range(len(columns))])
        column_names = ', '.join(columns)

        insert_sql = f"""
            INSERT INTO transactions_enriched ({column_names})
            VALUES ({placeholders})
        """

        # Insert each record
        for i, record in enumerate(records):
            try:
                values = tuple(record[col] for col in columns)
                await pg_provider._execute_query_async(insert_sql, values)
            except Exception as e:
                print(f"   ❌ Error inserting record {i+1} in batch {batch_num}: {str(e)[:100]}")
                # Continue with next record

        print(f"   ✅ Batch {batch_num}: Inserted {len(records)} records")

    async def generate_and_insert(self):
        """Generate all test data and insert into PostgreSQL."""
        print('='*80)
        print('Test Data Generation for Fraud Detection')
        print('='*80)
        print(f'\n📊 Configuration:')
        print(f'   Total records: {self.num_records:,}')
        print(f'   Fraud rate: {self.fraud_rate*100:.1f}%')
        print(f'   Date range: {self.start_date.date()} to {datetime.now().date()}')
        print(f'   Merchants: {len(self.merchants)}')
        print(f'   Users: {len(self.users)}')
        print(f'   Payment methods: {len(self.payment_methods)}')
        print(f'   IP addresses: {len(self.ips)}')

        # Connect to PostgreSQL
        print(f'\n🔌 Connecting to PostgreSQL...')
        pg = get_database_provider('postgresql')
        pg.connect()

        # Verify table is empty
        result = await pg._execute_query_async('SELECT COUNT(*) as cnt FROM transactions_enriched')
        current_count = result[0]['cnt']

        if current_count > 0:
            print(f'\n⚠️  WARNING: Table already contains {current_count} records')
            print(f'   Truncating table...')
            await pg._execute_query_async('TRUNCATE TABLE transactions_enriched')
            print(f'   ✅ Table truncated')

        # Generate and insert in batches
        print(f'\n🏗️  Generating and inserting {self.num_records:,} transactions...')

        batch_size = 100
        total_batches = (self.num_records + batch_size - 1) // batch_size

        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, self.num_records)

            # Generate batch
            batch_records = []
            for i in range(start_idx, end_idx):
                record = self.generate_transaction(i)
                batch_records.append(record)

            # Insert batch using psycopg (direct SQL execution)
            # Build values for all records in batch
            import asyncpg

            # Get column names from first record
            columns = list(batch_records[0].keys())

            # Build multi-row INSERT
            values_list = []
            for record in batch_records:
                values = tuple(record[col] for col in columns)
                values_list.append(values)

            # Execute batch insert
            column_names = ', '.join(columns)

            # Use psql command for faster bulk insert
            import csv
            import tempfile

            # Write to temp CSV
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
                writer = csv.DictWriter(f, fieldnames=columns)
                for record in batch_records:
                    writer.writerow(record)
                temp_file = f.name

            # Use COPY command for fast insert
            try:
                copy_sql = f"COPY transactions_enriched ({column_names}) FROM '{temp_file}' WITH (FORMAT csv)"
                # This won't work through execute_query_async, so we'll use individual inserts

                # Fall back to individual inserts
                for i, record in enumerate(batch_records):
                    placeholders = ', '.join([f'${j+1}' for j in range(len(columns))])
                    insert_sql = f"INSERT INTO transactions_enriched ({column_names}) VALUES ({placeholders})"
                    values = tuple(record[col] for col in columns)

                    try:
                        await pg._execute_query_async(insert_sql, values)
                    except Exception as e:
                        if i == 0:  # Only print first error
                            print(f"      ⚠️  Insert error (continuing): {str(e)[:80]}...")

                print(f'   ✅ Batch {batch_num+1}/{total_batches}: Inserted {len(batch_records)} records')

            finally:
                # Clean up temp file
                import os
                try:
                    os.unlink(temp_file)
                except:
                    pass

        # Verify final count
        result = await pg._execute_query_async('SELECT COUNT(*) as cnt FROM transactions_enriched')
        final_count = result[0]['cnt']

        # Get fraud statistics
        result = await pg._execute_query_async("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN is_fraud_tx = 1 THEN 1 ELSE 0 END) as fraud_count,
                SUM(CASE WHEN model_score >= 0.70 THEN 1 ELSE 0 END) as high_risk_count,
                AVG(model_score) as avg_model_score,
                AVG(gmv) as avg_gmv,
                SUM(gmv) as total_gmv
            FROM transactions_enriched
        """)

        stats = result[0]

        print(f'\n' + '='*80)
        print('✅ Test Data Generation Complete')
        print('='*80)
        print(f'   Total records: {final_count:,}')
        print(f'   Fraudulent transactions: {stats["fraud_count"]:,} ({stats["fraud_count"]/final_count*100:.1f}%)')
        print(f'   High risk (score >= 0.70): {stats["high_risk_count"]:,} ({stats["high_risk_count"]/final_count*100:.1f}%)')
        print(f'   Average model score: {stats["avg_model_score"]:.3f}')
        print(f'   Average transaction amount: ${stats["avg_gmv"]:.2f}')
        print(f'   Total GMV: ${stats["total_gmv"]:,.2f}')
        print('='*80)

        return True


async def main():
    """Main execution function."""
    generator = FraudTestDataGenerator(num_records=5000)
    success = await generator.generate_and_insert()
    return success


if __name__ == '__main__':
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
