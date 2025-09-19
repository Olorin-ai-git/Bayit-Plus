-- Snowflake Setup Script for Olorin POC
-- Author: Gil Klainert
-- Date: 2025-09-06
-- 
-- This script sets up the Snowflake database, table, and permissions
-- for the Olorin fraud detection platform POC.
--
-- Run this script as a Snowflake admin user before starting the application.

-- ============================================
-- 1. CREATE DATABASE AND SCHEMA
-- ============================================

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS FRAUD_ANALYTICS
    COMMENT = 'Olorin Fraud Detection Analytics Database';

-- Use the database
USE DATABASE FRAUD_ANALYTICS;

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS PUBLIC
    COMMENT = 'Public schema for fraud analytics tables';

USE SCHEMA PUBLIC;

-- ============================================
-- 2. CREATE WAREHOUSE (if needed)
-- ============================================

-- Create a warehouse for the Olorin user if it doesn't exist
CREATE WAREHOUSE IF NOT EXISTS COMPUTE_WH
    WITH 
    WAREHOUSE_SIZE = 'XSMALL'
    AUTO_SUSPEND = 60
    AUTO_RESUME = TRUE
    MIN_CLUSTER_COUNT = 1
    MAX_CLUSTER_COUNT = 1
    COMMENT = 'Warehouse for Olorin fraud analytics queries';

-- ============================================
-- 3. CREATE ROLE (if needed)
-- ============================================

-- Create a role for fraud analysts
CREATE ROLE IF NOT EXISTS FRAUD_ANALYST_ROLE
    COMMENT = 'Role for fraud detection analysts and applications';

-- ============================================
-- 4. CREATE THE TRANSACTIONS TABLE
-- ============================================

-- Drop table if you want to recreate it (BE CAREFUL - this deletes all data!)
-- DROP TABLE IF EXISTS TRANSACTIONS_ENRICHED;

