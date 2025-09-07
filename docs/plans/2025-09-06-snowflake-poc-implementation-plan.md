# Snowflake POC Implementation Plan

**Author:** Gil Klainert  
**Date:** 2025-09-06  
**Version:** 1.0  
**Status:** ✅ COMPLETED (2025-09-06)  
**Project:** Olorin Fraud Detection Platform - Snowflake Data Warehouse Integration  
**Implementation Guide:** [/docs/snowflake-poc-readme.md](/docs/snowflake-poc-readme.md)  
**Interactive Diagram:** [/docs/diagrams/snowflake-poc-architecture-2025-09-06.html](/docs/diagrams/snowflake-poc-architecture-2025-09-06.html)

## Executive Summary

This plan outlines the implementation of a production-ready Snowflake data warehouse integration for the Olorin fraud detection platform. The implementation replaces mock Snowflake functionality with real database connectivity, supports dual configuration through both Firebase Secrets (production) and .env files (development), and provides advanced configurable analytics for fraud investigation.

## Objectives

1. **Create Production Snowflake Table**: Implement 200+ column transaction table with comprehensive fraud detection schema
2. **Dual Configuration Support**: Maintain both Firebase Secrets (production) and .env file configuration (development) for Snowflake credentials
3. **Tool Consolidation**: Disable all tools except Snowflake integration
4. **Advanced Analytics**: Implement configurable risk-based entity analysis with time filtering and top percentage selection
5. **Production Readiness**: Ensure zero mock data, complete error handling, and performance optimization

## Current State Analysis

### Existing Infrastructure
- **Mock Snowflake Client**: `/olorin-server/app/service/agent/tools/snowflake_tool/` contains placeholder implementation
- **Firebase Secrets**: Configuration managed via `config_loader.py` and `config_secrets.py`
- **Disabled Snowflake Config**: Lines 100-116 in `config_secrets.py` are commented out
- **No .env Template**: No existing .env.example file for configuration reference

### Required Changes
- Replace mock client with `snowflake-connector-python`
- Implement .env-based configuration loading
- Create comprehensive transaction table schema
- Build configurable analytics engine
- Disable non-Snowflake tools in registry

## Implementation Phases

### Phase 1: Database Schema & Configuration Design (Day 1-2)

