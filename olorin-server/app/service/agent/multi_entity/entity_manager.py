"""
Entity Manager

Comprehensive entity management system for multi-entity fraud investigations,
supporting complex entity relationships and cross-entity analysis.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid
from collections import defaultdict
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class EntityType(Enum):
    """Supported entity types for investigations"""
    
    # Core entities (from existing system)
    DEVICE = "device"
    LOCATION = "location" 
    NETWORK = "network"
    USER = "user"
    
    # Extended entities for multi-entity support
    ACCOUNT = "account"
    TRANSACTION = "transaction"
    SESSION = "session"
    BEHAVIOR_PATTERN = "behavior_pattern"
    IP = "ip"
    PHONE_NUMBER = "phone_number"
    EMAIL = "email"
    PAYMENT_METHOD = "payment_method"
    MERCHANT = "merchant"
    GEOLOCATION = "geolocation"
    BROWSER = "browser"
    APPLICATION = "application"
    API_KEY = "api_key"
    CERTIFICATE = "certificate"
    DOMAIN = "domain"
    URL = "url"
    FILE_HASH = "file_hash"
    BIOMETRIC = "biometric"
    
    # Behavioral entities
    LOGIN_PATTERN = "login_pattern"
    SPENDING_PATTERN = "spending_pattern"
    ACCESS_PATTERN = "access_pattern"
    COMMUNICATION_PATTERN = "communication_pattern"
    
    # Risk entities
    RISK_INDICATOR = "risk_indicator"
    ANOMALY = "anomaly"
    THREAT = "threat"
    VULNERABILITY = "vulnerability"
    
    # Meta entities
    INVESTIGATION = "investigation"
    CASE = "case"
    ALERT = "alert"
    RULE = "rule"
    
    # Transaction-specific entities (from CSV data - Phase 1 Enhancement)
    # Temporal entities  
    TIMESTAMP = "timestamp"
    RECORD_CREATED = "record_created"      # TABLE_RECORD_CREATED_AT
    RECORD_UPDATED = "record_updated"      # TABLE_RECORD_UPDATED_AT
    TX_DATETIME = "tx_datetime"            # TX_DATETIME
    TX_RECEIVED = "tx_received"            # TX_RECEIVED_DATETIME
    
    # Transaction identifiers
    ORIGINAL_TX_ID = "original_tx_id"      # ORIGINAL_TX_ID
    TX_ID_KEY = "tx_id_key"               # TX_ID_KEY
    SURROGATE_APP_TX_ID = "surrogate_app_tx_id"  # SURROGATE_APP_TX_ID
    NSURE_UNIQUE_TX_ID = "nsure_unique_tx_id"    # NSURE_UNIQUE_TX_ID
    CLIENT_REQUEST_ID = "client_request_id"       # CLIENT_REQUEST_ID
    
    # Business entities
    STORE_ID = "store_id"                  # STORE_ID
    APP_ID = "app_id"                      # APP_ID  
    EVENT_TYPE = "event_type"              # EVENT_TYPE
    AUTHORIZATION_STAGE = "authorization_stage"  # AUTHORIZATION_STAGE
    
    # User identity entities
    EMAIL_NORMALIZED = "email_normalized"  # EMAIL_NORMALIZED
    FIRST_NAME = "first_name"             # FIRST_NAME
    UNIQUE_USER_ID = "unique_user_id"     # UNIQUE_USER_ID
    
    # Processing status entities
    TX_UPLOADED_TO_SNOWFLAKE = "tx_uploaded_to_snowflake"  # TX_UPLOADED_TO_SNOWFLAKE
    IS_SENT_FOR_NSURE_REVIEW = "is_sent_for_nsure_review"  # IS_SENT_FOR_NSURE_REVIEW
    TX_TIMESTAMP_MS = "tx_timestamp_ms"  # TX_TIMESTAMP_MS - Millisecond precision transaction timestamp
    
    # Extended user identity entities
    LAST_NAME = "last_name"  # LAST_NAME
    PHONE_COUNTRY_CODE = "phone_country_code"  # PHONE_COUNTRY_CODE
    DATE_OF_BIRTH = "date_of_birth"  # DATE_OF_BIRTH
    PERSONAL_INFO_ADDITIONAL_DATA = "personal_info_additional_data"  # PERSONAL_INFO_ADDITIONAL_DATA
    CARD_HOLDER_NAME = "card_holder_name"  # CARD_HOLDER_NAME
    
    # Merchant and business entities
    MERCHANT_SEGMENT_ID = "merchant_segment_id"  # MERCHANT_SEGMENT_ID
    PROCESSOR = "processor"  # PROCESSOR
    PROCESSOR_MERCHANT_IDENTIFIER = "processor_merchant_identifier"  # PROCESSOR_MERCHANT_IDENTIFIER
    PRODUCT = "product"  # PRODUCT
    
    # Address and location entities
    BILLING_ADDRESS = "billing_address"  # BILLING_ADDRESS
    
    # Shopping cart entities
    CART = "cart"  # CART
    CART_ITEMS_TYPES = "cart_items_types"  # CART_ITEMS_TYPES
    CART_SKUS = "cart_skus"  # CART_SKUS
    CART_BRANDS = "cart_brands"  # CART_BRANDS
    CART_ITEMS_ARE_GIFTS = "cart_items_are_gifts"  # CART_ITEMS_ARE_GIFTS
    CART_ITEMS_FULFILLMENT = "cart_items_fulfillment"  # CART_ITEMS_FULFILLMENT
    
    # Financial entities
    CREDIT_USE = "credit_use"  # CREDIT_USE
    PAID_AMOUNT_CURRENCY = "paid_amount_currency"  # PAID_AMOUNT_CURRENCY
    PAID_AMOUNT_VALUE_IN_CURRENCY = "paid_amount_value_in_currency"  # PAID_AMOUNT_VALUE_IN_CURRENCY
    PROCESSING_FEE_CURRENCY = "processing_fee_currency"  # PROCESSING_FEE_CURRENCY
    PROCESSING_FEE_VALUE_IN_CURRENCY = "processing_fee_value_in_currency"  # PROCESSING_FEE_VALUE_IN_CURRENCY
    
    # Payment method entities (extended)
    BIN = "bin"  # BIN - Bank Identification Number
    LAST_FOUR = "last_four"  # LAST_FOUR - Last 4 digits of card
    PAYMENT_METHOD_TOKEN = "payment_method_token"  # PAYMENT_METHOD_TOKEN
    PAYMENT_METHOD_INTERNAL_IDENTIFIER = "payment_method_internal_identifier"  # PAYMENT_METHOD_INTERNAL_IDENTIFIER
    
    # Security and verification entities
    IS_THREE_D_SECURE_VERIFIED = "is_three_d_secure_verified"  # IS_THREE_D_SECURE_VERIFIED
    THREE_D_SECURE_RESULT = "three_d_secure_result"  # THREE_D_SECURE_RESULT
    IS_UNDER_THREE_D_SECURE = "is_under_three_d_secure"  # IS_UNDER_THREE_D_SECURE
    
    # Additional payment entities
    PAYPAL_EMAIL = "paypal_email"  # PAYPAL_EMAIL
    PAYMENT_METHOD_DETAILS_ADDITIONAL_DATA = "payment_method_details_additional_data"  # PAYMENT_METHOD_DETAILS_ADDITIONAL_DATA
    
    # User behavior and anonymity entities
    IS_ANONYMOUS = "is_anonymous"  # IS_ANONYMOUS
    FAILURE_REASON = "failure_reason"  # FAILURE_REASON
    TRANSACTION_DETAILS_ADDITIONAL_DATA = "transaction_details_additional_data"  # TRANSACTION_DETAILS_ADDITIONAL_DATA
    
    # Device and session entities (extended)
    DEVICE_ID = "device_id"  # DEVICE_ID - Already exists but ensuring coverage
    USER_AGENT = "user_agent"  # USER_AGENT
    SESSION_INFO_LANGUAGE = "session_info_language"  # SESSION_INFO_LANGUAGE
    SESSION_INFO_ADDITIONAL_DATA = "session_info_additional_data"  # SESSION_INFO_ADDITIONAL_DATA
    
    # Recipient and gifting entities
    FIRST_RECIPIENT_INFO = "first_recipient_info"  # FIRST_RECIPIENT_INFO
    FIRST_RECIPIENT_EMAIL = "first_recipient_email"  # FIRST_RECIPIENT_EMAIL
    FIRST_RECIPIENT_PHONE = "first_recipient_phone"  # FIRST_RECIPIENT_PHONE
    ALL_RECIPIENT_INFO = "all_recipient_info"  # ALL_RECIPIENT_INFO
    ALL_RECIPIENT_EMAILS = "all_recipient_emails"  # ALL_RECIPIENT_EMAILS
    ALL_RECIPIENT_EMAILS_NORMALIZED = "all_recipient_emails_normalized"  # ALL_RECIPIENT_EMAILS_NORMALIZED
    IS_GIFTING = "is_gifting"  # IS_GIFTING
    
    # Delivery and fulfillment entities (extended)
    CART_DELIVERY_METHODS = "cart_delivery_methods"  # CART_DELIVERY_METHODS
    IS_DELIVERY_METHOD_EMAIL_ONLY = "is_delivery_method_email_only"  # IS_DELIVERY_METHOD_EMAIL_ONLY
    IS_DELIVERY_METHOD_CONTAINING_ON_SCREEN = "is_delivery_method_containing_on_screen"  # IS_DELIVERY_METHOD_CONTAINING_ON_SCREEN
    
    # Partner and risk entities
    PARTNER_ID = "partner_id"  # PARTNER_ID
    RISK_MODE = "risk_mode"  # RISK_MODE
    TX_ADDITIONAL_DATA = "tx_additional_data"  # TX_ADDITIONAL_DATA
    
    # Calculated properties entities
    CALCULATED_PROPS_ID = "calculated_props_id"  # CALCULATED_PROPS_ID
    CALCULATED_PROPS_CREATED_DATETIME = "calculated_props_created_datetime"  # CALCULATED_PROPS_CREATED_DATETIME
    CALCULATED_PROPS_UPLOADED_TO_SNOWFLAKE = "calculated_props_uploaded_to_snowflake"  # CALCULATED_PROPS_UPLOADED_TO_SNOWFLAKE
    
    # Financial metrics entities
    CART_USD = "cart_usd"  # CART_USD
    GMV = "paid_amount_value"  # PAID_AMOUNT_VALUE_IN_CURRENCY - Gross Merchandise Value
    
    # Email verification entities
    IS_EMAIL_VERIFIED_BY_THIRD_PARTY = "is_email_verified_by_third_party"  # IS_EMAIL_VERIFIED_BY_THIRD_PARTY
    IS_RECIPIENT_EMAIL_VERIFIED_BY_THIRD_PARTY = "is_recipient_email_verified_by_third_party"  # IS_RECIPIENT_EMAIL_VERIFIED_BY_THIRD_PARTY
    EMAIL_FIRST_SEEN = "email_first_seen"  # EMAIL_FIRST_SEEN
    PAYPAL_EMAIL_FIRST_SEEN = "paypal_email_first_seen"  # PAYPAL_EMAIL_FIRST_SEEN
    RECIPIENT_EMAIL_FIRST_SEEN = "recipient_email_first_seen"  # RECIPIENT_EMAIL_FIRST_SEEN
    EMAIL_DATA_THIRD_PARTY_RISK_SCORE = "email_data_third_party_risk_score"  # EMAIL_DATA_THIRD_PARTY_RISK_SCORE
    
    # Network and location entities (extended)
    IP_COUNTRY = "ip_country"  # IP_COUNTRY
    IS_DEVICE_ID_AUTHENTICATED = "is_device_id_authenticated"  # IS_DEVICE_ID_AUTHENTICATED
    IS_PAYPAL_ADDRESS_CONFIRMED = "is_paypal_address_confirmed"  # IS_PAYPAL_ADDRESS_CONFIRMED
    
    # Third-party data entities
    PIPL_INFO_AGE = "pipl_info_age"  # PIPL_INFO_AGE
    PIPL_INFO_PERSON = "pipl_info_person"  # PIPL_INFO_PERSON
    IS_PROCESSOR_REPORTED_STOLEN_CARD = "is_processor_reported_stolen_card"  # IS_PROCESSOR_REPORTED_STOLEN_CARD
    IS_PROCESSOR_REJECTED_DUE_TO_FRAUD = "is_processor_rejected_due_to_fraud"  # IS_PROCESSOR_REJECTED_DUE_TO_FRAUD
    IP_ADDRESS_INFO = "ip_address_info"  # IP_ADDRESS_INFO
    ISP = "isp"  # ISP - Internet Service Provider
    ISP_ARRAY = "isp_array"  # ISP_ARRAY
    ASN = "asn"  # ASN - Structured System Number
    
    # Time-based analysis entities
    DAYS_FROM_FIRST_EMAIL_SEEN_TO_TX = "days_from_first_email_seen_to_tx"  # DAYS_FROM_FIRST_EMAIL_SEEN_TO_TX
    DAYS_FROM_FIRST_PAYPAL_EMAIL_SEEN_TO_TX = "days_from_first_paypal_email_seen_to_tx"  # DAYS_FROM_FIRST_PAYPAL_EMAIL_SEEN_TO_TX
    DAYS_FROM_FIRST_RECIPIENT_EMAIL_SEEN_TO_TX = "days_from_first_recipient_email_seen_to_tx"  # DAYS_FROM_FIRST_RECIPIENT_EMAIL_SEEN_TO_TX
    
    # Merchant and partner entities (extended)
    MERCHANT_NAME = "merchant_name"  # MERCHANT_NAME
    PARTNER_NAME = "partner_name"  # PARTNER_NAME
    
    # NSure decision entities
    NSURE_DECISIONS = "nsure_decisions"  # NSURE_DECISIONS
    COUNT_NSURE_DECISIONS = "count_nsure_decisions"  # COUNT_NSURE_DECISIONS
    NSURE_FIRST_DECISION = "nsure_first_decision"  # NSURE_FIRST_DECISION
    NSURE_FIRST_DECISION_DATETIME = "nsure_first_decision_datetime"  # NSURE_FIRST_DECISION_DATETIME
    NSURE_LAST_DECISION = "nsure_last_decision"  # NSURE_LAST_DECISION
    NSURE_LAST_DECISION_DATETIME = "nsure_last_decision_datetime"  # NSURE_LAST_DECISION_DATETIME
    NSURE_LAST_DECISION_UPLOADED_TO_SNOWFLAKE = "nsure_last_decision_uploaded_to_snowflake"  # NSURE_LAST_DECISION_UPLOADED_TO_SNOWFLAKE
    IS_REASSESSED_TX = "is_reassessed_tx"  # IS_REASSESSED_TX
    
    # Rule and policy entities
    TRIGGERED_RULES = "fraud_rules_triggered"  # TRIGGERED_RULES
    COUNT_TRIGGERED_RULES = "count_fraud_rules_triggered"  # COUNT_TRIGGERED_RULES
    RULE_DECISION = "rule_decision"  # RULE_DECISION
    RULE_DESCRIPTION = "rule_description"  # RULE_DESCRIPTION
    IS_RULE_PARTICIPATING_IN_LFS_PO = "is_rule_participating_in_lfs_po"  # IS_RULE_PARTICIPATING_IN_LFS_PO
    TRIGGERED_LFS_RULES = "triggered_lfs_rules"  # TRIGGERED_LFS_RULES
    
    # Model and scoring entities
    MODEL_DECISION = "model_decision"  # MODEL_DECISION
    MODEL_SCORE = "model_score"  # MODEL_SCORE
    MODEL_VERSION = "model_version"  # MODEL_VERSION
    MODEL_APPROVAL_THRESHOLD = "model_approval_threshold"  # MODEL_APPROVAL_THRESHOLD
    MODEL_SOFT_APPROVAL_THRESHOLD = "model_soft_approval_threshold"  # MODEL_SOFT_APPROVAL_THRESHOLD
    
    # Rejection and reason entities
    REJECTION_REASON = "rejection_reason"  # REJECTION_REASON
    NOT_REVIEWED_REASON = "not_reviewed_reason"  # NOT_REVIEWED_REASON
    SIMULATED_DECISION = "simulated_decision"  # SIMULATED_DECISION
    SIMULATED_SEGMENT_ID = "simulated_segment_id"  # SIMULATED_SEGMENT_ID
    NSURE_SEGMENT_ID = "nsure_segment_id"  # NSURE_SEGMENT_ID
    ADDITIONAL_SEGMENTS = "additional_segments"  # ADDITIONAL_SEGMENTS
    
    # Merchant decision entities
    MERCHANT_LAST_DECISION_UPLOADED_TO_SNOWFLAKE = "merchant_last_decision_uploaded_to_snowflake"  # MERCHANT_LAST_DECISION_UPLOADED_TO_SNOWFLAKE
    MERCHANT_DECISIONS = "merchant_decisions"  # MERCHANT_DECISIONS
    COUNT_MERCHANT_DECISIONS = "count_merchant_decisions"  # COUNT_MERCHANT_DECISIONS
    MERCHANT_LAST_DECISION = "merchant_last_decision"  # MERCHANT_LAST_DECISION
    MERCHANT_LAST_DECISION_DATETIME = "merchant_last_decision_datetime"  # MERCHANT_LAST_DECISION_DATETIME
    
    # Transaction status entities
    IS_FAILED_TX = "is_failed_tx"  # IS_FAILED_TX
    IS_REVIEWED = "is_reviewed"  # IS_REVIEWED
    RAW_PROCESSOR_RESPONSE = "raw_processor_response"  # RAW_PROCESSOR_RESPONSE
    RAW_PROCESSOR_RESPONSE_SOURCE = "raw_processor_response_source"  # RAW_PROCESSOR_RESPONSE_SOURCE
    RAW_PROCESSOR_REQUEST = "raw_processor_request"  # RAW_PROCESSOR_REQUEST
    RAW_PROCESSOR_REQUEST_SOURCE = "raw_processor_request_source"  # RAW_PROCESSOR_REQUEST_SOURCE
    IS_UNDER_NSURE_LIABILITY = "is_under_nsure_liability"  # IS_UNDER_NSURE_LIABILITY
    IS_SOFT_APPROVED = "is_soft_approved"  # IS_SOFT_APPROVED
    
    # App and device lifecycle entities
    APP_INSTALL_DATETIME = "app_install_datetime"  # APP_INSTALL_DATETIME
    DEVICE_TYPE = "device_type"  # DEVICE_TYPE
    DEVICE_MODEL = "device_model"  # DEVICE_MODEL
    DEVICE_OS_VERSION = "device_os_version"  # DEVICE_OS_VERSION
    DEVICE_APP_INSTALL_SDK_VERSION = "device_app_install_sdk_version"  # DEVICE_APP_INSTALL_SDK_VERSION
    FIPP_VISITOR_ID = "fipp_visitor_id"  # FIPP_VISITOR_ID
    FIPP_IS_INCOGNITO = "fipp_is_incognito"  # FIPP_IS_INCOGNITO
    DAYS_FROM_FIRST_APP_INSTALL_TO_TX = "days_from_first_app_install_to_tx"  # DAYS_FROM_FIRST_APP_INSTALL_TO_TX
    
    # Card and payment instrument entities (extended)
    CARD_BRAND = "card_brand"  # CARD_BRAND
    CARD_CATEGORY = "card_category"  # CARD_CATEGORY
    CARD_TYPE = "card_type"  # CARD_TYPE
    IS_CARD_COMMERCIAL = "is_card_commercial"  # IS_CARD_COMMERCIAL
    IS_CARD_PREPAID = "is_card_prepaid"  # IS_CARD_PREPAID
    CARD_ISSUER = "card_issuer"  # CARD_ISSUER
    BIN_COUNTRY_CODE = "bin_country_code"  # BIN_COUNTRY_CODE
    CARD_ISSUER_NORMALIZED = "card_issuer_normalized"  # CARD_ISSUER_NORMALIZED
    BIN_ADDITIONAL_DATA = "bin_additional_data"  # BIN_ADDITIONAL_DATA
    BIN_CREATED_TIME = "bin_created_time"  # BIN_CREATED_TIME
    BIN_UPLOADED_TO_SNOWFLAKE = "bin_uploaded_to_snowflake"  # BIN_UPLOADED_TO_SNOWFLAKE
    
    # HLR (Home Location Register) entities
    HLR_PHONE_COUNTRY_CODE = "hlr_phone_country_code"  # HLR_PHONE_COUNTRY_CODE
    HLR_IS_VALID = "hlr_is_valid"  # HLR_IS_VALID
    HLR_NUMBER_VALID = "hlr_number_valid"  # HLR_NUMBER_VALID
    HLR_IS_MOBILE = "hlr_is_mobile"  # HLR_IS_MOBILE
    HLR_IS_PORTED = "hlr_is_ported"  # HLR_IS_PORTED
    HLR_IS_ROAMING = "hlr_is_roaming"  # HLR_IS_ROAMING
    HLR_NUMBER_TYPE = "hlr_number_type"  # HLR_NUMBER_TYPE
    HLR_ORIGIN_NETWORK = "hlr_origin_network"  # HLR_ORIGIN_NETWORK
    HLR_STATUS = "hlr_status"  # HLR_STATUS
    HLR_CURRENT_NETWORK = "hlr_current_network"  # HLR_CURRENT_NETWORK
    HLR_PORTED_NETWORK = "hlr_ported_network"  # HLR_PORTED_NETWORK
    HLR_ADDITIONAL_DATA = "hlr_additional_data"  # HLR_ADDITIONAL_DATA
    HLR_CREATED_TIME = "hlr_created_time"  # HLR_CREATED_TIME
    HLR_UPLOADED_TO_SNOWFLAKE = "hlr_uploaded_to_snowflake"  # HLR_UPLOADED_TO_SNOWFLAKE
    
    # MaxMind risk scoring entities
    MAXMIND_IP_RISK_SCORE = "maxmind_ip_risk_score"  # MAXMIND_IP_RISK_SCORE
    MAXMIND_RISK_SCORE = "maxmind_risk_score"  # MAXMIND_RISK_SCORE
    MAXMIND_CREATED_TIME = "maxmind_created_time"  # MAXMIND_CREATED_TIME
    MAXMIND_UPLOADED_TO_SNOWFLAKE = "maxmind_uploaded_to_snowflake"  # MAXMIND_UPLOADED_TO_SNOWFLAKE
    
    # Email validation entities (SMTPV)
    BUYER_EMAIL_SMTPV_RESPONSE = "buyer_email_smtpv_response"  # BUYER_EMAIL_SMTPV_RESPONSE
    SMTPV_BUYER_EMAIL_CREATED_TIME = "smtpv_buyer_email_created_time"  # SMTPV_BUYER_EMAIL_CREATED_TIME
    SMTPV_BUYER_EMAIL_UPLOADED_TO_SNOWFLAKE = "smtpv_buyer_email_uploaded_to_snowflake"  # SMTPV_BUYER_EMAIL_UPLOADED_TO_SNOWFLAKE
    EMAIL_VALIDATION_CREATED = "email_validation_created"  # EMAIL_VALIDATION_CREATED
    EMAIL_VALIDATION_UPLOADED_TO_SNOWFLAKE = "email_validation_uploaded_to_snowflake"  # EMAIL_VALIDATION_UPLOADED_TO_SNOWFLAKE
    IS_DISPOSABLE_EMAIL = "is_disposable_email"  # IS_DISPOSABLE_EMAIL
    IS_FREEMAIL = "is_freemail"  # IS_FREEMAIL
    IS_PERSONAL_EMAIL = "is_personal_email"  # IS_PERSONAL_EMAIL
    IS_VALID_EMAIL = "is_valid_email"  # IS_VALID_EMAIL
    EMAIL_VALIDATION_ADDITIONAL_DATA = "email_validation_additional_data"  # EMAIL_VALIDATION_ADDITIONAL_DATA
    
    # Recipient email validation entities
    RECIPIENT_EMAIL_VALIDATION_CREATED = "recipient_email_validation_created"  # RECIPIENT_EMAIL_VALIDATION_CREATED
    RECIPIENT_EMAIL_VALIDATION_UPLOADED_TO_SNOWFLAKE = "recipient_email_validation_uploaded_to_snowflake"  # RECIPIENT_EMAIL_VALIDATION_UPLOADED_TO_SNOWFLAKE
    IS_RECIPIENT_EMAIL_DISPOSABLE = "is_recipient_email_disposable"  # IS_RECIPIENT_EMAIL_DISPOSABLE
    IS_RECIPIENT_EMAIL_FREEMAIL = "is_recipient_email_freemail"  # IS_RECIPIENT_EMAIL_FREEMAIL
    IS_RECIPIENT_EMAIL_PERSONAL = "is_recipient_email_personal"  # IS_RECIPIENT_EMAIL_PERSONAL
    IS_RECIPIENT_EMAIL_VALID = "is_recipient_email_valid"  # IS_RECIPIENT_EMAIL_VALID
    RECIPIENT_EMAIL_VALIDATION_ADDITIONAL_DATA = "recipient_email_validation_additional_data"  # RECIPIENT_EMAIL_VALIDATION_ADDITIONAL_DATA
    
    # Disputes and chargebacks entities
    DISPUTES = "disputes"  # DISPUTES
    COUNT_DISPUTES = "count_disputes"  # COUNT_DISPUTES
    FIRST_DISPUTE_DATETIME = "first_dispute_datetime"  # FIRST_DISPUTE_DATETIME
    LAST_DISPUTE_DATETIME = "last_dispute_datetime"  # LAST_DISPUTE_DATETIME
    LAST_DISPUTE_UPLOADED_TO_SNOWFLAKE = "last_dispute_uploaded_to_snowflake"  # LAST_DISPUTE_UPLOADED_TO_SNOWFLAKE
    LAST_DISPUTE_AMOUNT = "last_dispute_amount"  # LAST_DISPUTE_AMOUNT
    LAST_DISPUTE_STATUS = "last_dispute_status"  # LAST_DISPUTE_STATUS
    LAST_DISPUTE_DECISION = "last_dispute_decision"  # LAST_DISPUTE_DECISION
    IS_LAST_DISPUTE_FRAUD_RELATED_REASON = "is_last_dispute_fraud_related_reason"  # IS_LAST_DISPUTE_FRAUD_RELATED_REASON
    LAST_DISPUTE_REASON = "last_dispute_reason"  # LAST_DISPUTE_REASON
    LAST_DISPUTE_SOURCE = "last_dispute_source"  # LAST_DISPUTE_SOURCE
    FIRST_NON_FRAUD_DISPUTE_DATETIME = "first_non_fraud_dispute_datetime"  # FIRST_NON_FRAUD_DISPUTE_DATETIME
    
    # Fraud alerts entities
    FRAUD_ALERTS = "fraud_alerts"  # FRAUD_ALERTS
    COUNT_FRAUD_ALERTS = "count_fraud_alerts"  # COUNT_FRAUD_ALERTS
    FIRST_FRAUD_ALERT_DATETIME = "first_fraud_alert_datetime"  # FIRST_FRAUD_ALERT_DATETIME
    LAST_FRAUD_ALERT_DATETIME = "last_fraud_alert_datetime"  # LAST_FRAUD_ALERT_DATETIME
    LAST_FRAUD_ALERT_UPLOADED_TO_SNOWFLAKE = "last_fraud_alert_uploaded_to_snowflake"  # LAST_FRAUD_ALERT_UPLOADED_TO_SNOWFLAKE
    
    # Refund entities
    NSURE_INITIATED_REFUND_DATETIME = "nsure_initiated_refund_datetime"  # NSURE_INITIATED_REFUND_DATETIME
    LAST_NSURE_INITIATED_REFUND_UPLOADED_TO_SNOWFLAKE = "last_nsure_initiated_refund_uploaded_to_snowflake"  # LAST_NSURE_INITIATED_REFUND_UPLOADED_TO_SNOWFLAKE
    TX_REFUND_REASON = "tx_refund_reason"  # TX_REFUND_REASON
    TX_REFUND_DATETIME = "tx_refund_datetime"  # TX_REFUND_DATETIME
    TX_REFUND_UPLOADED_TO_SNOWFLAKE = "tx_refund_uploaded_to_snowflake"  # TX_REFUND_UPLOADED_TO_SNOWFLAKE
    
    # MaxMind MinFraud entities
    LAST_MAXMIND_MIN_FRAUD_ALERT_DATETIME = "last_maxmind_min_fraud_alert_datetime"  # LAST_MAXMIND_MIN_FRAUD_ALERT_DATETIME
    LAST_MAXMIND_MIN_FRAUD_ALERT_UPLOADED_TO_SNOWFLAKE = "last_maxmind_min_fraud_alert_uploaded_to_snowflake"  # LAST_MAXMIND_MIN_FRAUD_ALERT_UPLOADED_TO_SNOWFLAKE
    LAST_MAXMIND_MIN_FRAUD_ALERT_NEW_RISK_SCORE = "last_maxmind_min_fraud_alert_new_risk_score"  # LAST_MAXMIND_MIN_FRAUD_ALERT_NEW_RISK_SCORE
    LAST_MAXMIND_MIN_FRAUD_ALERT_REASON_CODE = "last_maxmind_min_fraud_alert_reason_code"  # LAST_MAXMIND_MIN_FRAUD_ALERT_REASON_CODE
    MAXMIND_MIN_FRAUD_ALERTS = "maxmind_min_fraud_alerts"  # MAXMIND_MIN_FRAUD_ALERTS
    COUNT_MAXMIND_MIN_FRAUD_ALERTS = "count_maxmind_min_fraud_alerts"  # COUNT_MAXMIND_MIN_FRAUD_ALERTS
    
    # Retry transaction entities
    BUYER_RETRY_TX_ID = "buyer_retry_tx_id"  # BUYER_RETRY_TX_ID
    NSURE_RETRY_TX_ID = "nsure_retry_tx_id"  # NSURE_RETRY_TX_ID
    LAST_RETRY_UPLOADED_TO_SNOWFLAKE = "last_retry_uploaded_to_snowflake"  # LAST_RETRY_UPLOADED_TO_SNOWFLAKE
    
    # User lifecycle entities
    FIRST_NSURE_TX_ATTEMPT_DATETIME = "first_nsure_tx_attempt_datetime"  # FIRST_NSURE_TX_ATTEMPT_DATETIME
    FIRST_USER_TX_EVENT_DATETIME = "first_user_tx_event_datetime"  # FIRST_USER_TX_EVENT_DATETIME
    IS_USER_FIRST_TX_EVENT = "is_user_first_tx_event"  # IS_USER_FIRST_TX_EVENT
    FIRST_USER_ACCOUNT_ACTIVITY_DATE = "first_user_account_activity_date"  # FIRST_USER_ACCOUNT_ACTIVITY_DATE
    FIRST_SIGN_IN_IDENTITY_PROVIDER = "first_sign_in_identity_provider"  # FIRST_SIGN_IN_IDENTITY_PROVIDER
    
    # KYC (Know Your Customer) entities
    FIRST_USER_FAILED_KYC_DATETIME = "first_user_failed_kyc_datetime"  # FIRST_USER_FAILED_KYC_DATETIME
    FIRST_USER_SUCCESSFULLY_FULFILLED_KYC_DATETIME = "first_user_successfully_fulfilled_kyc_datetime"  # FIRST_USER_SUCCESSFULLY_FULFILLED_KYC_DATETIME
    FIRST_USER_TRIGGERED_KYC_DATETIME = "first_user_triggered_kyc_datetime"  # FIRST_USER_TRIGGERED_KYC_DATETIME
    
    # Model manager entities
    MODEL_MANAGER_TX_FEATURES_UPLOADED_TO_SNOWFLAKE = "model_manager_tx_features_uploaded_to_snowflake"  # MODEL_MANAGER_TX_FEATURES_UPLOADED_TO_SNOWFLAKE
    
    # First occurrence entities
    FIRST_MERCHANT_ACCEPTED_DATETIME = "first_merchant_accepted_datetime"  # FIRST_MERCHANT_ACCEPTED_DATETIME
    FIRST_PAYMENT_METHOD_ATTEMPT_DATETIME = "first_payment_method_attempt_datetime"  # FIRST_PAYMENT_METHOD_ATTEMPT_DATETIME
    FIRST_TX_ATTEMPT_DATETIME = "first_tx_attempt_datetime"  # FIRST_TX_ATTEMPT_DATETIME
    DAYS_FROM_FIRST_TX_ATTEMPT_TO_TX = "days_from_first_tx_attempt_to_tx"  # DAYS_FROM_FIRST_TX_ATTEMPT_TO_TX
    DAYS_FROM_FIRST_USER_ACCOUNT_ACTIVITY_DATE_TO_TX = "days_from_first_user_account_activity_date_to_tx"  # DAYS_FROM_FIRST_USER_ACCOUNT_ACTIVITY_DATE_TO_TX
    
    # Fraud status entities
    FIRST_FRAUD_STATUS_DATETIME = "first_fraud_status_datetime"  # FIRST_FRAUD_STATUS_DATETIME
    IS_FRAUD_TX = "is_fraud_tx"  # IS_FRAUD_TX
    IS_DISPUTED_NON_FRAUD_TX = "is_disputed_non_fraud_tx"  # IS_DISPUTED_NON_FRAUD_TX
    PAYMENT_METHOD_COUNTRY_CODE = "payment_method_country_code"  # PAYMENT_METHOD_COUNTRY_CODE
    DAYS_FROM_FIRST_MERCHANT_ACCEPTANCE_TO_TX = "days_from_first_merchant_acceptance_to_tx"  # DAYS_FROM_FIRST_MERCHANT_ACCEPTANCE_TO_TX
    DAYS_FROM_FIRST_PAYMENT_METHOD_ATTEMPT_TO_TX = "days_from_first_payment_method_attempt_to_tx"  # DAYS_FROM_FIRST_PAYMENT_METHOD_ATTEMPT_TO_TX
    
    # Distance and similarity entities
    LOCAL_PART_TO_NAME_DISTANCE = "local_part_to_name_distance"  # LOCAL_PART_TO_NAME_DISTANCE
    BUYER_NAME_TO_PIPL_NAME_DISTANCE = "buyer_name_to_pipl_name_distance"  # BUYER_NAME_TO_PIPL_NAME_DISTANCE
    PAYPAL_LOCAL_PART_TO_NAME_DISTANCE = "paypal_local_part_to_name_distance"  # PAYPAL_LOCAL_PART_TO_NAME_DISTANCE
    PERSONAL_INFO_EMAIL_TO_RECIPIENT_EMAIL_LOCAL_PARTS_DISTANCE = "personal_info_email_to_recipient_email_local_parts_distance"  # PERSONAL_INFO_EMAIL_TO_RECIPIENT_EMAIL_LOCAL_PARTS_DISTANCE
    
    # Group analysis entities
    GROUP_NEW_BUYERS_GMV_IN_LAST_DAY = "group_new_buyers_gmv_in_last_day"  # GROUP_NEW_BUYERS_GMV_IN_LAST_DAY
    GROUP_NEW_PAYMENT_METHODS_GMV_IN_LAST_DAY = "group_new_payment_methods_gmv_in_last_day"  # GROUP_NEW_PAYMENT_METHODS_GMV_IN_LAST_DAY
    GROUP_NEW_BUYERS_TXS_IN_LAST_DAY = "group_new_buyers_txs_in_last_day"  # GROUP_NEW_BUYERS_TXS_IN_LAST_DAY
    GROUP_NEW_PAYMENT_METHODS_TXS_IN_LAST_DAY = "group_new_payment_methods_txs_in_last_day"  # GROUP_NEW_PAYMENT_METHODS_TXS_IN_LAST_DAY
    GROUP_MAX_MAXMIND_RISK_SCORE = "group_max_maxmind_risk_score"  # GROUP_MAX_MAXMIND_RISK_SCORE
    GROUP_TX_FAILURE_COUNT = "group_tx_failure_count"  # GROUP_TX_FAILURE_COUNT
    GROUP_TX_FAILURE_GMV = "group_tx_failure_gmv"  # GROUP_TX_FAILURE_GMV
    
    # Payment method analysis entities
    PM_ACCEPTED_TXS_COUNT = "pm_accepted_txs_count"  # PM_ACCEPTED_TXS_COUNT
    USER_GRAPH_SIZE = "user_graph_size"  # USER_GRAPH_SIZE
    BIN_RISKY_GMV = "bin_risky_gmv"  # BIN_RISKY_GMV
    BUYER_AGE = "buyer_age"  # BUYER_AGE
    DAYS_FROM_VISITOR_ID_AGE = "days_from_visitor_id_age"  # DAYS_FROM_VISITOR_ID_AGE
    
    # Model feature entities
    IS_RECURRING_USER = "is_recurring_user"  # IS_RECURRING_USER
    IS_NEW_BUYER__MODEL_FEATURE = "is_new_buyer__model_feature"  # IS_NEW_BUYER__MODEL_FEATURE
    IS_NEW_PAYMENT_METHOD__MODEL_FEATURE = "is_new_payment_method__model_feature"  # IS_NEW_PAYMENT_METHOD__MODEL_FEATURE
    IS_FREE_MAIL__MODEL_FEATURE = "is_free_mail__model_feature"  # IS_FREE_MAIL__MODEL_FEATURE
    IS_EMAIL_VERIFIED__MODEL_FEATURE = "is_email_verified__model_feature"  # IS_EMAIL_VERIFIED__MODEL_FEATURE
    ISSUER_RISKY_GMV__MODEL_FEATURE = "issuer_risky_gmv__model_feature"  # ISSUER_RISKY_GMV__MODEL_FEATURE
    PM_COUNTRY_RISKY_GMV__MODEL_FEATURE = "pm_country_risky_gmv__model_feature"  # PM_COUNTRY_RISKY_GMV__MODEL_FEATURE
    SEASONALITY_ATTUNED_BIN_RISKY_GMV__MODEL_FEATURE = "seasonality_attuned_bin_risky_gmv__model_feature"  # SEASONALITY_ATTUNED_BIN_RISKY_GMV__MODEL_FEATURE
    
    # Cart analysis entities
    CART_WITHOUT_FEE_ITEMS = "cart_without_fee_items"  # CART_WITHOUT_FEE_ITEMS
    IS_DIGITAL = "is_digital"  # IS_DIGITAL
    IS_SUSPICIOUS_AMOUNT = "is_suspicious_amount"  # IS_SUSPICIOUS_AMOUNT
    DAYS_FROM_STORE_FIRST_TX__MODEL_FEATURE = "days_from_store_first_tx__model_feature"  # DAYS_FROM_STORE_FIRST_TX__MODEL_FEATURE
    DAYS_FROM_STORE_CREATION__MODEL_FEATURE = "days_from_store_creation__model_feature"  # DAYS_FROM_STORE_CREATION__MODEL_FEATURE
    
    # Address verification entities
    AVS = "avs"  # AVS - Address Verification Service
    PARSED_USER_AGENT = "parsed_user_agent"  # PARSED_USER_AGENT
    PROD_RECIPIENT_INFO = "prod_recipient_info"  # PROD_RECIPIENT_INFO
    
    # KYC detailed entities
    FIRST_USER_COMPLETED_KYC_RESULT = "first_user_completed_kyc_result"  # FIRST_USER_COMPLETED_KYC_RESULT
    FIRST_USER_COMPLETED_KYC_TYPE = "first_user_completed_kyc_type"  # FIRST_USER_COMPLETED_KYC_TYPE
    FIRST_USER_COMPLETED_KYC_PROVIDER = "first_user_completed_kyc_provider"  # FIRST_USER_COMPLETED_KYC_PROVIDER
    FIRST_USER_COMPLETED_NUM_OF_KYC_ATTEMPTS = "first_user_completed_num_of_kyc_attempts"  # FIRST_USER_COMPLETED_NUM_OF_KYC_ATTEMPTS
    FIRST_USER_COMPLETED_KYC_CREATE_DATE = "first_user_completed_kyc_create_date"  # FIRST_USER_COMPLETED_KYC_CREATE_DATE
    FIRST_USER_COMPLETED_KYC_REVIEW_ANSWER_OR_STATUS = "first_user_completed_kyc_review_answer_or_status"  # FIRST_USER_COMPLETED_KYC_REVIEW_ANSWER_OR_STATUS
    FIRST_USER_COMPLETED_KYC_LEVEL_NAME = "first_user_completed_kyc_level_name"  # FIRST_USER_COMPLETED_KYC_LEVEL_NAME
    FIRST_USER_COMPLETED_KYC_DOCUMENT_TYPE = "first_user_completed_kyc_document_type"  # FIRST_USER_COMPLETED_KYC_DOCUMENT_TYPE
    FIRST_USER_COMPLETED_KYC_FIRST_NAME = "first_user_completed_kyc_first_name"  # FIRST_USER_COMPLETED_KYC_FIRST_NAME
    FIRST_USER_COMPLETED_KYC_LAST_NAME = "first_user_completed_kyc_last_name"  # FIRST_USER_COMPLETED_KYC_LAST_NAME
    FIRST_USER_COMPLETED_KYC_ADDRESS_COUNTRY_USER_INPUT = "first_user_completed_kyc_address_country_user_input"  # FIRST_USER_COMPLETED_KYC_ADDRESS_COUNTRY_USER_INPUT
    FIRST_USER_COMPLETED_KYC_STATE_USER_INPUT = "first_user_completed_kyc_state_user_input"  # FIRST_USER_COMPLETED_KYC_STATE_USER_INPUT
    FIRST_USER_COMPLETED_KYC_TOWN_USER_INPUT = "first_user_completed_kyc_town_user_input"  # FIRST_USER_COMPLETED_KYC_TOWN_USER_INPUT
    FIRST_USER_COMPLETED_KYC_POST_CODE_USER_INPUT = "first_user_completed_kyc_post_code_user_input"  # FIRST_USER_COMPLETED_KYC_POST_CODE_USER_INPUT
    FIRST_USER_COMPLETED_KYC_ID_POST_CODE_FROM_DOCS_ARRAY = "first_user_completed_kyc_id_post_code_from_docs_array"  # FIRST_USER_COMPLETED_KYC_ID_POST_CODE_FROM_DOCS_ARRAY
    FIRST_USER_COMPLETED_KYC_ID_COUNTRY_OF_BIRTH = "first_user_completed_kyc_id_country_of_birth"  # FIRST_USER_COMPLETED_KYC_ID_COUNTRY_OF_BIRTH
    FIRST_USER_COMPLETED_KYC_ID_ISSUING_COUNTRY_FROM_DOCS_ARRAY = "first_user_completed_kyc_id_issuing_country_from_docs_array"  # FIRST_USER_COMPLETED_KYC_ID_ISSUING_COUNTRY_FROM_DOCS_ARRAY
    
    # Additional compliance entities
    CUSTODIAL_TYPE = "custodial_type"  # CUSTODIAL_TYPE
    SOFT_APPROVAL_POPULATIONS_LIST = "soft_approval_populations_list"  # SOFT_APPROVAL_POPULATIONS_LIST
    IS_SOFT_APPROVAL_CANDIDATE = "is_soft_approval_candidate"  # IS_SOFT_APPROVAL_CANDIDATE
    IS_ROUTER_DEVICE_ID_AUTHENTICATED = "is_router_device_id_authenticated"  # IS_ROUTER_DEVICE_ID_AUTHENTICATED
    REASSESSMENT_REJECTION_REASON = "reassessment_rejection_reason"  # REASSESSMENT_REJECTION_REASON
    MILLISECONDS_FROM_SOFT_APPROVED_TO_REASSESSMENT_RESPONSE = "milliseconds_from_soft_approved_to_reassessment_response"  # MILLISECONDS_FROM_SOFT_APPROVED_TO_REASSESSMENT_RESPONSE
    
    # Dispute detail entities
    LAST_DISPUTE_SELLER_BUYER_CHAT = "last_dispute_seller_buyer_chat"  # LAST_DISPUTE_SELLER_BUYER_CHAT
    LAST_DISPUTED_ITEM_BUYER_NOTES = "last_disputed_item_buyer_notes"  # LAST_DISPUTED_ITEM_BUYER_NOTES
    BUYER_EMAIL_DOMAIN = "buyer_email_domain"  # BUYER_EMAIL_DOMAIN
    REFUSAL_REASON = "refusal_reason"  # REFUSAL_REASON
    ENRICHED_TXS_UPLOADED_TO_SNOWFLAKE = "enriched_txs_uploaded_to_snowflake"  # ENRICHED_TXS_UPLOADED_TO_SNOWFLAKE
    PRODUCT_TYPE = "product_type"  # PRODUCT_TYPE
    FIRST_USER_SUCCESSFULLY_FULFILLED_KYC_DATE_OF_BIRTH = "first_user_successfully_fulfilled_kyc_date_of_birth"  # FIRST_USER_SUCCESSFULLY_FULFILLED_KYC_DATE_OF_BIRTH
    KYC_USER_AGE = "kyc_user_age"  # KYC_USER_AGE
    STORE_FIRST_TX_TIMESTAMP = "store_first_tx_timestamp"  # STORE_FIRST_TX_TIMESTAMP
    FAILURE_CATEGORY = "failure_category"  # FAILURE_CATEGORY
    REASSESSMENT_RESULT = "reassessment_result"  # REASSESSMENT_RESULT
    
    # Cryptocurrency entities
    DAYS_FROM_CRYPTO_WALLET_FIRST_INCOMING_NATIVE_TX = "days_from_crypto_wallet_first_incoming_native_tx"  # DAYS_FROM_CRYPTO_WALLET_FIRST_INCOMING_NATIVE_TX
    DAYS_FROM_CRYPTO_WALLET_FIRST_INCOMING_NON_NATIVE_TX = "days_from_crypto_wallet_first_incoming_non_native_tx"  # DAYS_FROM_CRYPTO_WALLET_FIRST_INCOMING_NON_NATIVE_TX
    DAYS_FROM_CRYPTO_WALLET_FIRST_OUTGOING_NATIVE_TX = "days_from_crypto_wallet_first_outgoing_native_tx"  # DAYS_FROM_CRYPTO_WALLET_FIRST_OUTGOING_NATIVE_TX
    DAYS_FROM_CRYPTO_WALLET_FIRST_OUTGOING_NON_NATIVE_TX = "days_from_crypto_wallet_first_outgoing_non_native_tx"  # DAYS_FROM_CRYPTO_WALLET_FIRST_OUTGOING_NON_NATIVE_TX
    NORMALIZED_AVS_RESULT_CODE = "normalized_avs_result_code"  # NORMALIZED_AVS_RESULT_CODE
    PRODUCTION_PAYMENT_METHOD_TYPE = "production_payment_method_type"  # PRODUCTION_PAYMENT_METHOD_TYPE
    SELLER_ID = "seller_id"  # SELLER_ID
    MERCHANT_KPI_UPDATE_ID = "merchant_kpi_update_id"  # MERCHANT_KPI_UPDATE_ID
    
    # Product geography entities
    PRODUCT_COUNTRY_CODES = "product_country_codes"  # PRODUCT_COUNTRY_CODES
    DISTANCE_IP_PRODUCT__MODEL_FEATURE = "distance_ip_product__model_feature"  # DISTANCE_IP_PRODUCT__MODEL_FEATURE
    DISTANCE_LOCAL_PRODUCT__MODEL_FEATURE = "distance_local_product__model_feature"  # DISTANCE_LOCAL_PRODUCT__MODEL_FEATURE
    DISTANCE_PAYMENT_METHOD_PRODUCT__MODEL_FEATURE = "distance_payment_method_product__model_feature"  # DISTANCE_PAYMENT_METHOD_PRODUCT__MODEL_FEATURE
    DISTANCE_PHONE_PRODUCT__MODEL_FEATURE = "distance_phone_product__model_feature"  # DISTANCE_PHONE_PRODUCT__MODEL_FEATURE
    MOST_EXPENSIVE_CART_USD_ITEM = "most_expensive_cart_usd_item"  # MOST_EXPENSIVE_CART_USD_ITEM
    PRODUCT_REGIONS = "product_regions"  # PRODUCT_REGIONS
    PRODUCT_PLATFORM = "product_platform"  # PRODUCT_PLATFORM
    PRODUCT_GAMETITLE = "product_gametitle"  # PRODUCT_GAMETITLE
    
    # Attack and security entities
    LAST_REPORTED_ATTACK_ID = "last_reported_attack_id"  # LAST_REPORTED_ATTACK_ID
    LAST_REPORTED_ATTACK_UPLOADED_TO_SNOWFLAKE = "last_reported_attack_uploaded_to_snowflake"  # LAST_REPORTED_ATTACK_UPLOADED_TO_SNOWFLAKE
    IS_BTCC_TEST_TX_NOT_REVIEWED_BY_NSURE = "is_btcc_test_tx_not_reviewed_by_nsure"  # IS_BTCC_TEST_TX_NOT_REVIEWED_BY_NSURE
    
    # Partner classification entities
    PARTNER_MAIN_PRODUCT_TYPE = "partner_main_product_type"  # PARTNER_MAIN_PRODUCT_TYPE
    PARTNER_INDUSTRY = "partner_industry"  # PARTNER_INDUSTRY
    IS_USER_FIRST_TX_ATTEMPT = "is_user_first_tx_attempt"  # IS_USER_FIRST_TX_ATTEMPT


@dataclass
class Entity:
    """Entity representation with comprehensive metadata"""
    
    entity_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: EntityType = EntityType.USER
    
    # Core properties
    name: str = ""
    description: str = ""
    status: str = "active"  # active, inactive, suspicious, blocked, etc.
    
    # Entity data
    attributes: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Temporal information
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    
    # Investigation context
    investigations: Set[str] = field(default_factory=set)
    risk_score: float = 0.0
    confidence_score: float = 1.0
    
    # Relationship tracking
    related_entities: Set[str] = field(default_factory=set)
    parent_entities: Set[str] = field(default_factory=set)
    child_entities: Set[str] = field(default_factory=set)
    
    # Tags and classification
    tags: Set[str] = field(default_factory=set)
    categories: Set[str] = field(default_factory=set)
    
    def add_attribute(self, key: str, value: Any) -> None:
        """Add or update entity attribute"""
        self.attributes[key] = value
        self.updated_at = datetime.now()
    
    def get_attribute(self, key: str, default: Any = None) -> Any:
        """Get entity attribute"""
        return self.attributes.get(key, default)
    
    def add_tag(self, tag: str) -> None:
        """Add tag to entity"""
        self.tags.add(tag.lower())
    
    def has_tag(self, tag: str) -> bool:
        """Check if entity has tag"""
        return tag.lower() in self.tags
    
    def update_risk_score(self, new_score: float, confidence: float = 1.0) -> None:
        """Update entity risk score with confidence weighting"""
        if confidence > 0:
            # Weighted average with confidence
            total_confidence = self.confidence_score + confidence
            self.risk_score = (self.risk_score * self.confidence_score + new_score * confidence) / total_confidence
            self.confidence_score = min(1.0, total_confidence)
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert entity to dictionary"""
        return {
            'entity_id': self.entity_id,
            'entity_type': self.entity_type.value,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'attributes': self.attributes,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'first_seen': self.first_seen.isoformat() if self.first_seen else None,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'investigations': list(self.investigations),
            'risk_score': self.risk_score,
            'confidence_score': self.confidence_score,
            'related_entities': list(self.related_entities),
            'tags': list(self.tags),
            'categories': list(self.categories)
        }


