-- ============================================================================
-- Fraud Detection Dataset Generator for Snowflake
-- ============================================================================
-- This script creates a realistic fraud detection dataset with:
-- - Transaction records
-- - Device fingerprints
-- - Location data
-- - User behavior patterns
-- - Risk scores and labels
-- ============================================================================

-- Create database and schema if they don't exist
CREATE DATABASE IF NOT EXISTS FRAUD_DETECTION;
USE DATABASE FRAUD_DETECTION;
CREATE SCHEMA IF NOT EXISTS DEMO;
USE SCHEMA DEMO;

-- ============================================================================
-- TABLE 1: TRANSACTIONS_ENRICHED
-- Main transaction table with enriched fraud detection features
-- ============================================================================

CREATE OR REPLACE TABLE TRANSACTIONS_ENRICHED (
    -- Transaction identifiers
    TRANSACTION_ID VARCHAR(50) PRIMARY KEY,
    TX_DATETIME TIMESTAMP_NTZ,

    -- User information
    EMAIL VARCHAR(255),
    USER_ID VARCHAR(50),
    ACCOUNT_AGE_DAYS NUMBER(10,0),

    -- Transaction details
    PAID_AMOUNT_VALUE_IN_CURRENCY NUMBER(15,2),
    CURRENCY VARCHAR(3),
    TRANSACTION_TYPE VARCHAR(50),
    MERCHANT_NAME VARCHAR(255),
    MERCHANT_CATEGORY VARCHAR(100),

    -- Device information
    DEVICE_ID VARCHAR(100),
    DEVICE_TYPE VARCHAR(50),
    DEVICE_OS VARCHAR(50),
    DEVICE_BROWSER VARCHAR(50),
    DEVICE_FINGERPRINT VARCHAR(255),

    -- Location information
    IP_ADDRESS VARCHAR(45),
    COUNTRY VARCHAR(100),
    CITY VARCHAR(100),
    LATITUDE NUMBER(10,6),
    LONGITUDE NUMBER(10,6),

    -- Risk indicators
    MODEL_SCORE NUMBER(5,2),
    RISK_LEVEL VARCHAR(20),
    IS_FRAUD BOOLEAN,
    FRAUD_TYPE VARCHAR(50),

    -- Behavioral features
    TRANSACTION_VELOCITY_1H NUMBER(10,0),
    TRANSACTION_VELOCITY_24H NUMBER(10,0),
    UNUSUAL_TIME BOOLEAN,
    UNUSUAL_LOCATION BOOLEAN,
    NEW_DEVICE BOOLEAN,

    -- Additional metadata
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================================
-- Generate realistic transaction data
-- ============================================================================

INSERT INTO TRANSACTIONS_ENRICHED
WITH
-- Generate base transaction records
base_transactions AS (
    SELECT
        ROW_NUMBER() OVER (ORDER BY SEQ4()) AS row_num,
        UNIFORM(1, 10000, RANDOM()) AS user_num,
        DATEADD(HOUR, -UNIFORM(1, 720, RANDOM()), CURRENT_TIMESTAMP()) AS tx_time
    FROM TABLE(GENERATOR(ROWCOUNT => 10000))
),

-- User information
users AS (
    SELECT
        row_num,
        user_num,
        tx_time,
        CONCAT('user', user_num, '@example.com') AS email,
        CONCAT('USR', LPAD(user_num::VARCHAR, 6, '0')) AS user_id,
        UNIFORM(1, 3650, RANDOM()) AS account_age_days
    FROM base_transactions
),

-- Transaction amounts and types
transactions AS (
    SELECT
        u.*,
        CASE
            WHEN UNIFORM(1, 100, RANDOM()) <= 5 THEN UNIFORM(5000, 50000, RANDOM())
            WHEN UNIFORM(1, 100, RANDOM()) <= 20 THEN UNIFORM(1000, 5000, RANDOM())
            ELSE UNIFORM(10, 1000, RANDOM())
        END AS amount,
        ARRAY_CONSTRUCT('USD', 'EUR', 'GBP', 'CAD', 'AUD')[UNIFORM(0, 4, RANDOM())]::VARCHAR AS currency,
        ARRAY_CONSTRUCT('PURCHASE', 'TRANSFER', 'WITHDRAWAL', 'DEPOSIT', 'PAYMENT')[UNIFORM(0, 4, RANDOM())]::VARCHAR AS tx_type,
        ARRAY_CONSTRUCT(
            'Amazon', 'Walmart', 'Best Buy', 'Target', 'Apple Store',
            'GameStop', 'Steam', 'Netflix', 'Spotify', 'Uber'
        )[UNIFORM(0, 9, RANDOM())]::VARCHAR AS merchant
    FROM users u
),

-- Device information
devices AS (
    SELECT
        t.*,
        CONCAT('DEV', LPAD(UNIFORM(1, 5000, RANDOM())::VARCHAR, 6, '0')) AS device_id,
        ARRAY_CONSTRUCT('Desktop', 'Mobile', 'Tablet', 'SmartTV')[UNIFORM(0, 3, RANDOM())]::VARCHAR AS device_type,
        ARRAY_CONSTRUCT('Windows', 'macOS', 'iOS', 'Android', 'Linux')[UNIFORM(0, 4, RANDOM())]::VARCHAR AS device_os,
        ARRAY_CONSTRUCT('Chrome', 'Safari', 'Firefox', 'Edge', 'Opera')[UNIFORM(0, 4, RANDOM())]::VARCHAR AS browser
    FROM transactions t
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
        UNIFORM(0, 100, RANDOM()) AS velocity_24h,
        HOUR(l.tx_time) BETWEEN 0 AND 5 AS unusual_time_flag,
        UNIFORM(1, 100, RANDOM()) <= 10 AS unusual_location_flag,
        UNIFORM(1, 100, RANDOM()) <= 15 AS new_device_flag
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

-- Final SELECT with all fields
SELECT
    CONCAT('TXN', LPAD(row_num::VARCHAR, 10, '0')) AS TRANSACTION_ID,
    tx_time AS TX_DATETIME,
    email AS EMAIL,
    user_id AS USER_ID,
    account_age_days AS ACCOUNT_AGE_DAYS,
    amount AS PAID_AMOUNT_VALUE_IN_CURRENCY,
    currency AS CURRENCY,
    tx_type AS TRANSACTION_TYPE,
    merchant AS MERCHANT_NAME,
    CASE
        WHEN merchant IN ('Amazon', 'Walmart', 'Best Buy', 'Target') THEN 'Retail'
        WHEN merchant IN ('Apple Store', 'GameStop', 'Steam') THEN 'Electronics'
        WHEN merchant IN ('Netflix', 'Spotify') THEN 'Subscription'
        ELSE 'Services'
    END AS MERCHANT_CATEGORY,
    device_id AS DEVICE_ID,
    device_type AS DEVICE_TYPE,
    device_os AS DEVICE_OS,
    browser AS DEVICE_BROWSER,
    MD5(CONCAT(device_id, device_type, device_os, browser)) AS DEVICE_FINGERPRINT,
    ip AS IP_ADDRESS,
    country AS COUNTRY,
    city AS CITY,
    lat AS LATITUDE,
    lon AS LONGITUDE,
    ROUND(final_risk_score, 2) AS MODEL_SCORE,
    CASE
        WHEN final_risk_score >= 80 THEN 'CRITICAL'
        WHEN final_risk_score >= 60 THEN 'HIGH'
        WHEN final_risk_score >= 40 THEN 'MEDIUM'
        ELSE 'LOW'
    END AS RISK_LEVEL,
    is_fraudulent AS IS_FRAUD,
    fraud_category AS FRAUD_TYPE,
    velocity_1h AS TRANSACTION_VELOCITY_1H,
    velocity_24h AS TRANSACTION_VELOCITY_24H,
    unusual_time_flag AS UNUSUAL_TIME,
    unusual_location_flag AS UNUSUAL_LOCATION,
    new_device_flag AS NEW_DEVICE,
    CURRENT_TIMESTAMP() AS CREATED_AT
FROM enriched;

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

-- Index on email for user lookups
CREATE INDEX IF NOT EXISTS idx_email ON TRANSACTIONS_ENRICHED(EMAIL);

-- Index on transaction datetime for time-based queries
CREATE INDEX IF NOT EXISTS idx_tx_datetime ON TRANSACTIONS_ENRICHED(TX_DATETIME);

-- Index on risk score for filtering high-risk transactions
CREATE INDEX IF NOT EXISTS idx_model_score ON TRANSACTIONS_ENRICHED(MODEL_SCORE);

-- Index on fraud flag
CREATE INDEX IF NOT EXISTS idx_is_fraud ON TRANSACTIONS_ENRICHED(IS_FRAUD);

-- ============================================================================
-- Create summary views
-- ============================================================================

CREATE OR REPLACE VIEW FRAUD_SUMMARY AS
SELECT
    DATE_TRUNC('DAY', TX_DATETIME) AS transaction_date,
    COUNT(*) AS total_transactions,
    SUM(CASE WHEN IS_FRAUD THEN 1 ELSE 0 END) AS fraud_count,
    ROUND(SUM(CASE WHEN IS_FRAUD THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS fraud_rate_pct,
    SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) AS total_amount,
    SUM(CASE WHEN IS_FRAUD THEN PAID_AMOUNT_VALUE_IN_CURRENCY ELSE 0 END) AS fraud_amount,
    AVG(MODEL_SCORE) AS avg_risk_score
FROM TRANSACTIONS_ENRICHED
GROUP BY DATE_TRUNC('DAY', TX_DATETIME)
ORDER BY transaction_date DESC;

CREATE OR REPLACE VIEW HIGH_RISK_ENTITIES AS
SELECT
    EMAIL,
    COUNT(*) AS transaction_count,
    SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) AS total_amount,
    AVG(MODEL_SCORE) AS avg_risk_score,
    MAX(MODEL_SCORE) AS max_risk_score,
    SUM(CASE WHEN IS_FRAUD THEN 1 ELSE 0 END) AS fraud_count,
    SUM(CASE WHEN IS_FRAUD THEN PAID_AMOUNT_VALUE_IN_CURRENCY ELSE 0 END) AS fraud_amount
FROM TRANSACTIONS_ENRICHED
WHERE TX_DATETIME >= DATEADD(DAY, -30, CURRENT_TIMESTAMP())
GROUP BY EMAIL
HAVING AVG(MODEL_SCORE) >= 60
ORDER BY avg_risk_score DESC, transaction_count DESC;

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Total records count
SELECT 'Total Records' AS metric, COUNT(*) AS value FROM TRANSACTIONS_ENRICHED
UNION ALL
SELECT 'Fraud Records', COUNT(*) FROM TRANSACTIONS_ENRICHED WHERE IS_FRAUD
UNION ALL
SELECT 'High Risk Records', COUNT(*) FROM TRANSACTIONS_ENRICHED WHERE MODEL_SCORE >= 60
UNION ALL
SELECT 'Critical Risk Records', COUNT(*) FROM TRANSACTIONS_ENRICHED WHERE RISK_LEVEL = 'CRITICAL';

-- Sample high-risk transactions
SELECT
    TRANSACTION_ID,
    EMAIL,
    TX_DATETIME,
    PAID_AMOUNT_VALUE_IN_CURRENCY,
    MODEL_SCORE,
    RISK_LEVEL,
    IS_FRAUD,
    FRAUD_TYPE
FROM TRANSACTIONS_ENRICHED
WHERE MODEL_SCORE >= 70
ORDER BY MODEL_SCORE DESC
LIMIT 10;

-- ============================================================================
-- Grant permissions (adjust as needed)
-- ============================================================================

-- GRANT SELECT ON ALL TABLES IN SCHEMA DEMO TO ROLE ANALYST;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA DEMO TO ROLE ANALYST;

-- ============================================================================
-- Script complete!
-- ============================================================================

SELECT
    '✅ Dataset creation complete!' AS status,
    COUNT(*) AS total_records,
    SUM(CASE WHEN IS_FRAUD THEN 1 ELSE 0 END) AS fraud_records,
    ROUND(AVG(MODEL_SCORE), 2) AS avg_risk_score
FROM TRANSACTIONS_ENRICHED;