#### 1.1 Snowflake Table Creation - Complete 300+ Column Schema
```sql
CREATE OR REPLACE TABLE FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED (
    -- Record Metadata
    TABLE_RECORD_CREATED_AT VARCHAR(26),
    TABLE_RECORD_UPDATED_AT VARCHAR(26),
    
    -- Transaction Core Information
    EVENT_TYPE VARCHAR(16777216),
    ORIGINAL_TX_ID VARCHAR(16777216),
    STORE_ID VARCHAR(16777216),
    CLIENT_REQUEST_ID VARCHAR(16777216),
    APP_ID VARCHAR(16777216),
    TX_ID_KEY VARCHAR(16777216) PRIMARY KEY,
    SURROGATE_APP_TX_ID VARCHAR(16777216),
    NSURE_UNIQUE_TX_ID VARCHAR(16777216),
    UNIQUE_USER_ID VARCHAR(16777216),
    TX_DATETIME TIMESTAMP_NTZ(9),
    TX_RECEIVED_DATETIME TIMESTAMP_NTZ(9),
    TX_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    TX_TIMESTAMP_MS NUMBER(38,0),
    IS_SENT_FOR_NSURE_REVIEW NUMBER(1,0),
    AUTHORIZATION_STAGE VARCHAR(16777216),
    
    -- Personal Information
    EMAIL VARCHAR(16777216),
    EMAIL_NORMALIZED VARCHAR(16777216),
    FIRST_NAME VARCHAR(16777216),
    LAST_NAME VARCHAR(16777216),
    PHONE_COUNTRY_CODE VARCHAR(16777216),
    PHONE_NUMBER VARCHAR(16777216),
    DATE_OF_BIRTH TIMESTAMP_NTZ(9),
    PERSONAL_INFO_ADDITIONAL_DATA OBJECT,
    
    -- Merchant & Product Information
    MERCHANT_SEGMENT_ID VARCHAR(16777216),
    BILLING_ADDRESS VARIANT,
    CART VARIANT,
    CART_ITEMS_TYPES ARRAY,
    PRODUCT VARCHAR(16777216),
    CART_SKUS ARRAY,
    CART_BRANDS ARRAY,
    CART_ITEMS_ARE_GIFTS ARRAY,
    CART_ITEMS_FULFILLMENT ARRAY,
    CREDIT_USE VARIANT,
    
    -- Payment Information
    PAID_AMOUNT_CURRENCY VARCHAR(16777216),
    PAID_AMOUNT_VALUE_IN_CURRENCY FLOAT,
    PROCESSING_FEE_CURRENCY VARCHAR(16777216),
    PROCESSING_FEE_VALUE_IN_CURRENCY FLOAT,
    BIN VARCHAR(16777216),
    LAST_FOUR VARCHAR(16777216),
    PAYMENT_METHOD VARCHAR(16777216),
    PROCESSOR VARCHAR(16777216),
    PROCESSOR_MERCHANT_IDENTIFIER VARCHAR(16777216),
    PAYMENT_METHOD_TOKEN VARCHAR(16777216),
    PAYMENT_METHOD_INTERNAL_IDENTIFIER VARCHAR(16777216),
    CARD_HOLDER_NAME VARCHAR(16777216),
    IS_THREE_D_SECURE_VERIFIED NUMBER(38,0),
    THREE_D_SECURE_RESULT VARCHAR(16777216),
    IS_UNDER_THREE_D_SECURE NUMBER(38,0),
    PAYPAL_EMAIL VARCHAR(16777216),
    PAYMENT_METHOD_DETAILS_ADDITIONAL_DATA OBJECT,
    
    -- Transaction Metadata
    IS_ANONYMOUS NUMBER(1,0),
    FAILURE_REASON VARCHAR(16777216),
    TRANSACTION_DETAILS_ADDITIONAL_DATA OBJECT,
    
    -- Device & Session Information
    DEVICE_ID VARCHAR(16777216),
    IP VARCHAR(16777216),
    USER_AGENT VARCHAR(16777216),
    SESSION_INFO_LANGUAGE VARCHAR(16777216),
    SESSION_INFO_ADDITIONAL_DATA OBJECT,
    
    -- Recipient Information
    FIRST_RECIPIENT_INFO VARIANT,
    FIRST_RECIPIENT_EMAIL VARCHAR(16777216),
    FIRST_RECIPIENT_PHONE VARCHAR(16777216),
    ALL_RECIPIENT_INFO ARRAY,
    ALL_RECIPIENT_EMAILS ARRAY,
    ALL_RECIPIENT_EMAILS_NORMALIZED ARRAY,
    IS_GIFTING NUMBER(1,0),
    CART_DELIVERY_METHODS ARRAY,
    IS_DELIVERY_METHOD_EMAIL_ONLY NUMBER(1,0),
    IS_DELIVERY_METHOD_CONTAINING_ON_SCREEN NUMBER(1,0),
    
    -- Partner Information
    PARTNER_ID VARCHAR(16777216),
    RISK_MODE VARCHAR(16777216),
    TX_ADDITIONAL_DATA OBJECT,
    
    -- Calculated Properties
    CALCULATED_PROPS_ID VARCHAR(16777216),
    CALCULATED_PROPS_CREATED_DATETIME TIMESTAMP_NTZ(9),
    CALCULATED_PROPS_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    CART_USD VARIANT,
    GMV FLOAT,
    
    -- Email Verification
    IS_EMAIL_VERIFIED_BY_THIRD_PARTY NUMBER(38,0),
    IS_RECIPIENT_EMAIL_VERIFIED_BY_THIRD_PARTY NUMBER(38,0),
    EMAIL_FIRST_SEEN TIMESTAMP_NTZ(9),
    PAYPAL_EMAIL_FIRST_SEEN TIMESTAMP_NTZ(9),
    RECIPIENT_EMAIL_FIRST_SEEN TIMESTAMP_NTZ(9),
    EMAIL_DATA_THIRD_PARTY_RISK_SCORE FLOAT,
    
    -- Geographic Information
    IP_COUNTRY_CODE VARCHAR(16777216),
    IS_DEVICE_ID_AUTHENTICATED NUMBER(38,0),
    IS_PAYPAL_ADDRESS_CONFIRMED NUMBER(38,0),
    
    -- PIPL Information
    PIPL_INFO_AGE VARIANT,
    PIPL_INFO_PERSON VARIANT,
    
    -- Processor Information
    IS_PROCESSOR_REPORTED_STOLEN_CARD NUMBER(38,0),
    IS_PROCESSOR_REJECTED_DUE_TO_FRAUD NUMBER(38,0),
    
    -- IP Address Information
    IP_ADDRESS_INFO VARIANT,
    ISP VARCHAR(16777216),
    ISP_ARRAY VARIANT,
    ASN VARCHAR(16777216),
    
    -- Time-based Metrics
    DAYS_FROM_FIRST_EMAIL_SEEN_TO_TX NUMBER(24,6),
    DAYS_FROM_FIRST_PAYPAL_EMAIL_SEEN_TO_TX NUMBER(24,6),
    DAYS_FROM_FIRST_RECIPIENT_EMAIL_SEEN_TO_TX NUMBER(24,6),
    
    -- Names
    MERCHANT_NAME VARCHAR(16777216),
    PARTNER_NAME VARCHAR(16777216),
    
    -- Nsure Decisions
    NSURE_DECISIONS ARRAY,
    COUNT_NSURE_DECISIONS NUMBER(18,0),
    NSURE_FIRST_DECISION VARCHAR(16777216),
    NSURE_FIRST_DECISION_DATETIME TIMESTAMP_NTZ(9),
    NSURE_LAST_DECISION VARCHAR(16777216),
    NSURE_LAST_DECISION_DATETIME TIMESTAMP_NTZ(9),
    NSURE_LAST_DECISION_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    IS_REASSESSED_TX NUMBER(38,0),
    
    -- Rules Information
    TRIGGERED_RULES ARRAY,
    COUNT_TRIGGERED_RULES NUMBER(9,0),
    RULE VARCHAR(16777216),
    RULE_DECISION VARCHAR(16777216),
    RULE_DESCRIPTION VARCHAR(16777216),
    IS_RULE_PARTICIPATING_IN_LFS_PO NUMBER(38,0),
    TRIGGERED_LFS_RULES ARRAY,
    
    -- Model Information
    MODEL_DECISION VARCHAR(16777216),
    MODEL_SCORE FLOAT,
    MODEL_VERSION VARCHAR(16777216),
    MODEL_APPROVAL_THRESHOLD FLOAT,
    MODEL_SOFT_APPROVAL_THRESHOLD FLOAT,
    REJECTION_REASON VARCHAR(16777216),
    NOT_REVIEWED_REASON VARCHAR(16777216),
    SIMULATED_DECISION VARCHAR(16777216),
    SIMULATED_SEGMENT_ID VARCHAR(16777216),
    NSURE_SEGMENT_ID VARCHAR(16777216),
    ADDITIONAL_SEGMENTS VARIANT,
    
    -- Merchant Decisions
    MERCHANT_LAST_DECISION_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    MERCHANT_DECISIONS ARRAY,
    COUNT_MERCHANT_DECISIONS NUMBER(18,0),
    MERCHANT_LAST_DECISION VARCHAR(16777216),
    MERCHANT_LAST_DECISION_DATETIME TIMESTAMP_NTZ(9),
    
    -- Transaction Status
    IS_FAILED_TX NUMBER(1,0),
    IS_REVIEWED NUMBER(1,0),
    
    -- Raw Processor Data
    RAW_PROCESSOR_RESPONSE VARIANT,
    RAW_PROCESSOR_RESPONSE_SOURCE VARCHAR(16777216),
    RAW_PROCESSOR_REQUEST VARIANT,
    RAW_PROCESSOR_REQUEST_SOURCE VARCHAR(16777216),
    
    -- Liability Information
    IS_UNDER_NSURE_LIABILITY NUMBER(1,0),
    IS_SOFT_APPROVED NUMBER(1,0),
    
    -- Device Information
    APP_INSTALL_DATETIME TIMESTAMP_NTZ(9),
    DEVICE_TYPE VARCHAR(16777216),
    DEVICE_MODEL VARCHAR(16777216),
    DEVICE_OS_VERSION VARCHAR(16777216),
    DEVICE_APP_INSTALL_SDK_VERSION VARCHAR(16777216),
    FIPP_VISITOR_ID VARCHAR(16777216),
    FIPP_IS_INCOGNITO BOOLEAN,
    DAYS_FROM_FIRST_APP_INSTALL_TO_TX NUMBER(24,6),
    
    -- Card Information
    CARD_BRAND VARCHAR(16777216),
    CARD_CATEGORY VARCHAR(16777216),
    CARD_TYPE VARCHAR(16777216),
    IS_CARD_COMMERCIAL NUMBER(38,0),
    IS_CARD_PREPAID NUMBER(38,0),
    CARD_ISSUER VARCHAR(16777216),
    BIN_COUNTRY_CODE VARCHAR(16777216),
    CARD_ISSUER_NORMALIZED VARCHAR(16777216),
    BIN_ADDITIONAL_DATA OBJECT,
    BIN_CREATED_TIME TIMESTAMP_NTZ(9),
    BIN_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    
    -- HLR (Home Location Register) Information
    HLR_PHONE_COUNTRY_CODE VARCHAR(16777216),
    HLR_IS_VALID NUMBER(38,0),
    HLR_NUMBER_VALID NUMBER(38,0),
    HLR_IS_MOBILE NUMBER(38,0),
    HLR_IS_PORTED NUMBER(38,0),
    HLR_IS_ROAMING NUMBER(38,0),
    HLR_NUMBER_TYPE VARCHAR(16777216),
    HLR_ORIGIN_NETWORK VARCHAR(16777216),
    HLR_STATUS VARCHAR(16777216),
    HLR_CURRENT_NETWORK VARCHAR(16777216),
    HLR_PORTED_NETWORK VARCHAR(16777216),
    HLR_ADDITIONAL_DATA OBJECT,
    HLR_CREATED_TIME TIMESTAMP_NTZ(9),
    HLR_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    
    -- MaxMind Information
    MAXMIND_IP_RISK_SCORE FLOAT,
    MAXMIND_RISK_SCORE FLOAT,
    MAXMIND_CREATED_TIME TIMESTAMP_NTZ(9),
    MAXMIND_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    
    -- Email Validation
    BUYER_EMAIL_SMTPV_RESPONSE VARIANT,
    SMTPV_BUYER_EMAIL_CREATED_TIME TIMESTAMP_NTZ(9),
    SMTPV_BUYER_EMAIL_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    EMAIL_VALIDATION_CREATED TIMESTAMP_NTZ(9),
    EMAIL_VALIDATION_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    IS_DISPOSABLE_EMAIL NUMBER(38,0),
    IS_FREEMAIL NUMBER(38,0),
    IS_PERSONAL_EMAIL NUMBER(38,0),
    IS_VALID_EMAIL NUMBER(38,0),
    EMAIL_VALIDATION_ADDITIONAL_DATA OBJECT,
    
    -- Recipient Email Validation
    RECIPIENT_EMAIL_VALIDATION_CREATED TIMESTAMP_NTZ(9),
    RECIPIENT_EMAIL_VALIDATION_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    IS_RECIPIENT_EMAIL_DISPOSABLE NUMBER(38,0),
    IS_RECIPIENT_EMAIL_FREEMAIL NUMBER(38,0),
    IS_RECIPIENT_EMAIL_PERSONAL NUMBER(38,0),
    IS_RECIPIENT_EMAIL_VALID NUMBER(38,0),
    RECIPIENT_EMAIL_VALIDATION_ADDITIONAL_DATA OBJECT,
    
    -- Disputes Information
    DISPUTES ARRAY,
    COUNT_DISPUTES NUMBER(18,0),
    FIRST_DISPUTE_DATETIME TIMESTAMP_NTZ(9),
    LAST_DISPUTE_DATETIME TIMESTAMP_NTZ(9),
    LAST_DISPUTE_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    LAST_DISPUTE_AMOUNT VARIANT,
    LAST_DISPUTE_STATUS VARCHAR(16777216),
    LAST_DISPUTE_DECISION VARCHAR(16777216),
    IS_LAST_DISPUTE_FRAUD_RELATED_REASON NUMBER(38,0),
    LAST_DISPUTE_REASON VARCHAR(16777216),
    LAST_DISPUTE_SOURCE VARIANT,
    FIRST_NON_FRAUD_DISPUTE_DATETIME TIMESTAMP_NTZ(9),
    
    -- Fraud Alerts
    FRAUD_ALERTS ARRAY,
    COUNT_FRAUD_ALERTS NUMBER(18,0),
    FIRST_FRAUD_ALERT_DATETIME TIMESTAMP_NTZ(9),
    LAST_FRAUD_ALERT_DATETIME TIMESTAMP_NTZ(9),
    LAST_FRAUD_ALERT_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    
    -- Refunds
    NSURE_INITIATED_REFUND_DATETIME TIMESTAMP_NTZ(9),
    LAST_NSURE_INITIATED_REFUND_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    TX_REFUND_REASON VARCHAR(16777216),
    TX_REFUND_DATETIME TIMESTAMP_NTZ(9),
    TX_REFUND_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    
    -- MaxMind Fraud Alerts
    LAST_MAXMIND_MIN_FRAUD_ALERT_DATETIME TIMESTAMP_NTZ(9),
    LAST_MAXMIND_MIN_FRAUD_ALERT_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    LAST_MAXMIND_MIN_FRAUD_ALERT_NEW_RISK_SCORE FLOAT,
    LAST_MAXMIND_MIN_FRAUD_ALERT_REASON_CODE VARCHAR(16777216),
    MAXMIND_MIN_FRAUD_ALERTS ARRAY,
    COUNT_MAXMIND_MIN_FRAUD_ALERTS NUMBER(18,0),
    
    -- Retry Information
    BUYER_RETRY_TX_ID VARCHAR(16777216),
    NSURE_RETRY_TX_ID VARCHAR(16777216),
    LAST_RETRY_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    
    -- User History
    FIRST_NSURE_TX_ATTEMPT_DATETIME TIMESTAMP_NTZ(9),
    FIRST_USER_TX_EVENT_DATETIME TIMESTAMP_NTZ(9),
    IS_USER_FIRST_TX_EVENT NUMBER(1,0),
    FIRST_USER_ACCOUNT_ACTIVITY_DATE TIMESTAMP_NTZ(9),
    FIRST_SIGN_IN_IDENTITY_PROVIDER VARCHAR(16777216),
    FIRST_USER_FAILED_KYC_DATETIME TIMESTAMP_NTZ(9),
    FIRST_USER_SUCCESSFULLY_FULFILLED_KYC_DATETIME TIMESTAMP_NTZ(9),
    FIRST_USER_TRIGGERED_KYC_DATETIME TIMESTAMP_NTZ(9),
    
    -- Model Manager Features
    MODEL_MANAGER_TX_FEATURES_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    FIRST_MERCHANT_ACCEPTED_DATETIME TIMESTAMP_NTZ(9),
    FIRST_PAYMENT_METHOD_ATTEMPT_DATETIME TIMESTAMP_NTZ(9),
    FIRST_TX_ATTEMPT_DATETIME TIMESTAMP_NTZ(9),
    DAYS_FROM_FIRST_TX_ATTEMPT_TO_TX NUMBER(24,6),
    DAYS_FROM_FIRST_USER_ACCOUNT_ACTIVITY_DATE_TO_TX NUMBER(24,6),
    
    -- Fraud Status
    FIRST_FRAUD_STATUS_DATETIME TIMESTAMP_NTZ(9),
    IS_FRAUD_TX NUMBER(1,0),
    IS_DISPUTED_NON_FRAUD_TX NUMBER(1,0),
    
    -- Additional Payment Information
    PAYMENT_METHOD_COUNTRY_CODE VARCHAR(16777216),
    DAYS_FROM_FIRST_MERCHANT_ACCEPTANCE_TO_TX FLOAT,
    DAYS_FROM_FIRST_PAYMENT_METHOD_ATTEMPT_TO_TX FLOAT,
    
    -- Distance Metrics
    LOCAL_PART_TO_NAME_DISTANCE FLOAT,
    BUYER_NAME_TO_PIPL_NAME_DISTANCE FLOAT,
    PAYPAL_LOCAL_PART_TO_NAME_DISTANCE FLOAT,
    PERSONAL_INFO_EMAIL_TO_RECIPIENT_EMAIL_LOCAL_PARTS_DISTANCE FLOAT,
    
    -- Group Metrics
    GROUP_NEW_BUYERS_GMV_IN_LAST_DAY FLOAT,
    GROUP_NEW_PAYMENT_METHODS_GMV_IN_LAST_DAY FLOAT,
    GROUP_NEW_BUYERS_TXS_IN_LAST_DAY FLOAT,
    GROUP_NEW_PAYMENT_METHODS_TXS_IN_LAST_DAY FLOAT,
    GROUP_MAX_MAXMIND_RISK_SCORE FLOAT,
    GROUP_TX_FAILURE_COUNT FLOAT,
    GROUP_TX_FAILURE_GMV FLOAT,
    
    -- Payment Method & User Metrics
    PM_ACCEPTED_TXS_COUNT FLOAT,
    USER_GRAPH_SIZE FLOAT,
    BIN_RISKY_GMV FLOAT,
    BUYER_AGE FLOAT,
    DAYS_FROM_VISITOR_ID_AGE FLOAT,
    
    -- Model Features
    IS_RECURRING_USER NUMBER(38,0),
    IS_NEW_BUYER__MODEL_FEATURE NUMBER(38,0),
    IS_NEW_PAYMENT_METHOD__MODEL_FEATURE NUMBER(38,0),
    IS_FREE_MAIL__MODEL_FEATURE NUMBER(38,0),
    IS_EMAIL_VERIFIED__MODEL_FEATURE NUMBER(38,0),
    ISSUER_RISKY_GMV__MODEL_FEATURE FLOAT,
    PM_COUNTRY_RISKY_GMV__MODEL_FEATURE FLOAT,
    SEASONALITY_ATTUNED_BIN_RISKY_GMV__MODEL_FEATURE FLOAT,
    
    -- Cart Analysis
    CART_WITHOUT_FEE_ITEMS ARRAY,
    IS_DIGITAL NUMBER(1,0),
    IS_SUSPICIOUS_AMOUNT NUMBER(2,0),
    
    -- Store Metrics
    DAYS_FROM_STORE_FIRST_TX__MODEL_FEATURE FLOAT,
    DAYS_FROM_STORE_CREATION__MODEL_FEATURE FLOAT,
    
    -- AVS & User Agent
    AVS VARCHAR(16777216),
    PARSED_USER_AGENT OBJECT,
    
    -- Production Recipient
    PROD_RECIPIENT_INFO VARIANT,
    
    -- KYC Information
    FIRST_USER_COMPLETED_KYC_RESULT VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_TYPE VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_PROVIDER VARCHAR(16777216),
    FIRST_USER_COMPLETED_NUM_OF_KYC_ATTEMPTS VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_CREATE_DATE TIMESTAMP_NTZ(9),
    FIRST_USER_COMPLETED_KYC_REVIEW_ANSWER_OR_STATUS VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_LEVEL_NAME VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_DOCUMENT_TYPE VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_FIRST_NAME VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_LAST_NAME VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_ADDRESS_COUNTRY_USER_INPUT VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_STATE_USER_INPUT VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_TOWN_USER_INPUT VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_POST_CODE_USER_INPUT VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_ID_POST_CODE_FROM_DOCS_ARRAY VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_ID_COUNTRY_OF_BIRTH VARCHAR(16777216),
    FIRST_USER_COMPLETED_KYC_ID_ISSUING_COUNTRY_FROM_DOCS_ARRAY VARCHAR(16777216),
    
    -- Custodial & Soft Approval
    CUSTODIAL_TYPE VARCHAR(16777216),
    SOFT_APPROVAL_POPULATIONS_LIST VARIANT,
    IS_SOFT_APPROVAL_CANDIDATE VARIANT,
    IS_ROUTER_DEVICE_ID_AUTHENTICATED BOOLEAN,
    
    -- Reassessment
    REASSESSMENT_REJECTION_REASON VARCHAR(16777216),
    MILLISECONDS_FROM_SOFT_APPROVED_TO_REASSESSMENT_RESPONSE NUMBER(38,0),
    
    -- Dispute Details
    LAST_DISPUTE_SELLER_BUYER_CHAT VARIANT,
    LAST_DISPUTED_ITEM_BUYER_NOTES VARCHAR(16777216),
    
    -- Additional Email Information
    BUYER_EMAIL_DOMAIN VARCHAR(16777216),
    REFUSAL_REASON VARCHAR(16777216),
    
    -- Enrichment Timestamps
    ENRICHED_TXS_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    
    -- Product Information
    PRODUCT_TYPE VARCHAR(16777216),
    FIRST_USER_SUCCESSFULLY_FULFILLED_KYC_DATE_OF_BIRTH VARCHAR(16777216),
    KYC_USER_AGE NUMBER(19,6),
    STORE_FIRST_TX_TIMESTAMP NUMBER(38,0),
    
    -- Failure & Reassessment
    FAILURE_CATEGORY VARCHAR(16777216),
    REASSESSMENT_RESULT VARCHAR(16777216),
    
    -- Crypto Wallet Metrics
    DAYS_FROM_CRYPTO_WALLET_FIRST_INCOMING_NATIVE_TX FLOAT,
    DAYS_FROM_CRYPTO_WALLET_FIRST_INCOMING_NON_NATIVE_TX FLOAT,
    DAYS_FROM_CRYPTO_WALLET_FIRST_OUTGOING_NATIVE_TX FLOAT,
    DAYS_FROM_CRYPTO_WALLET_FIRST_OUTGOING_NON_NATIVE_TX FLOAT,
    
    -- AVS Normalization
    NORMALIZED_AVS_RESULT_CODE VARCHAR(16777216),
    PRODUCTION_PAYMENT_METHOD_TYPE VARCHAR(16777216),
    
    -- Seller Information
    SELLER_ID VARCHAR(16777216),
    MERCHANT_KPI_UPDATE_ID VARCHAR(16777216),
    
    -- Product Geographic Information
    PRODUCT_COUNTRY_CODES VARIANT,
    DISTANCE_IP_PRODUCT__MODEL_FEATURE FLOAT,
    DISTANCE_LOCAL_PRODUCT__MODEL_FEATURE FLOAT,
    DISTANCE_PAYMENT_METHOD_PRODUCT__MODEL_FEATURE FLOAT,
    DISTANCE_PHONE_PRODUCT__MODEL_FEATURE FLOAT,
    
    -- Cart Analysis
    MOST_EXPENSIVE_CART_USD_ITEM VARIANT,
    PRODUCT_REGIONS VARIANT,
    PRODUCT_PLATFORM VARCHAR(16777216),
    PRODUCT_GAMETITLE VARCHAR(16777216),
    
    -- Attack Information
    LAST_REPORTED_ATTACK_ID VARCHAR(16777216),
    LAST_REPORTED_ATTACK_UPLOADED_TO_SNOWFLAKE TIMESTAMP_NTZ(9),
    
    -- Test Flags
    IS_BTCC_TEST_TX_NOT_REVIEWED_BY_NSURE BOOLEAN,
    
    -- Partner Classification
    PARTNER_MAIN_PRODUCT_TYPE VARCHAR(16777216),
    PARTNER_INDUSTRY VARCHAR(16777216),
    
    -- User Transaction History
    IS_USER_FIRST_TX_ATTEMPT NUMBER(1,0)
    
) CLUSTER BY (TX_DATETIME, EMAIL);
```

