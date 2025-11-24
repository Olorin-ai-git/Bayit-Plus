-- ============================================================================
-- Fraud Detection Dataset Generator - Using Real Merchants from Existing Data
-- ============================================================================
-- This query generates synthetic fraud detection dataset using actual
-- merchants and categories from the existing TRANSACTIONS_ENRICHED table
-- Returns 10,000 transaction records with fraud detection features
-- ============================================================================
-- SCHEMA COMPLIANCE: All columns verified against snowflake_setup.sql schema
-- Last verified: 2025-11-08
-- ============================================================================

WITH
-- Get actual merchants from existing table
existing_merchants AS (
    SELECT DISTINCT
        MERCHANT_NAME,
        MERCHANT_CATEGORY
    FROM DBT.DBT_PROD.TXS
    WHERE MERCHANT_NAME IS NOT NULL
    LIMIT 100  -- Get top 100 merchants to use
),

-- Create an indexed list of merchants for random selection
indexed_merchants AS (
    SELECT
        MERCHANT_NAME,
        MERCHANT_CATEGORY,
        ROW_NUMBER() OVER (ORDER BY MERCHANT_NAME) - 1 AS merchant_index
    FROM existing_merchants
),

-- Store merchant count for random selection
merchant_count AS (
    SELECT COUNT(*) AS total_merchants
    FROM indexed_merchants
),

-- Generate base transaction records
base_transactions AS (
    SELECT
        ROW_NUMBER() OVER (ORDER BY SEQ4()) AS row_num,
        UNIFORM(1, 10000, RANDOM()) AS user_num,
        DATEADD(HOUR, -UNIFORM(1, 720, RANDOM()), CURRENT_TIMESTAMP()) AS tx_time,
        (SELECT total_merchants FROM merchant_count) AS merchant_count
    FROM TABLE(GENERATOR(ROWCOUNT => 10000))
),

-- User information
users AS (
    SELECT
        row_num,
        user_num,
        tx_time,
        merchant_count,
        CONCAT('user', user_num, '@example.com') AS email,
        CONCAT('USR', LPAD(user_num::VARCHAR, 6, '0')) AS user_id,
        UNIFORM(1, 3650, RANDOM()) AS account_age_days
    FROM base_transactions
),