-- Create the comprehensive transactions table with 300+ columns
CREATE TABLE IF NOT EXISTS TRANSACTIONS_ENRICHED (
    -- ==========================================
    -- RECORD METADATA
    -- ==========================================
    TABLE_RECORD_CREATED_AT TIMESTAMP_NTZ,
    TABLE_RECORD_UPDATED_AT TIMESTAMP_NTZ,
    
    -- ==========================================
    -- CORE TRANSACTION IDENTIFIERS
    -- ==========================================
    TX_ID_KEY VARCHAR(255) PRIMARY KEY,
    ORIGINAL_TX_ID VARCHAR(255),
    EVENT_TYPE VARCHAR(50),
    STORE_ID VARCHAR(100),
    CLIENT_REQUEST_ID VARCHAR(255),
    
    -- ==========================================
    -- TRANSACTION DETAILS
    -- ==========================================
    TX_DATETIME TIMESTAMP_NTZ NOT NULL,
    TX_DATE DATE,
    TX_HOUR NUMBER(2,0),
    TX_DAY_OF_WEEK VARCHAR(10),
    TX_MONTH NUMBER(2,0),
    TX_QUARTER NUMBER(1,0),
    
    -- ==========================================
    -- USER INFORMATION
    -- ==========================================
    USER_ID VARCHAR(255),
    EMAIL VARCHAR(255),
    FIRST_NAME VARCHAR(100),
    LAST_NAME VARCHAR(100),
    FULL_NAME VARCHAR(200),
    DATE_OF_BIRTH DATE,
    AGE NUMBER(3,0),
    GENDER VARCHAR(20),
    PHONE_NUMBER VARCHAR(50),
    PHONE_COUNTRY_CODE VARCHAR(10),
    
    -- ==========================================
    -- PAYMENT INFORMATION
    -- ==========================================
    PAID_AMOUNT_VALUE FLOAT NOT NULL,
    PAID_AMOUNT_VALUE_IN_CURRENCY FLOAT,
    PAID_CURRENCY VARCHAR(10),
    EXCHANGE_RATE FLOAT,
    PAYMENT_METHOD VARCHAR(50),
    PAYMENT_GATEWAY VARCHAR(100),
    PAYMENT_PROCESSOR VARCHAR(100),
    
    -- ==========================================
    -- CARD INFORMATION
    -- ==========================================
    CARD_BRAND VARCHAR(50),
    CARD_TYPE VARCHAR(50),
    CARD_CATEGORY VARCHAR(50),
    CARD_BIN VARCHAR(10),
    CARD_LAST_4 VARCHAR(4),
    CARD_EXPIRY_DATE VARCHAR(10),
    CARD_ISSUER_BANK VARCHAR(200),
    CARD_ISSUER_COUNTRY VARCHAR(100),
    IS_PREPAID_CARD BOOLEAN,
    IS_BUSINESS_CARD BOOLEAN,
    
    -- ==========================================
    -- DEVICE & BROWSER INFORMATION
    -- ==========================================
    DEVICE_ID VARCHAR(255),
    DEVICE_TYPE VARCHAR(50),
    DEVICE_MODEL VARCHAR(100),
    DEVICE_MANUFACTURER VARCHAR(100),
    DEVICE_OS VARCHAR(50),
    DEVICE_OS_VERSION VARCHAR(50),
    BROWSER_NAME VARCHAR(100),
    BROWSER_VERSION VARCHAR(50),
    USER_AGENT TEXT,
    SCREEN_RESOLUTION VARCHAR(20),
    DEVICE_FINGERPRINT VARCHAR(255),
    IS_MOBILE BOOLEAN,
    IS_TABLET BOOLEAN,
    IS_DESKTOP BOOLEAN,
    
    -- ==========================================
    -- NETWORK & IP INFORMATION
    -- ==========================================
    IP_COUNTRY VARCHAR(100),
    IP_CITY VARCHAR(100),
    IP_REGION VARCHAR(100),
    IP_POSTAL_CODE VARCHAR(20),
    IP_LATITUDE FLOAT,
    IP_LONGITUDE FLOAT,
    IP_ISP VARCHAR(200),
    IP_ORGANIZATION VARCHAR(200),
    IP_ASN VARCHAR(50),
    IS_VPN BOOLEAN,
    IS_PROXY BOOLEAN,
    IS_TOR BOOLEAN,
    IS_DATACENTER BOOLEAN,
    CONNECTION_TYPE VARCHAR(50),
    
    -- ==========================================
    -- MERCHANT INFORMATION
    -- ==========================================
    MERCHANT_ID VARCHAR(255),
    MERCHANT_NAME VARCHAR(255),
    MERCHANT_CATEGORY VARCHAR(100),
    MERCHANT_CATEGORY_CODE VARCHAR(10),
    MERCHANT_COUNTRY VARCHAR(100),
    MERCHANT_CITY VARCHAR(100),
    MERCHANT_POSTAL_CODE VARCHAR(20),
    MERCHANT_WEBSITE VARCHAR(500),
    MERCHANT_RISK_LEVEL VARCHAR(20),
    
    -- ==========================================
    -- PRODUCT/SERVICE INFORMATION
    -- ==========================================
    PRODUCT_SKU VARCHAR(100),
    PRODUCT_NAME VARCHAR(500),
    PRODUCT_CATEGORY VARCHAR(200),
    PRODUCT_QUANTITY NUMBER(10,0),
    PRODUCT_PRICE FLOAT,
    SERVICE_TYPE VARCHAR(100),
    SUBSCRIPTION_ID VARCHAR(255),
    IS_RECURRING BOOLEAN,
    
    -- ==========================================
    -- FRAUD SCORING & MODELS
    -- ==========================================
    MODEL_SCORE FLOAT,  -- Primary fraud risk score (0-1)
    MODEL_VERSION VARCHAR(50),
    MODEL_REASON_CODES TEXT,
    SECONDARY_MODEL_SCORE FLOAT,
    ENSEMBLE_SCORE FLOAT,
    ML_FRAUD_PROBABILITY FLOAT,
    RULE_BASED_SCORE FLOAT,
    
    -- ==========================================
    -- FRAUD INDICATORS & FLAGS
    -- ==========================================
    IS_FRAUD_TX NUMBER(1,0),  -- Confirmed fraud flag (0/1)
    FRAUD_TYPE VARCHAR(100),
    FRAUD_SUBTYPE VARCHAR(100),
    FRAUD_REASON TEXT,
    FRAUD_DETECTED_DATE TIMESTAMP_NTZ,
    FRAUD_REPORTED_BY VARCHAR(100),
    FRAUD_INVESTIGATION_STATUS VARCHAR(50),
    FRAUD_RESOLUTION VARCHAR(200),
    
    -- ==========================================
    -- THIRD-PARTY RISK SCORES
    -- ==========================================
    MAXMIND_RISK_SCORE FLOAT,
    MAXMIND_PROXY_SCORE FLOAT,
    EMAILAGE_SCORE FLOAT,
    SIFT_SCORE FLOAT,
    KOUNT_SCORE FLOAT,
    THREATMETRIX_SCORE FLOAT,
    IOVATION_SCORE FLOAT,
    
    -- ==========================================
    -- NSURE.AI INTEGRATION
    -- ==========================================
    NSURE_LAST_DECISION VARCHAR(50),
    NSURE_DECISION_REASON TEXT,
    NSURE_SCORE FLOAT,
    NSURE_POLICY_ID VARCHAR(100),
    NSURE_REVIEW_STATUS VARCHAR(50),
    
    -- ==========================================
    -- RULES ENGINE
    -- ==========================================
    RULES_TRIGGERED TEXT,
    RULE_SCORE_1 FLOAT,
    RULE_SCORE_2 FLOAT,
    RULE_SCORE_3 FLOAT,
    TOTAL_RULES_TRIGGERED NUMBER(5,0),
    HIGH_RISK_RULES_COUNT NUMBER(5,0),
    
    -- ==========================================
    -- VELOCITY & BEHAVIORAL METRICS
    -- ==========================================
    TX_COUNT_1H NUMBER(10,0),
    TX_COUNT_24H NUMBER(10,0),
    TX_COUNT_7D NUMBER(10,0),
    TX_COUNT_30D NUMBER(10,0),
    TX_AMOUNT_1H FLOAT,
    TX_AMOUNT_24H FLOAT,
    TX_AMOUNT_7D FLOAT,
    TX_AMOUNT_30D FLOAT,
    UNIQUE_CARDS_24H NUMBER(5,0),
    UNIQUE_IPS_24H NUMBER(10,0),
    UNIQUE_DEVICES_24H NUMBER(5,0),
    FAILED_TX_COUNT_24H NUMBER(10,0),
    
    -- ==========================================
    -- USER PROFILE & HISTORY
    -- ==========================================
    USER_ACCOUNT_AGE_DAYS NUMBER(10,0),
    USER_FIRST_TX_DATE DATE,
    USER_TOTAL_TX_COUNT NUMBER(10,0),
    USER_TOTAL_SPEND FLOAT,
    USER_AVG_TX_AMOUNT FLOAT,
    USER_FRAUD_HISTORY_COUNT NUMBER(5,0),
    USER_DISPUTE_COUNT NUMBER(5,0),
    USER_CHARGEBACK_COUNT NUMBER(5,0),
    IS_REPEAT_CUSTOMER BOOLEAN,
    CUSTOMER_LIFETIME_VALUE FLOAT,
    
    -- ==========================================
    -- ADDRESS INFORMATION
    -- ==========================================
    BILLING_ADDRESS_LINE1 VARCHAR(500),
    BILLING_ADDRESS_LINE2 VARCHAR(500),
    BILLING_CITY VARCHAR(100),
    BILLING_STATE VARCHAR(100),
    BILLING_COUNTRY VARCHAR(100),
    BILLING_POSTAL_CODE VARCHAR(20),
    SHIPPING_ADDRESS_LINE1 VARCHAR(500),
    SHIPPING_ADDRESS_LINE2 VARCHAR(500),
    SHIPPING_CITY VARCHAR(100),
    SHIPPING_STATE VARCHAR(100),
    SHIPPING_COUNTRY VARCHAR(100),
    SHIPPING_POSTAL_CODE VARCHAR(20),
    IS_BILLING_SHIPPING_SAME BOOLEAN,
    ADDRESS_VERIFICATION_STATUS VARCHAR(50),
    
    -- ==========================================
    -- KYC & COMPLIANCE
    -- ==========================================
    KYC_STATUS VARCHAR(50),
    KYC_LEVEL VARCHAR(20),
    KYC_VERIFIED_DATE DATE,
    AML_RISK_LEVEL VARCHAR(20),
    PEP_STATUS BOOLEAN,
    SANCTIONS_HIT BOOLEAN,
    COMPLIANCE_FLAGS TEXT,
    
    -- ==========================================
    -- DISPUTE & CHARGEBACK
    -- ==========================================
    DISPUTE_STATUS VARCHAR(50),
    DISPUTE_REASON VARCHAR(200),
    DISPUTE_AMOUNT FLOAT,
    DISPUTE_DATE DATE,
    CHARGEBACK_STATUS VARCHAR(50),
    CHARGEBACK_REASON_CODE VARCHAR(20),
    CHARGEBACK_AMOUNT FLOAT,
    CHARGEBACK_DATE DATE,
    
    -- ==========================================
    -- SESSION & INTERACTION DATA
    -- ==========================================
    SESSION_ID VARCHAR(255),
    SESSION_DURATION_SECONDS NUMBER(10,0),
    PAGE_VIEWS_COUNT NUMBER(10,0),
    CLICKS_COUNT NUMBER(10,0),
    TIME_TO_PURCHASE_SECONDS NUMBER(10,0),
    REFERRER_URL TEXT,
    LANDING_PAGE TEXT,
    EXIT_PAGE TEXT,
    
    -- ==========================================
    -- AUTHENTICATION & SECURITY
    -- ==========================================
    AUTH_METHOD VARCHAR(50),
    AUTH_ATTEMPTS NUMBER(3,0),
    IS_2FA_ENABLED BOOLEAN,
    IS_BIOMETRIC_AUTH BOOLEAN,
    PASSWORD_AGE_DAYS NUMBER(10,0),
    LAST_PASSWORD_CHANGE DATE,
    SECURITY_QUESTIONS_ANSWERED NUMBER(2,0),
    
    -- ==========================================
    -- SOCIAL & BEHAVIORAL
    -- ==========================================
    SOCIAL_MEDIA_LINKED BOOLEAN,
    SOCIAL_MEDIA_PLATFORMS TEXT,
    EMAIL_VERIFIED BOOLEAN,
    PHONE_VERIFIED BOOLEAN,
    BEHAVIORAL_SCORE FLOAT,
    ENGAGEMENT_SCORE FLOAT,
    
    -- ==========================================
    -- MARKETING & ATTRIBUTION
    -- ==========================================
    ACQUISITION_CHANNEL VARCHAR(100),
    CAMPAIGN_ID VARCHAR(100),
    CAMPAIGN_NAME VARCHAR(200),
    PROMO_CODE VARCHAR(50),
    DISCOUNT_AMOUNT FLOAT,
    AFFILIATE_ID VARCHAR(100),
    
    -- ==========================================
    -- CUSTOM FLAGS & METADATA
    -- ==========================================
    CUSTOM_FLAG_1 VARCHAR(100),
    CUSTOM_FLAG_2 VARCHAR(100),
    CUSTOM_FLAG_3 VARCHAR(100),
    CUSTOM_SCORE_1 FLOAT,
    CUSTOM_SCORE_2 FLOAT,
    CUSTOM_SCORE_3 FLOAT,
    METADATA_JSON VARIANT,
    
    -- ==========================================
    -- DATA QUALITY & PROCESSING
    -- ==========================================
    DATA_SOURCE VARCHAR(100),
    ETL_TIMESTAMP TIMESTAMP_NTZ,
    DATA_VERSION VARCHAR(20),
    IS_TEST_TRANSACTION BOOLEAN,
    PROCESSING_TIME_MS NUMBER(10,0),
    
    -- ==========================================
    -- GROSS MERCHANDISE VALUE
    -- ==========================================
    GMV FLOAT,
    GMV_USD FLOAT,
    
    -- ==========================================
    -- ADDITIONAL TIMESTAMPS
    -- ==========================================
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
)
CLUSTER BY (TX_DATE, EMAIL)
COMMENT = 'Comprehensive transaction enrichment table for fraud detection with 300+ columns';

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

