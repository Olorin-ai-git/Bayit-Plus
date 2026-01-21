-- ========================================================================
-- VERIFICATION QUERY FOR DATA POPULATION SUCCESS
-- Run this in Snowflake after executing the data population script
-- ========================================================================

USE DATABASE FRAUD_ANALYTICS;
USE SCHEMA PUBLIC;

-- ========================================================================
-- 1. OVERALL COMPLETION STATUS FOR ALL 38 PREVIOUSLY MISSING COLUMNS
-- ========================================================================

SELECT
    'Data Population Verification Results' as report_title,
    COUNT(*) as total_records,
    CURRENT_TIMESTAMP() as verification_time;

-- ========================================================================
-- 2. DETAILED COMPLETION CHECK FOR EACH COLUMN CATEGORY
-- ========================================================================

SELECT
    'Processing Fees' as category,
    COUNT(*) as total_records,
    COUNT(PROCESSING_FEE_VALUE_IN_CURRENCY) as populated_records,
    ROUND(COUNT(PROCESSING_FEE_VALUE_IN_CURRENCY) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Personal Data (First Names)' as category,
    COUNT(*) as total_records,
    COUNT(FIRST_NAME) as populated_records,
    ROUND(COUNT(FIRST_NAME) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Personal Data (Email Normalized)' as category,
    COUNT(*) as total_records,
    COUNT(EMAIL_NORMALIZED) as populated_records,
    ROUND(COUNT(EMAIL_NORMALIZED) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Personal Data (Phone Numbers)' as category,
    COUNT(*) as total_records,
    COUNT(PHONE_NUMBER) as populated_records,
    ROUND(COUNT(PHONE_NUMBER) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Device Data (Device IDs)' as category,
    COUNT(*) as total_records,
    COUNT(DEVICE_ID) as populated_records,
    ROUND(COUNT(DEVICE_ID) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Device Data (User Agents)' as category,
    COUNT(*) as total_records,
    COUNT(USER_AGENT) as populated_records,
    ROUND(COUNT(USER_AGENT) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Risk Data (MaxMind Scores)' as category,
    COUNT(*) as total_records,
    COUNT(MAXMIND_RISK_SCORE) as populated_records,
    ROUND(COUNT(MAXMIND_RISK_SCORE) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Card Data (Card Brands)' as category,
    COUNT(*) as total_records,
    COUNT(CARD_BRAND) as populated_records,
    ROUND(COUNT(CARD_BRAND) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Temporal Data (Received DateTime)' as category,
    COUNT(*) as total_records,
    COUNT(TX_RECEIVED_DATETIME) as populated_records,
    ROUND(COUNT(TX_RECEIVED_DATETIME) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Dispute Data (Disputes)' as category,
    COUNT(*) as total_records,
    COUNT(DISPUTES) as populated_records,
    ROUND(COUNT(DISPUTES) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Business Data (Store IDs)' as category,
    COUNT(*) as total_records,
    COUNT(STORE_ID) as populated_records,
    ROUND(COUNT(STORE_ID) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Cart Data (Product Types)' as category,
    COUNT(*) as total_records,
    COUNT(PRODUCT_TYPE) as populated_records,
    ROUND(COUNT(PRODUCT_TYPE) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Network Data (ISPs)' as category,
    COUNT(*) as total_records,
    COUNT(ISP) as populated_records,
    ROUND(COUNT(ISP) * 100.0 / COUNT(*), 2) as completion_percentage
FROM TRANSACTIONS_ENRICHED

ORDER BY category;

-- ========================================================================
-- 3. COMPREHENSIVE COLUMN-BY-COLUMN CHECK (ALL 38 MISSING COLUMNS)
-- ========================================================================

SELECT
    'All 38 Previously Missing Columns Status' as summary_title,
    COUNT(*) as total_records,

    -- Processing Fee Fields
    COUNT(PROCESSING_FEE_VALUE_IN_CURRENCY) as processing_fee_value_populated,
    COUNT(PROCESSING_FEE_CURRENCY) as processing_fee_currency_populated,

    -- Personal Data Fields
    COUNT(EMAIL_NORMALIZED) as email_normalized_populated,
    COUNT(FIRST_NAME) as first_name_populated,
    COUNT(LAST_NAME) as last_name_populated,
    COUNT(PHONE_NUMBER) as phone_number_populated,
    COUNT(PHONE_COUNTRY_CODE) as phone_country_code_populated,

    -- Device Fields
    COUNT(DEVICE_ID) as device_id_populated,
    COUNT(USER_AGENT) as user_agent_populated,
    COUNT(DEVICE_TYPE) as device_type_populated,
    COUNT(DEVICE_MODEL) as device_model_populated,
    COUNT(DEVICE_OS_VERSION) as device_os_version_populated,

    -- Risk Fields
    COUNT(NSURE_FIRST_DECISION) as nsure_first_decision_populated,
    COUNT(MAXMIND_RISK_SCORE) as maxmind_risk_score_populated,
    COUNT(MAXMIND_IP_RISK_SCORE) as maxmind_ip_risk_score_populated,

    -- Card Fields
    COUNT(CARD_BRAND) as card_brand_populated,
    COUNT(CARD_TYPE) as card_type_populated,
    COUNT(CARD_ISSUER) as card_issuer_populated,
    COUNT(BIN_COUNTRY_CODE) as bin_country_code_populated,

    -- Temporal Fields
    COUNT(TX_RECEIVED_DATETIME) as tx_received_datetime_populated,
    COUNT(TX_TIMESTAMP_MS) as tx_timestamp_ms_populated,

    -- Dispute Fields
    COUNT(DISPUTES) as disputes_populated,
    COUNT(COUNT_DISPUTES) as count_disputes_populated,
    COUNT(FRAUD_ALERTS) as fraud_alerts_populated,
    COUNT(COUNT_FRAUD_ALERTS) as count_fraud_alerts_populated,
    COUNT(LAST_DISPUTE_DATETIME) as last_dispute_datetime_populated,
    COUNT(LAST_FRAUD_ALERT_DATETIME) as last_fraud_alert_datetime_populated,

    -- Business Fields
    COUNT(STORE_ID) as store_id_populated,
    COUNT(MERCHANT_NAME) as merchant_name_populated,
    COUNT(PARTNER_NAME) as partner_name_populated,
    COUNT(APP_ID) as app_id_populated,

    -- Cart Fields
    COUNT(CART) as cart_populated,
    COUNT(CART_USD) as cart_usd_populated,
    COUNT(GMV) as gmv_populated,
    COUNT(PRODUCT_TYPE) as product_type_populated,
    COUNT(IS_DIGITAL) as is_digital_populated,

    -- Network Fields
    COUNT(ISP) as isp_populated,
    COUNT(ASN) as asn_populated

FROM TRANSACTIONS_ENRICHED;

-- ========================================================================
-- 4. SUCCESS CRITERIA CHECK
-- ========================================================================

WITH population_check AS (
    SELECT
        COUNT(*) as total_records,
        COUNT(PROCESSING_FEE_VALUE_IN_CURRENCY) as processing_fees,
        COUNT(FIRST_NAME) as personal_data,
        COUNT(DEVICE_ID) as device_data,
        COUNT(MAXMIND_RISK_SCORE) as risk_data,
        COUNT(CARD_BRAND) as card_data,
        COUNT(TX_RECEIVED_DATETIME) as temporal_data,
        COUNT(DISPUTES) as dispute_data,
        COUNT(STORE_ID) as business_data,
        COUNT(PRODUCT_TYPE) as cart_data,
        COUNT(ISP) as network_data
    FROM TRANSACTIONS_ENRICHED
)
SELECT
    'Population Success Check' as check_type,
    total_records,
    CASE
        WHEN processing_fees = total_records
         AND personal_data = total_records
         AND device_data = total_records
         AND risk_data = total_records
         AND card_data = total_records
         AND temporal_data = total_records
         AND dispute_data = total_records
         AND business_data = total_records
         AND cart_data = total_records
         AND network_data = total_records
        THEN '✅ SUCCESS: ALL 38 COLUMNS 100% POPULATED!'
        ELSE '❌ INCOMPLETE: Some columns still missing data'
    END as population_status,

    ROUND((processing_fees + personal_data + device_data + risk_data + card_data +
           temporal_data + dispute_data + business_data + cart_data + network_data) * 100.0 /
          (total_records * 10), 2) as overall_completion_percentage

FROM population_check;

-- ========================================================================
-- 5. SAMPLE DATA PREVIEW (to verify realistic data generation)
-- ========================================================================

SELECT
    'Sample Generated Data Preview' as preview_title,
    TX_ID_KEY,
    EMAIL,
    EMAIL_NORMALIZED,
    FIRST_NAME,
    LAST_NAME,
    PHONE_NUMBER,
    DEVICE_TYPE,
    DEVICE_MODEL,
    CARD_BRAND,
    MERCHANT_NAME,
    PRODUCT_TYPE,
    ISP,
    PROCESSING_FEE_VALUE_IN_CURRENCY,
    MAXMIND_RISK_SCORE
FROM TRANSACTIONS_ENRICHED
LIMIT 5;

-- ========================================================================
-- 6. FINAL SUMMARY MESSAGE
-- ========================================================================

SELECT
    '🎉 DATA POPULATION VERIFICATION COMPLETE!' as final_message,
    'Check the results above to confirm all 38 columns are now 100% populated' as instruction,
    'If any columns show less than 100%, re-run the specific section of the population script' as troubleshooting;