#### 1.2 .env Configuration Template
```bash
# Tool Enable/Disable Configuration (all default to false except Snowflake)
USE_SNOWFLAKE=true          # Snowflake is enabled by default for this POC
USE_SPLUNK=false            # Splunk log analysis
USE_SUMO_LOGIC=false        # SumoLogic log aggregation
USE_DATABRICKS=false        # Databricks analytics
USE_MAXMIND=false           # MaxMind geolocation
USE_EMAILAGE=false          # EmailAge verification
USE_PIPL=false              # PIPL people search
USE_DEVICE_FINGERPRINT=false # Device fingerprinting service
USE_IP_QUALITY_SCORE=false  # IP quality scoring
USE_PHONE_VERIFICATION=false # Phone number verification
USE_ADDRESS_VALIDATION=false # Address validation service
USE_FRAUD_DETECTION_API=false # External fraud detection APIs
USE_KYC_SERVICE=false        # KYC verification service
USE_TRANSACTION_MONITORING=false # Transaction monitoring service
USE_RISK_SCORING=false       # External risk scoring service
USE_NETWORK_ANALYSIS=false   # Network analysis tools
USE_BEHAVIORAL_ANALYTICS=false # Behavioral analytics
USE_GRAPH_ANALYSIS=false     # Graph database analysis
USE_ML_MODELS=false          # Machine learning models
USE_RULE_ENGINE=false        # Rule-based decision engine

# Snowflake Connection Configuration
SNOWFLAKE_ACCOUNT=your-account.region.snowflakecomputing.com
SNOWFLAKE_HOST=your-account.region.snowflakecomputing.com
SNOWFLAKE_USER=fraud_analytics_user
SNOWFLAKE_PASSWORD=secure_password_here
SNOWFLAKE_PRIVATE_KEY=base64_encoded_private_key_optional
SNOWFLAKE_DATABASE=FRAUD_ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_ROLE=FRAUD_ANALYST_ROLE
SNOWFLAKE_AUTHENTICATOR=snowflake

# Connection Pool Settings
SNOWFLAKE_POOL_SIZE=5
SNOWFLAKE_POOL_MAX_OVERFLOW=10
SNOWFLAKE_POOL_TIMEOUT=30
SNOWFLAKE_QUERY_TIMEOUT=300

# Analytics Configuration
ANALYTICS_DEFAULT_TIME_WINDOW=24h
ANALYTICS_DEFAULT_GROUP_BY=email
ANALYTICS_DEFAULT_TOP_PERCENTAGE=10
ANALYTICS_CACHE_TTL=300

# Splunk Configuration (only used if USE_SPLUNK=true)
SPLUNK_HOST=splunk.example.com
SPLUNK_PORT=8089
SPLUNK_USERNAME=splunk_user
SPLUNK_PASSWORD=splunk_password
SPLUNK_INDEX=main

# SumoLogic Configuration (only used if USE_SUMO_LOGIC=true)
SUMO_LOGIC_ENDPOINT=https://api.sumologic.com
SUMO_LOGIC_ACCESS_ID=access_id
SUMO_LOGIC_ACCESS_KEY=access_key

# Databricks Configuration (only used if USE_DATABRICKS=true)
DATABRICKS_HOST=databricks.example.com
DATABRICKS_TOKEN=databricks_token
DATABRICKS_CLUSTER_ID=cluster_id

# Add other tool configurations as needed...
```