-- Transaction amounts and types with real merchants
transactions AS (
    SELECT
        u.*,
        CASE
            WHEN UNIFORM(1, 100, RANDOM()) <= 5 THEN UNIFORM(5000, 50000, RANDOM())
            WHEN UNIFORM(1, 100, RANDOM()) <= 20 THEN UNIFORM(1000, 5000, RANDOM())
            ELSE UNIFORM(10, 1000, RANDOM())
        END AS amount,
        ARRAY_CONSTRUCT('USD', 'EUR', 'GBP', 'CAD', 'AUD')[UNIFORM(0, 4, RANDOM())]::VARCHAR AS currency,
        ARRAY_CONSTRUCT('CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'WIRE_TRANSFER', 'CRYPTO')[UNIFORM(0, 4, RANDOM())]::VARCHAR AS payment_type,
        -- Select random merchant from the indexed list
        UNIFORM(0, u.merchant_count - 1, RANDOM()) AS selected_merchant_index
    FROM users u
),

-- Join with actual merchants
transactions_with_merchants AS (
    SELECT
        t.*,
        m.MERCHANT_NAME,
        m.MERCHANT_CATEGORY
    FROM transactions t
    LEFT JOIN indexed_merchants m ON m.merchant_index = t.selected_merchant_index
),

-- Device information
devices AS (
    SELECT
        t.*,
        CONCAT('DEV', LPAD(UNIFORM(1, 5000, RANDOM())::VARCHAR, 6, '0')) AS device_id,
        ARRAY_CONSTRUCT('Desktop', 'Mobile', 'Tablet', 'SmartTV')[UNIFORM(0, 3, RANDOM())]::VARCHAR AS device_type,
        ARRAY_CONSTRUCT('Windows', 'macOS', 'iOS', 'Android', 'Linux')[UNIFORM(0, 4, RANDOM())]::VARCHAR AS device_os,
        ARRAY_CONSTRUCT('Chrome', 'Safari', 'Firefox', 'Edge', 'Opera')[UNIFORM(0, 4, RANDOM())]::VARCHAR AS browser
    FROM transactions_with_merchants t
),

-- Location information
locations AS (
    SELECT
        d.*,
        CONCAT(
            UNIFORM(1, 255, RANDOM()), '.',
            UNIFORM(0, 255, RANDOM()), '.',
            UNIFORM(0, 255, RANDOM()), '.',
            UNIFORM(1, 254, RANDOM())
        ) AS ip,
        ARRAY_CONSTRUCT('USA', 'UK', 'Canada', 'Germany', 'France', 'Australia', 'Japan', 'Brazil')[UNIFORM(0, 7, RANDOM())]::VARCHAR AS country,
        ARRAY_CONSTRUCT(
            'New York', 'London', 'Toronto', 'Berlin', 'Paris',
            'Sydney', 'Tokyo', 'São Paulo', 'Los Angeles', 'Chicago'
        )[UNIFORM(0, 9, RANDOM())]::VARCHAR AS city,
        UNIFORM(-90000000, 90000000, RANDOM()) / 1000000.0 AS lat,
        UNIFORM(-180000000, 180000000, RANDOM()) / 1000000.0 AS lon
    FROM devices d
),

-- Risk scoring and fraud labels
risk_scored AS (
    SELECT
        l.*,
        -- Base risk score
        CASE
            WHEN l.amount > 10000 THEN UNIFORM(60, 95, RANDOM())
            WHEN l.amount > 5000 THEN UNIFORM(40, 75, RANDOM())
            WHEN HOUR(l.tx_time) BETWEEN 0 AND 5 THEN UNIFORM(30, 60, RANDOM())
            ELSE UNIFORM(0, 50, RANDOM())
        END AS base_risk_score,

        -- Fraud determination (5% fraud rate)
        UNIFORM(1, 100, RANDOM()) <= 5 AS is_fraudulent,

        -- Behavioral indicators
        UNIFORM(0, 20, RANDOM()) AS velocity_1h,
        UNIFORM(0, 100, RANDOM()) AS velocity_24h
    FROM locations l
),

-- Final enriched data with fraud types
enriched AS (
    SELECT
        r.*,
        CASE
            WHEN r.is_fraudulent THEN r.base_risk_score + UNIFORM(10, 30, RANDOM())
            ELSE r.base_risk_score
        END AS final_risk_score,

        CASE
            WHEN r.is_fraudulent THEN
                ARRAY_CONSTRUCT(
                    'Account Takeover',
                    'Card Not Present',
                    'Identity Theft',
                    'Synthetic Identity',
                    'Payment Fraud'
                )[UNIFORM(0, 4, RANDOM())]::VARCHAR
            ELSE NULL
        END AS fraud_category
    FROM risk_scored r
)

-- Final SELECT with all fields - SCHEMA COMPLIANT
SELECT
    -- Transaction Identifiers (schema: TX_ID_KEY is PRIMARY KEY)
    CONCAT('TXN', LPAD(row_num::VARCHAR, 10, '0')) AS TX_ID_KEY,
    tx_time AS TX_DATETIME,

    -- User Information (schema: lines 84-95)
    email AS EMAIL,
    user_id AS USER_ID,
    account_age_days AS USER_ACCOUNT_AGE_DAYS,

    -- Payment Information (schema: lines 98-107)
    amount AS PAID_AMOUNT_VALUE,
    amount AS PAID_AMOUNT_VALUE_IN_CURRENCY,
    currency AS PAID_CURRENCY,
    payment_type AS PAYMENT_METHOD,

    -- Merchant Information (schema: lines 160-170)
    MERCHANT_NAME,
    MERCHANT_CATEGORY,

    -- Device & Browser Information (schema: lines 123-138)
    device_id AS DEVICE_ID,
    device_type AS DEVICE_TYPE,
    device_os AS DEVICE_OS,
    browser AS BROWSER_NAME,
    MD5(CONCAT(device_id, device_type, device_os, browser)) AS DEVICE_FINGERPRINT,

    -- Network & IP Information (schema: lines 142-157)
    ip AS IP,
    country AS IP_COUNTRY,
    city AS IP_CITY,
    lat AS IP_LATITUDE,
    lon AS IP_LONGITUDE,

    -- Fraud Scoring & Models (schema: lines 185-193)
    ROUND(final_risk_score, 2) AS MODEL_SCORE,

    -- Fraud Indicators & FLAGS (schema: lines 196-205)
    is_fraudulent::NUMBER(1,0) AS IS_FRAUD_TX,
    fraud_category AS FRAUD_TYPE,

    -- Velocity & Behavioral Metrics (schema: lines 238-251)
    velocity_1h AS TX_COUNT_1H,
    velocity_24h AS TX_COUNT_24H,

    -- Record Metadata (schema: lines 380-381)
    CURRENT_TIMESTAMP() AS CREATED_AT

FROM enriched
ORDER BY tx_time DESC;

-- ============================================================================
-- Query complete! Returns 10,000 synthetic fraud detection records
-- Using actual merchants and categories from existing TRANSACTIONS_ENRICHED
-- All columns verified against authoritative schema in snowflake_setup.sql
-- ============================================================================