@dataclass
class EntityRelationship:
    """Relationship between entities"""
    
    relationship_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Relationship entities
    source_entity_id: str = ""
    target_entity_id: str = ""
    
    # Relationship properties
    relationship_type: str = "related"  # related, contains, uses, accesses, etc.
    relationship_strength: float = 1.0  # 0.0 to 1.0
    bidirectional: bool = False
    
    # Temporal information
    created_at: datetime = field(default_factory=datetime.now)
    first_observed: Optional[datetime] = None
    last_observed: Optional[datetime] = None
    observation_count: int = 1
    
    # Relationship metadata
    attributes: Dict[str, Any] = field(default_factory=dict)
    evidence: List[Dict[str, Any]] = field(default_factory=list)
    
    # Investigation context
    investigations: Set[str] = field(default_factory=set)
    confidence_score: float = 1.0
    
    def add_observation(self, timestamp: Optional[datetime] = None) -> None:
        """Add observation of this relationship"""
        timestamp = timestamp or datetime.now()
        
        if self.first_observed is None:
            self.first_observed = timestamp
        
        self.last_observed = timestamp
        self.observation_count += 1
    
    def add_evidence(self, evidence: Dict[str, Any]) -> None:
        """Add evidence supporting this relationship"""
        self.evidence.append({
            **evidence,
            'timestamp': datetime.now().isoformat()
        })
    
    def calculate_recency_score(self) -> float:
        """Calculate recency score based on last observation"""
        if not self.last_observed:
            return 0.0
        
        days_since_last = (datetime.now() - self.last_observed).days
        
        # Exponential decay - more recent = higher score
        return max(0.1, 1.0 * (0.9 ** days_since_last))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert relationship to dictionary"""
        return {
            'relationship_id': self.relationship_id,
            'source_entity_id': self.source_entity_id,
            'target_entity_id': self.target_entity_id,
            'relationship_type': self.relationship_type,
            'relationship_strength': self.relationship_strength,
            'bidirectional': self.bidirectional,
            'created_at': self.created_at.isoformat(),
            'first_observed': self.first_observed.isoformat() if self.first_observed else None,
            'last_observed': self.last_observed.isoformat() if self.last_observed else None,
            'observation_count': self.observation_count,
            'attributes': self.attributes,
            'evidence': self.evidence,
            'investigations': list(self.investigations),
            'confidence_score': self.confidence_score
        }


class EntityGraph:
    """Graph representation of entities and relationships"""
    
    def __init__(self):
        self.entities: Dict[str, Entity] = {}
        self.relationships: Dict[str, EntityRelationship] = {}
        
        # Graph indices for efficient traversal
        self.outgoing_relationships: Dict[str, Set[str]] = defaultdict(set)  # entity_id -> relationship_ids
        self.incoming_relationships: Dict[str, Set[str]] = defaultdict(set)  # entity_id -> relationship_ids
        self.entity_type_index: Dict[EntityType, Set[str]] = defaultdict(set)  # type -> entity_ids
    
    def add_entity(self, entity: Entity) -> None:
        """Add entity to graph"""
        self.entities[entity.entity_id] = entity
        self.entity_type_index[entity.entity_type].add(entity.entity_id)
    
    def add_relationship(self, relationship: EntityRelationship) -> None:
        """Add relationship to graph"""
        self.relationships[relationship.relationship_id] = relationship
        
        # Update indices
        self.outgoing_relationships[relationship.source_entity_id].add(relationship.relationship_id)
        self.incoming_relationships[relationship.target_entity_id].add(relationship.relationship_id)
        
        # Update bidirectional relationships
        if relationship.bidirectional:
            self.outgoing_relationships[relationship.target_entity_id].add(relationship.relationship_id)
            self.incoming_relationships[relationship.source_entity_id].add(relationship.relationship_id)
        
        # Update entity relationship tracking
        if relationship.source_entity_id in self.entities:
            self.entities[relationship.source_entity_id].related_entities.add(relationship.target_entity_id)
        
        if relationship.target_entity_id in self.entities:
            self.entities[relationship.target_entity_id].related_entities.add(relationship.source_entity_id)
    
    def get_neighbors(self, entity_id: str, relationship_types: Optional[Set[str]] = None) -> List[str]:
        """Get neighboring entities"""
        neighbors = set()
        
        # Get outgoing relationships
        for rel_id in self.outgoing_relationships.get(entity_id, set()):
            relationship = self.relationships.get(rel_id)
            if relationship and (not relationship_types or relationship.relationship_type in relationship_types):
                neighbors.add(relationship.target_entity_id)
        
        # Get incoming relationships
        for rel_id in self.incoming_relationships.get(entity_id, set()):
            relationship = self.relationships.get(rel_id)
            if relationship and (not relationship_types or relationship.relationship_type in relationship_types):
                neighbors.add(relationship.source_entity_id)
        
        return list(neighbors)
    
    def get_subgraph(self, entity_ids: Set[str], max_depth: int = 2) -> 'EntityGraph':
        """Extract subgraph around specified entities"""
        subgraph = EntityGraph()
        visited = set()
        queue = [(entity_id, 0) for entity_id in entity_ids]
        
        while queue:
            current_id, depth = queue.pop(0)
            
            if current_id in visited or depth > max_depth:
                continue
            
            visited.add(current_id)
            
            # Add entity to subgraph
            if current_id in self.entities:
                subgraph.add_entity(self.entities[current_id])
            
            # Add relationships and neighbors
            for rel_id in self.outgoing_relationships.get(current_id, set()):
                relationship = self.relationships[rel_id]
                subgraph.add_relationship(relationship)
                
                # Add neighbor to queue for next depth level
                if depth < max_depth:
                    queue.append((relationship.target_entity_id, depth + 1))
        
        return subgraph
    
    def find_paths(self, source_id: str, target_id: str, max_depth: int = 3) -> List[List[str]]:
        """Find paths between two entities"""
        paths = []
        
        def dfs(current_id: str, target_id: str, path: List[str], visited: Set[str], depth: int):
            if depth > max_depth:
                return
            
            if current_id == target_id:
                paths.append(path + [current_id])
                return
            
            if current_id in visited:
                return
            
            visited.add(current_id)
            
            for neighbor_id in self.get_neighbors(current_id):
                dfs(neighbor_id, target_id, path + [current_id], visited.copy(), depth + 1)
        
        dfs(source_id, target_id, [], set(), 0)
        return paths
    
    def get_connected_components(self) -> List[Set[str]]:
        """Find connected components in the graph"""
        components = []
        visited = set()
        
        for entity_id in self.entities.keys():
            if entity_id not in visited:
                component = set()
                queue = [entity_id]
                
                while queue:
                    current_id = queue.pop(0)
                    if current_id in visited:
                        continue
                    
                    visited.add(current_id)
                    component.add(current_id)
                    
                    # Add neighbors to queue
                    for neighbor_id in self.get_neighbors(current_id):
                        if neighbor_id not in visited:
                            queue.append(neighbor_id)
                
                components.append(component)
        
        return components


class EntityManager:
    """
    Comprehensive entity management system for multi-entity investigations.
    
    Features:
    - Entity lifecycle management
    - Relationship tracking and graph analysis
    - Multi-entity investigation coordination
    - Entity clustering and pattern detection
    - Performance optimization with indexing
    - Temporal analysis and evolution tracking
    """
    
    def __init__(self):
        self.entity_graph = EntityGraph()
        
        # Investigation tracking
        self.investigation_entities: Dict[str, Set[str]] = defaultdict(set)  # investigation_id -> entity_ids
        
        # Performance indices
        self.risk_score_index: Dict[float, Set[str]] = defaultdict(set)  # risk_score -> entity_ids
        self.tag_index: Dict[str, Set[str]] = defaultdict(set)  # tag -> entity_ids
        
        # Statistics
        self.stats = {
            'entities_created': 0,
            'relationships_created': 0,
            'investigations_tracked': 0,
            'start_time': datetime.now()
        }
        
        self.logger = logging.getLogger(f"{__name__}.entity_manager")
    
    async def create_entity(
        self,
        entity_type: EntityType,
        name: str = "",
        attributes: Optional[Dict[str, Any]] = None,
        investigation_id: Optional[str] = None
    ) -> str:
        """Create new entity"""
        
        try:
            entity = Entity(
                entity_type=entity_type,
                name=name,
                attributes=attributes or {}
            )
            
            if investigation_id:
                entity.investigations.add(investigation_id)
                self.investigation_entities[investigation_id].add(entity.entity_id)
            
            # Add to graph
            self.entity_graph.add_entity(entity)
            
            # Update indices
            self._update_entity_indices(entity)
            
            # Update statistics
            self.stats['entities_created'] += 1
            
            self.logger.info(f"Created entity {entity.entity_id} of type {entity_type.value}")
            return entity.entity_id
            
        except Exception as e:
            self.logger.error(f"Failed to create entity: {str(e)}")
            raise
    
    async def create_relationship(
        self,
        source_entity_id: str,
        target_entity_id: str,
        relationship_type: str = "related",
        strength: float = 1.0,
        bidirectional: bool = False,
        evidence: Optional[Dict[str, Any]] = None,
        investigation_id: Optional[str] = None
    ) -> str:
        """Create relationship between entities"""
        
        try:
            relationship = EntityRelationship(
                source_entity_id=source_entity_id,
                target_entity_id=target_entity_id,
                relationship_type=relationship_type,
                relationship_strength=strength,
                bidirectional=bidirectional
            )
            
            if evidence:
                relationship.add_evidence(evidence)
            
            if investigation_id:
                relationship.investigations.add(investigation_id)
            
            # Add to graph
            self.entity_graph.add_relationship(relationship)
            
            # Update statistics
            self.stats['relationships_created'] += 1
            
            self.logger.info(f"Created {relationship_type} relationship between {source_entity_id} and {target_entity_id}")
            return relationship.relationship_id
            
        except Exception as e:
            self.logger.error(f"Failed to create relationship: {str(e)}")
            raise
    
    def get_entity(self, entity_id: str) -> Optional[Entity]:
        """Get entity by ID"""
        return self.entity_graph.entities.get(entity_id)
    
    def get_entities_by_type(self, entity_type: EntityType) -> List[Entity]:
        """Get all entities of specified type"""
        entity_ids = self.entity_graph.entity_type_index.get(entity_type, set())
        return [self.entity_graph.entities[eid] for eid in entity_ids]
    
    def get_entities_by_investigation(self, investigation_id: str) -> List[Entity]:
        """Get all entities for investigation"""
        entity_ids = self.investigation_entities.get(investigation_id, set())
        return [self.entity_graph.entities[eid] for eid in entity_ids if eid in self.entity_graph.entities]
    
    def get_high_risk_entities(self, threshold: float = 0.7) -> List[Entity]:
        """Get entities with high risk scores"""
        high_risk = []
        
        for entity in self.entity_graph.entities.values():
            if entity.risk_score >= threshold:
                high_risk.append(entity)
        
        # Sort by risk score (highest first)
        high_risk.sort(key=lambda e: e.risk_score, reverse=True)
        return high_risk
    
    def get_related_entities(
        self,
        entity_id: str,
        max_depth: int = 2,
        relationship_types: Optional[Set[str]] = None
    ) -> List[Entity]:
        """Get entities related to specified entity"""
        
        subgraph = self.entity_graph.get_subgraph({entity_id}, max_depth)
        
        # Filter by relationship types if specified
        if relationship_types:
            filtered_entities = []
            for eid, entity in subgraph.entities.items():
                if eid == entity_id:
                    continue  # Skip the source entity
                
                # Check if connected through specified relationship types
                neighbors = self.entity_graph.get_neighbors(entity_id, relationship_types)
                if eid in neighbors or any(eid in self.entity_graph.get_neighbors(nid, relationship_types) for nid in neighbors):
                    filtered_entities.append(entity)
            
            return filtered_entities
        else:
            return [entity for eid, entity in subgraph.entities.items() if eid != entity_id]
    
    def find_entity_clusters(self, min_cluster_size: int = 3) -> List[Set[str]]:
        """Find clusters of related entities"""
        
        components = self.entity_graph.get_connected_components()
        
        # Filter by minimum cluster size
        clusters = [component for component in components if len(component) >= min_cluster_size]
        
        return clusters
    
    def analyze_entity_network(self, entity_id: str) -> Dict[str, Any]:
        """Analyze entity's network characteristics"""
        
        if entity_id not in self.entity_graph.entities:
            return {}
        
        entity = self.entity_graph.entities[entity_id]
        neighbors = self.entity_graph.get_neighbors(entity_id)
        
        # Calculate network metrics
        degree = len(neighbors)
        
        # Get relationship types
        relationship_types = defaultdict(int)
        for rel_id in self.entity_graph.outgoing_relationships.get(entity_id, set()):
            relationship = self.entity_graph.relationships[rel_id]
            relationship_types[relationship.relationship_type] += 1
        
        # Calculate risk propagation
        neighbor_risk_scores = [
            self.entity_graph.entities[nid].risk_score 
            for nid in neighbors 
            if nid in self.entity_graph.entities
        ]
        
        avg_neighbor_risk = sum(neighbor_risk_scores) / len(neighbor_risk_scores) if neighbor_risk_scores else 0.0
        
        return {
            'entity_id': entity_id,
            'network_degree': degree,
            'relationship_types': dict(relationship_types),
            'neighbor_count': len(neighbors),
            'avg_neighbor_risk_score': avg_neighbor_risk,
            'risk_divergence': abs(entity.risk_score - avg_neighbor_risk),
            'connected_entity_types': [
                self.entity_graph.entities[nid].entity_type.value 
                for nid in neighbors 
                if nid in self.entity_graph.entities
            ]
        }
    
    def _update_entity_indices(self, entity: Entity) -> None:
        """Update entity search indices"""
        
        # Update tag index
        for tag in entity.tags:
            self.tag_index[tag].add(entity.entity_id)
        
        # Update risk score index (bucketed)
        risk_bucket = round(entity.risk_score, 1)
        self.risk_score_index[risk_bucket].add(entity.entity_id)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get entity manager statistics"""
        
        uptime = (datetime.now() - self.stats['start_time']).total_seconds()
        
        # Calculate entity type distribution
        type_distribution = {
            entity_type.value: len(entity_ids) 
            for entity_type, entity_ids in self.entity_graph.entity_type_index.items()
        }
        
        # Calculate relationship type distribution
        relationship_types = defaultdict(int)
        for relationship in self.entity_graph.relationships.values():
            relationship_types[relationship.relationship_type] += 1
        
        return {
            'manager_status': {
                'uptime_seconds': uptime,
                'entities_count': len(self.entity_graph.entities),
                'relationships_count': len(self.entity_graph.relationships),
                'investigations_tracked': len(self.investigation_entities)
            },
            'creation_stats': {
                'entities_created': self.stats['entities_created'],
                'relationships_created': self.stats['relationships_created'],
                'investigations_tracked': self.stats['investigations_tracked']
            },
            'entity_distribution': type_distribution,
            'relationship_distribution': dict(relationship_types),
            'graph_metrics': {
                'connected_components': len(self.entity_graph.get_connected_components()),
                'avg_entity_degree': self._calculate_average_degree(),
                'total_tags': len(self.tag_index)
            }
        }
    
    def _calculate_average_degree(self) -> float:
        """Calculate average entity degree in graph"""
        if not self.entity_graph.entities:
            return 0.0
        
        total_degree = sum(
            len(self.entity_graph.get_neighbors(entity_id)) 
            for entity_id in self.entity_graph.entities.keys()
        )
        
        return total_degree / len(self.entity_graph.entities)


# Global entity manager instance
_entity_manager: Optional[EntityManager] = None


def get_entity_manager() -> EntityManager:
    """Get the global entity manager instance"""
    global _entity_manager
    
    if _entity_manager is None:
        _entity_manager = EntityManager()
    
    return _entity_manager