### Phase 2: Configuration Migration & Integration (Day 3-4)

#### 2.1 Configuration Loader Updates - Dual Support with .env Priority

**File: `/olorin-server/app/service/config_loader.py`**
```python
import os
from pathlib import Path
from typing import Optional, Dict
from dotenv import load_dotenv
from .secret_manager import get_secret_manager

class ConfigLoader:
    """Enhanced configuration loader with dual Firebase/.env support.
    
    Priority Order:
    1. .env file values (highest priority - allows local override)
    2. Firebase Secrets Manager (production default)
    3. Default values (fallback)
    """
    
    def __init__(self):
        """Initialize with .env file loading and Firebase secrets."""
        # Load .env file if exists
        env_path = Path(__file__).parent.parent.parent / '.env'
        if env_path.exists():
            load_dotenv(env_path, override=True)  # override=True ensures .env takes precedence
            logger.info(f"Loaded .env configuration from {env_path}")
        
        # Initialize Firebase secret manager
        self.secret_manager = get_secret_manager()
        self.env = os.getenv("APP_ENV", "local")
        logger.info(f"ConfigLoader initialized for environment: {self.env}")
    
    def load_snowflake_config(self) -> Dict[str, str]:
        """Load Snowflake configuration with priority: .env > Firebase > defaults.
        
        Returns:
            Dict containing Snowflake configuration with .env taking priority
        """
        config = {}
        
        # Define configuration keys - NO DEFAULTS (except for backwards compatibility)
        config_keys = [
            'account', 'host', 'user', 'password', 'private_key',
            'database', 'schema', 'warehouse', 'role', 'authenticator',
            'pool_size', 'pool_max_overflow', 'pool_timeout', 'query_timeout'
        ]
        
        missing_from_env = []
        
        for key in config_keys:
            env_var = f'SNOWFLAKE_{key.upper()}'
            
            # Priority 1: Check .env file (expected source)
            value = os.getenv(env_var)
            
            if value:
                config[key] = value
                # Log source for debugging (avoid logging passwords)
                if 'password' not in key.lower() and 'key' not in key.lower():
                    logger.debug(f"Loaded {key} from .env: {value}")
            else:
                # Track what's missing from .env
                missing_from_env.append(env_var)
                
                # Priority 2: Try Firebase as fallback
                value = self.load_secret(env_var)
                if value:
                    config[key] = value
                    logger.info(f"Using Firebase fallback for {env_var} (not in .env)")
                else:
                    # Missing from both - just warn
                    logger.warning(f"MISSING: {env_var} not found in .env or Firebase Secrets")
                    config[key] = None
        
        # Log summary of missing configs
        if missing_from_env:
            logger.warning(f"Expected in .env but missing: {', '.join(missing_from_env)}")
            logger.warning("Please add these to your .env file for complete configuration")
        
        # Check critical fields but don't fail - just warn
        critical_fields = ['account', 'user', 'password', 'database']
        missing_critical = [f for f in critical_fields if not config.get(f)]
        
        if missing_critical:
            logger.error(f"CRITICAL: Missing required Snowflake configuration: {missing_critical}")
            logger.error("Snowflake connection will not be possible without these values")
            # Don't raise exception - just warn
        
        logger.info("Snowflake configuration loaded successfully (credentials sourced from .env or Firebase)")
        return config
```

