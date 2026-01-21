-- ============================================================================
-- Query to check existing merchants in TRANSACTIONS_ENRICHED table
-- ============================================================================
-- SCHEMA COMPLIANCE: All columns verified against snowflake_setup.sql schema
-- Last verified: 2025-11-08
-- ============================================================================

-- Get unique merchants with counts
SELECT
    MERCHANT_NAME,
    COUNT(*) as transaction_count,
    COUNT(DISTINCT EMAIL) as unique_users,
    AVG(PAID_AMOUNT_VALUE_IN_CURRENCY) as avg_amount,
    SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count
FROM DBT.DBT_PROD.TXS
GROUP BY MERCHANT_NAME
ORDER BY transaction_count DESC;

-- Get merchant categories
SELECT
    MERCHANT_CATEGORY,
    COUNT(*) as transaction_count
FROM DBT.DBT_PROD.TXS
GROUP BY MERCHANT_CATEGORY
ORDER BY transaction_count DESC;

-- Get sample of actual data
SELECT
    MERCHANT_NAME,
    MERCHANT_CATEGORY,
    PAYMENT_METHOD,
    PAID_AMOUNT_VALUE_IN_CURRENCY,
    PAID_CURRENCY
FROM DBT.DBT_PROD.TXS
LIMIT 20;

-- ============================================================================
-- All columns verified against authoritative schema in snowflake_setup.sql
-- ============================================================================
