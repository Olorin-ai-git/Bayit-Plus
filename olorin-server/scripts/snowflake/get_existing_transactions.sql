-- ============================================================================
-- Retrieve Existing Real Transactions from TRANSACTIONS_ENRICHED
-- ============================================================================
-- This query retrieves actual existing transaction data
-- NO data generation or manipulation - returns REAL data only
-- ============================================================================
-- SCHEMA COMPLIANCE: All columns verified against snowflake_setup.sql schema
-- Last verified: 2025-11-08
-- ============================================================================

-- Get the most recent 10,000 transactions from the existing table
SELECT
    -- Transaction Identifiers (schema: TX_ID_KEY is PRIMARY KEY)
    TX_ID_KEY,
    TX_DATETIME,

    -- User Information (schema: lines 84-95)
    EMAIL,
    USER_ID,
    USER_ACCOUNT_AGE_DAYS,

    -- Payment Information (schema: lines 98-107)
    PAID_AMOUNT_VALUE,
    PAID_AMOUNT_VALUE_IN_CURRENCY,
    PAID_CURRENCY,
    PAYMENT_METHOD,

    -- Merchant Information (schema: lines 160-170)
    MERCHANT_NAME,
    MERCHANT_CATEGORY,

    -- Device & Browser Information (schema: lines 123-138)
    DEVICE_ID,
    DEVICE_TYPE,
    DEVICE_OS,
    BROWSER_NAME,
    DEVICE_FINGERPRINT,

    -- Network & IP Information (schema: lines 142-157)
    IP,
    IP_COUNTRY,
    IP_CITY,
    IP_LATITUDE,
    IP_LONGITUDE,

    -- Fraud Scoring & Models (schema: lines 185-193)
    MODEL_SCORE,

    -- Fraud Indicators & FLAGS (schema: lines 196-205)
    IS_FRAUD_TX,
    FRAUD_TYPE,

    -- Velocity & Behavioral Metrics (schema: lines 238-251)
    TX_COUNT_1H,
    TX_COUNT_24H,

    -- Additional Behavioral Flags (schema: none - removed invalid columns)
    -- Note: UNUSUAL_TIME, UNUSUAL_LOCATION, NEW_DEVICE do not exist in schema

    -- Record Metadata (schema: lines 380-381)
    CREATED_AT

FROM DBT.DBT_PROD.TXS
ORDER BY TX_DATETIME DESC
LIMIT 10000;

-- ============================================================================
-- Query complete! Returns up to 10,000 REAL existing transactions
-- Sorted by most recent first
-- All columns verified against authoritative schema in snowflake_setup.sql
-- ============================================================================