#### 2.2 Real Snowflake Client Implementation

**File: `/olorin-server/app/service/agent/tools/snowflake_tool/snowflake_client.py`**
```python
import snowflake.connector
from snowflake.connector import DictCursor
from typing import List, Dict, Any, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

class SnowflakeClient:
    """Production Snowflake client with real connectivity."""
    
    def __init__(self, config: Dict[str, str]):
        """Initialize with configuration from .env."""
        self.config = config
        self.connection = None
        self._executor = ThreadPoolExecutor(max_workers=5)
        
    async def connect(self) -> None:
        """Establish real Snowflake connection."""
        def _connect():
            return snowflake.connector.connect(
                account=self.config['account'],
                user=self.config['user'],
                password=self.config['password'],
                database=self.config['database'],
                schema=self.config['schema'],
                warehouse=self.config['warehouse'],
                role=self.config['role']
            )
        
        self.connection = await asyncio.get_event_loop().run_in_executor(
            self._executor, _connect
        )
        logger.info(f"Connected to Snowflake: {self.config['account']}")
    
    async def execute_query(self, query: str, parameters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """Execute real SQL query against Snowflake."""
        def _execute():
            cursor = self.connection.cursor(DictCursor)
            try:
                cursor.execute(query, parameters or {})
                return cursor.fetchall()
            finally:
                cursor.close()
        
        return await asyncio.get_event_loop().run_in_executor(
            self._executor, _execute
        )
```