-- Grant usage on database to role
GRANT USAGE ON DATABASE FRAUD_ANALYTICS TO ROLE FRAUD_ANALYST_ROLE;

-- Grant usage on schema to role
GRANT USAGE ON SCHEMA PUBLIC TO ROLE FRAUD_ANALYST_ROLE;

-- Grant SELECT on table to role (read-only access)
GRANT SELECT ON TABLE TRANSACTIONS_ENRICHED TO ROLE FRAUD_ANALYST_ROLE;

-- Grant usage on warehouse to role
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE FRAUD_ANALYST_ROLE;

-- Grant the role to the Olorin user
GRANT ROLE FRAUD_ANALYST_ROLE TO USER Olorin;

-- Set default role for Olorin user (optional)
-- ALTER USER Olorin SET DEFAULT_ROLE = FRAUD_ANALYST_ROLE;

-- ============================================
-- 6. INSERT SAMPLE DATA (Optional)
-- ============================================

-- Insert a few sample records for testing
INSERT INTO TRANSACTIONS_ENRICHED (
    TX_ID_KEY,
    TX_DATETIME,
    EMAIL,
    DEVICE_ID,
    MODEL_SCORE,
    IS_FRAUD_TX,
    PAID_AMOUNT_VALUE,
    GMV,
    PAYMENT_METHOD,
    CARD_BRAND,
    IP_COUNTRY,
    MERCHANT_NAME,
    NSURE_LAST_DECISION,
    MAXMIND_RISK_SCORE,
    USER_ID,
    FIRST_NAME,
    LAST_NAME
) 
SELECT * FROM VALUES
    ('tx_001', CURRENT_TIMESTAMP(), 'high.risk@example.com', 'device_001', 0.95, 1, 5000.00, 5000.00, 'CREDIT_CARD', 'VISA', 'USA', 'Suspicious Merchant LLC', 'REJECTED', 0.89, 'user_001', 'John', 'Doe'),
    ('tx_002', CURRENT_TIMESTAMP() - INTERVAL '1 hour', 'high.risk@example.com', 'device_002', 0.88, 1, 3000.00, 3000.00, 'CREDIT_CARD', 'MASTERCARD', 'Russia', 'Risky Business Inc', 'REJECTED', 0.92, 'user_001', 'John', 'Doe'),
    ('tx_003', CURRENT_TIMESTAMP() - INTERVAL '2 hours', 'medium.risk@example.com', 'device_003', 0.65, 0, 1500.00, 1500.00, 'DEBIT_CARD', 'VISA', 'Canada', 'Normal Store', 'APPROVED', 0.45, 'user_002', 'Jane', 'Smith'),
    ('tx_004', CURRENT_TIMESTAMP() - INTERVAL '3 hours', 'low.risk@example.com', 'device_004', 0.15, 0, 100.00, 100.00, 'PAYPAL', NULL, 'USA', 'Trusted Retailer', 'APPROVED', 0.10, 'user_003', 'Bob', 'Johnson'),
    ('tx_005', CURRENT_TIMESTAMP() - INTERVAL '4 hours', 'medium.risk@example.com', 'device_003', 0.55, 0, 750.00, 750.00, 'CREDIT_CARD', 'AMEX', 'Canada', 'Regular Shop', 'APPROVED', 0.38, 'user_002', 'Jane', 'Smith'),
    ('tx_006', CURRENT_TIMESTAMP() - INTERVAL '5 hours', 'high.risk@example.com', 'device_005', 0.78, 0, 2000.00, 2000.00, 'CRYPTO', 'BITCOIN', 'Netherlands', 'Crypto Exchange', 'REVIEW', 0.71, 'user_001', 'John', 'Doe'),
    ('tx_007', CURRENT_TIMESTAMP() - INTERVAL '6 hours', 'new.user@example.com', 'device_006', 0.42, 0, 500.00, 500.00, 'CREDIT_CARD', 'DISCOVER', 'USA', 'Online Marketplace', 'APPROVED', 0.25, 'user_004', 'Alice', 'Williams'),
    ('tx_008', CURRENT_TIMESTAMP() - INTERVAL '12 hours', 'low.risk@example.com', 'device_004', 0.08, 0, 50.00, 50.00, 'DEBIT_CARD', 'VISA', 'USA', 'Coffee Shop', 'APPROVED', 0.05, 'user_003', 'Bob', 'Johnson'),
    ('tx_009', CURRENT_TIMESTAMP() - INTERVAL '24 hours', 'suspicious@darkweb.com', 'device_007', 0.99, 1, 10000.00, 10000.00, 'WIRE_TRANSFER', NULL, 'Russia', 'Unknown Vendor', 'REJECTED', 0.98, 'user_005', 'Evil', 'Hacker'),
    ('tx_010', CURRENT_TIMESTAMP() - INTERVAL '48 hours', 'normal@example.com', 'device_008', 0.22, 0, 300.00, 300.00, 'CREDIT_CARD', 'VISA', 'UK', 'Department Store', 'APPROVED', 0.18, 'user_006', 'Charlie', 'Brown');

