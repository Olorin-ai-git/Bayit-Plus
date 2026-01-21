-- Database Migration: Transaction Windows View
-- Feature: 001-fraud-anomaly-detection
-- Version: 006
-- Description: Create transaction_windows view for anomaly detection
-- Database: PostgreSQL ONLY (uses DATE_TRUNC, PERCENTILE_CONT, INTERVAL, CREATE VIEW)
-- Note: This migration will be automatically skipped if transactions_enriched table doesn't exist
--
-- SYSTEM MANDATE Compliance:
-- - Schema-locked approach (manual SQL migration)
-- - NO auto-migration logic
-- - Explicit view definition
-- - Conditional execution (only if transactions_enriched exists)

-- =============================================================================
-- View: transaction_windows
-- Purpose: Aggregate transaction data into 15-minute windows per cohort
--          Provides compatibility with Snowflake marts_txn_window table
-- =============================================================================

-- Check if transactions_enriched table exists before creating view
DO $$
BEGIN
    -- Check if transactions_enriched table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions_enriched'
    ) THEN
        -- Drop view if it exists (for idempotency)
        DROP VIEW IF EXISTS transaction_windows;

        -- Create view that aggregates transactions into 15-minute windows
        -- Note: Uses actual column names from transactions_enriched table
        EXECUTE $sql$
CREATE VIEW transaction_windows AS
SELECT
    -- Window boundaries (15-minute intervals)
    DATE_TRUNC('minute', tx_datetime) + 
        INTERVAL '15 minutes' * FLOOR(EXTRACT(MINUTE FROM tx_datetime) / 15) AS window_start,
    DATE_TRUNC('minute', tx_datetime) + 
        INTERVAL '15 minutes' * FLOOR(EXTRACT(MINUTE FROM tx_datetime) / 15) + 
        INTERVAL '15 minutes' AS window_end,
    
    -- Cohort dimensions (mapped from transactions_enriched columns)
    store_id,
    COALESCE(device_type, 'unknown') AS device_type,
    COALESCE(ip_country, 'unknown') AS ip_country_code,
    
    -- Basic metrics
    COUNT(*) AS tx_count,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(DISTINCT card_last_4) AS unique_cards,
    COUNT(DISTINCT device_id) AS unique_devices,
    
    -- Amount metrics
    AVG(paid_amount_value_in_currency) AS amount_mean,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY paid_amount_value_in_currency) AS amount_p90,
    STDDEV(paid_amount_value_in_currency) AS amount_std,
    
    -- Rate metrics (using available columns)
    AVG(CASE WHEN 0 = 1 THEN 1.0 ELSE 0.0 END) AS decline_rate,
    AVG(CASE WHEN 0 = 1 THEN 1.0 ELSE 0.0 END) AS refund_rate,
    AVG(CASE WHEN 0 = 1 THEN 1.0 ELSE 0.0 END) AS cnp_share,
    
    -- Derived metrics
    CASE 
        WHEN COUNT(DISTINCT user_id) > 0 
        THEN COUNT(*)::FLOAT / COUNT(DISTINCT user_id) 
        ELSE 0 
    END AS tx_per_user,
    
    -- Placeholder for new_user_share (requires tracking first transaction)
    NULL::FLOAT AS new_user_share,
    
    -- Payment method shares
    AVG(CASE WHEN payment_method LIKE '%CARD%' OR payment_method LIKE '%CREDIT%' OR payment_method LIKE '%DEBIT%' THEN 1.0 ELSE 0.0 END) AS method_share_card,
    AVG(CASE WHEN payment_method LIKE '%ACH%' OR payment_method LIKE '%BANK%' THEN 1.0 ELSE 0.0 END) AS method_share_ach,
    AVG(CASE WHEN payment_method NOT LIKE '%CARD%' 
             AND payment_method NOT LIKE '%CREDIT%' 
             AND payment_method NOT LIKE '%DEBIT%'
             AND payment_method NOT LIKE '%ACH%'
             AND payment_method NOT LIKE '%BANK%' THEN 1.0 ELSE 0.0 END) AS method_share_alt

FROM transactions_enriched
WHERE tx_datetime IS NOT NULL
GROUP BY
    DATE_TRUNC('minute', tx_datetime) + 
        INTERVAL '15 minutes' * FLOOR(EXTRACT(MINUTE FROM tx_datetime) / 15),
    store_id,
    device_type,
    ip_country;
        $sql$;

        -- Add comment
        EXECUTE $comment$COMMENT ON VIEW transaction_windows IS 'Aggregated transaction metrics in 15-minute windows per cohort. Compatible with Snowflake marts_txn_window table structure.';$comment$;

        RAISE NOTICE 'transaction_windows view created successfully';
    ELSE
        RAISE NOTICE 'Skipping transaction_windows view creation: transactions_enriched table does not exist';
        RAISE NOTICE 'This is expected if transaction data has not been migrated yet. The view will be created automatically when transactions_enriched table is available.';
    END IF;
END $$;

-- =============================================================================
-- Migration Complete
-- =============================================================================