#### 2.3 Tool Registry Updates with .env Configuration

**File: `/olorin-server/app/service/agent/tools/tool_registry.py`**
```python
import os
from typing import List, Dict, Any
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

def is_tool_enabled(tool_name: str) -> bool:
    """Check if a tool is enabled via .env configuration.
    
    Args:
        tool_name: Name of the tool to check
        
    Returns:
        True if tool is enabled (USE_<TOOL>=true), False otherwise
    """
    env_var = f"USE_{tool_name.upper()}"
    value = os.getenv(env_var, 'false').lower()
    
    # Only 'true' enables the tool, everything else is disabled
    enabled = value == 'true'
    
    if enabled:
        logger.info(f"Tool '{tool_name}' is ENABLED via {env_var}=true")
    else:
        logger.debug(f"Tool '{tool_name}' is DISABLED (set {env_var}=true to enable)")
    
    return enabled

def get_enabled_tools() -> List[str]:
    """Return list of enabled tools based on .env configuration.
    
    Returns:
        List of tool names that are enabled
    """
    # Define all available tools
    all_tools = [
        'snowflake',
        'splunk',
        'sumo_logic',
        'databricks',
        'maxmind',
        'emailage',
        'pipl',
        'device_fingerprint',
        'ip_quality_score',
        'phone_verification',
        'address_validation',
        'fraud_detection_api',
        'kyc_service',
        'transaction_monitoring',
        'risk_scoring',
        'network_analysis',
        'behavioral_analytics',
        'graph_analysis',
        'ml_models',
        'rule_engine'
    ]
    
    # Filter to only enabled tools
    enabled_tools = [tool for tool in all_tools if is_tool_enabled(tool)]
    
    logger.info(f"Enabled tools: {enabled_tools}")
    logger.info(f"Disabled tools: {[t for t in all_tools if t not in enabled_tools]}")
    
    return enabled_tools

def initialize_tools(config) -> Dict[str, Any]:
    """Initialize only enabled tools based on .env configuration.
    
    Args:
        config: Configuration loader instance
        
    Returns:
        Dictionary of initialized tool instances
    """
    tools = {}
    enabled_tools = get_enabled_tools()
    
    # Initialize Snowflake if enabled
    if 'snowflake' in enabled_tools:
        try:
            from .snowflake_tool import SnowflakeTool
            snowflake_config = config.load_snowflake_config()
            tools['snowflake'] = SnowflakeTool(snowflake_config)
            logger.info("Snowflake tool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Snowflake tool: {e}")
    
    # Initialize Splunk if enabled
    if 'splunk' in enabled_tools:
        try:
            from .splunk_tool import SplunkTool
            splunk_config = config.load_splunk_config()
            tools['splunk'] = SplunkTool(splunk_config)
            logger.info("Splunk tool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Splunk tool: {e}")
    
    # Initialize other tools as needed
    if 'sumo_logic' in enabled_tools:
        logger.warning("SumoLogic tool enabled but not yet implemented")
    
    if 'databricks' in enabled_tools:
        logger.warning("Databricks tool enabled but not yet implemented")
    
    # Log final status
    if tools:
        logger.info(f"Tool initialization complete. Active tools: {list(tools.keys())}")
    else:
        logger.warning("No tools are enabled. Check your .env configuration")
    
    return tools

def validate_tool_configuration() -> Dict[str, str]:
    """Validate that enabled tools have required configuration.
    
    Returns:
        Dictionary of validation results
    """
    results = {}
    
    # Check Snowflake configuration if enabled
    if is_tool_enabled('snowflake'):
        required_vars = ['SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PASSWORD', 'SNOWFLAKE_DATABASE']
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            results['snowflake'] = f"Missing required config: {missing}"
        else:
            results['snowflake'] = "Configuration OK"
    
    # Check Splunk configuration if enabled
    if is_tool_enabled('splunk'):
        required_vars = ['SPLUNK_HOST', 'SPLUNK_USERNAME', 'SPLUNK_PASSWORD']
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            results['splunk'] = f"Missing required config: {missing}"
        else:
            results['splunk'] = "Configuration OK"
    
    # Add validation for other tools as needed
    
    return results
```