-- ============================================
-- 7. VERIFY SETUP
-- ============================================

-- Check that everything is set up correctly
SELECT 'Database' as Component, DATABASE() as Value
UNION ALL
SELECT 'Schema', SCHEMA()
UNION ALL
SELECT 'Table Row Count', COUNT(*)::VARCHAR FROM TRANSACTIONS_ENRICHED
UNION ALL
SELECT 'Current User', CURRENT_USER()
UNION ALL
SELECT 'Current Role', CURRENT_ROLE()
UNION ALL
SELECT 'Current Warehouse', CURRENT_WAREHOUSE();

-- Test the risk analytics query
SELECT 
    EMAIL as entity,
    COUNT(*) as transaction_count,
    SUM(PAID_AMOUNT_VALUE) as total_amount,
    AVG(MODEL_SCORE) as avg_risk_score,
    SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_weighted_value
FROM TRANSACTIONS_ENRICHED
WHERE TX_DATETIME >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
GROUP BY EMAIL
ORDER BY risk_weighted_value DESC
LIMIT 10;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- The Olorin user should now be able to:
-- 1. Connect to FRAUD_ANALYTICS database
-- 2. Query the TRANSACTIONS_ENRICHED table
-- 3. Run analytics queries for risk assessment
--
-- Next steps:
-- 1. Update your .env file with the connection details
-- 2. Set USE_SNOWFLAKE=true
-- 3. Run the application: poetry run python -m app.local_server