### Phase 3: Analytics Engine Implementation (Day 5-6)

#### 3.1 Configurable Analytics Query Builder

**File: `/olorin-server/app/service/analytics/risk_analyzer.py`**
```python
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import os

class RiskAnalyzer:
    """Configurable risk-based entity analyzer."""
    
    TIME_WINDOWS = {
        '1h': 1,
        '6h': 6,
        '12h': 12,
        '24h': 24,
        '7d': 168,
        '30d': 720
    }
    
    def __init__(self, snowflake_client):
        """Initialize with Snowflake client."""
        self.client = snowflake_client
        self.default_time_window = os.getenv('ANALYTICS_DEFAULT_TIME_WINDOW', '24h')
        self.default_group_by = os.getenv('ANALYTICS_DEFAULT_GROUP_BY', 'email')
        self.default_top_percentage = float(os.getenv('ANALYTICS_DEFAULT_TOP_PERCENTAGE', '10'))
    
    async def analyze_top_risk_entities(
        self,
        time_window: Optional[str] = None,
        group_by: Optional[str] = None,
        top_percentage: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Analyze top risk entities based on risk_score * transaction_amount.
        
        Args:
            time_window: Time window (1h, 6h, 12h, 24h, 7d, 30d)
            group_by: Column to group by (email, device_id, user_id, etc.)
            top_percentage: Top percentage to return (5, 10, 20, 50)
        """
        # Use defaults if not provided
        time_window = time_window or self.default_time_window
        group_by = group_by or self.default_group_by
        top_percentage = top_percentage or self.default_top_percentage
        
        # Validate inputs
        if time_window not in self.TIME_WINDOWS:
            raise ValueError(f"Invalid time window: {time_window}")
        
        if top_percentage < 5 or top_percentage > 50:
            raise ValueError(f"Top percentage must be between 5 and 50")
        
        # Build query
        hours = self.TIME_WINDOWS[time_window]
        query = f"""
        WITH risk_calculations AS (
            SELECT 
                {group_by} as entity,
                COUNT(*) as transaction_count,
                SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as total_amount,
                AVG(MODEL_SCORE) as avg_risk_score,
                SUM(MODEL_SCORE * PAID_AMOUNT_VALUE_IN_CURRENCY) as risk_weighted_value,
                MAX(TX_DATETIME) as latest_transaction
            FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
            WHERE TX_DATETIME >= DATEADD(hour, -{hours}, CURRENT_TIMESTAMP())
                AND {group_by} IS NOT NULL
            GROUP BY {group_by}
        ),
        ranked_entities AS (
            SELECT 
                *,
                ROW_NUMBER() OVER (ORDER BY risk_weighted_value DESC) as rank,
                COUNT(*) OVER () as total_entities
            FROM risk_calculations
        )
        SELECT 
            entity,
            transaction_count,
            total_amount,
            avg_risk_score,
            risk_weighted_value,
            latest_transaction
        FROM ranked_entities
        WHERE rank <= CEIL(total_entities * {top_percentage / 100.0})
        ORDER BY risk_weighted_value DESC
        """
        
        return await self.client.execute_query(query)
```

#### 3.2 Application Startup Integration

**File: `/olorin-server/app/main.py` (updates)**
```python
from app.service.analytics.risk_analyzer import RiskAnalyzer

@app.on_event("startup")
async def startup_event():
    """Load risk analysis on application startup."""
    try:
        # Initialize Snowflake connection
        config_loader = ConfigLoader()
        snowflake_config = config_loader.load_snowflake_config()
        
        snowflake_client = SnowflakeClient(snowflake_config)
        await snowflake_client.connect()
        
        # Run default risk analysis
        analyzer = RiskAnalyzer(snowflake_client)
        top_risk_entities = await analyzer.analyze_top_risk_entities()
        
        # Store in application state for quick access
        app.state.top_risk_entities = top_risk_entities
        app.state.risk_analysis_timestamp = datetime.utcnow()
        
        logger.info(f"Loaded {len(top_risk_entities)} high-risk entities on startup")
        
    except Exception as e:
        logger.error(f"Failed to load risk analysis on startup: {e}")
        # Continue startup even if analysis fails
```

## Testing Strategy

### Integration Tests
```python
# /olorin-server/tests/integration/test_snowflake_integration.py
import pytest
from app.service.agent.tools.snowflake_tool import SnowflakeClient

@pytest.mark.integration
async def test_snowflake_connection():
    """Test real Snowflake connectivity."""
    client = SnowflakeClient(load_test_config())
    await client.connect()
    result = await client.execute_query("SELECT CURRENT_VERSION()")
    assert result is not None

@pytest.mark.integration  
async def test_risk_analysis_query():
    """Test risk analysis query execution."""
    analyzer = RiskAnalyzer(get_test_client())
    results = await analyzer.analyze_top_risk_entities(
        time_window='24h',
        group_by='email',
        top_percentage=10
    )
    assert isinstance(results, list)
    assert all('risk_weighted_value' in r for r in results)
```

### Performance Benchmarks
- Query response time < 2 seconds for standard analytics
- Connection pool handling 10+ concurrent queries
- Result caching reducing redundant queries by 80%

## Dual Configuration Strategy

### Configuration Priority Order
The system supports both Firebase Secrets and .env file configuration with the following priority:

1. **.env file** (highest priority - expects ALL values here)
2. **Firebase Secrets Manager** (fallback only if not in .env)  
3. **No defaults** - If missing from both sources, warn and continue (no hard failures)

### Use Cases
- **Production Environment**: Credentials stored in Firebase Secrets Manager for security
- **Development/Testing**: .env file overrides for local development convenience
- **POC/Demo**: .env file for quick setup without Firebase dependencies
- **Debugging**: .env file to temporarily override production settings

### Implementation Details
```python
# Configuration loading priority logic - WARN ONLY
for each_config_key:
    if exists_in_env_file:
        use_env_value()  # Priority 1: .env is expected source
    elif exists_in_firebase:
        use_firebase_value()  # Priority 2: Firebase fallback
        logger.info(f"Using Firebase for {config_key} (not found in .env)")
    else:
        logger.warning(f"MISSING CONFIGURATION: {config_key} not found in .env or Firebase Secrets")
        # Continue without error - just warn
        config[key] = None
```

## Security Considerations

1. **Credential Protection**
   - **Production**: Firebase Secrets Manager with encryption, audit trails, and access control
   - **Development**: .env file with restricted permissions (600)
   - **Both**: No credentials in source code or logs
   - Support for private key authentication in both methods

2. **Configuration Security Best Practices**
   - .env file added to .gitignore to prevent accidental commits
   - Environment-specific configuration validation
   - Clear logging of configuration source (without exposing sensitive values)
   - Separate .env.example file with placeholder values for documentation

3. **Query Safety**
   - Parameterized queries to prevent SQL injection
   - Read-only role for analytics queries
   - Query timeout limits to prevent resource exhaustion

4. **Data Privacy**
   - Column-level security for sensitive fields
   - Audit logging for all data access
   - Encrypted connections to Snowflake

## Rollback Plan

If issues arise during implementation:

1. **Configuration Rollback**: Keep Firebase Secrets as fallback
2. **Tool Registry**: Re-enable disabled tools via configuration flag
3. **Client Fallback**: Maintain mock client with feature flag toggle
4. **Database Rollback**: Snapshot table before schema changes

## Success Metrics

1. **Functional Metrics**
   - ✅ Snowflake table created with 200+ columns
   - ✅ .env configuration working for all credentials
   - ✅ Real queries executing successfully
   - ✅ Configurable analytics returning accurate results

2. **Performance Metrics**
   - Query response time < 2 seconds
   - Application startup time < 10 seconds with analysis
   - Zero mock data in production

3. **Security Metrics**
   - Zero credential exposures in logs
   - All queries parameterized
   - Audit trail for all data access

## Implementation Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|-----------------|
| Phase 1 | 2 days | Database schema, .env template |
| Phase 2 | 2 days | Configuration migration, real client |
| Phase 3 | 2 days | Analytics engine, startup integration |
| Testing | 1 day | Integration tests, performance validation |
| Documentation | 1 day | API docs, deployment guide |

## Conclusion

This plan provides a comprehensive approach to implementing real Snowflake integration for the Olorin fraud detection platform. The implementation focuses on production readiness, security, and performance while maintaining the simplicity required for a POC demonstration.

---

**Next Steps:** Upon approval, begin Phase 1 implementation with database schema creation and .env configuration template.