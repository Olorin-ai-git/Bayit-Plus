"""
ETL Pipeline for Precision Detection

Extracts mature transactions from Snowflake, loads into PostgreSQL,
builds ground-truth labels, and refreshes feature engineering materialized views.
"""

import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from app.service.snowflake_service import SnowflakeConnectionFactory, SnowflakeQueryService
from app.config.snowflake_config import SnowflakeConfig
from app.persistence.database import get_db_session
from app.service.logging import get_bridge_logger
from app.service.agent.tools.snowflake_tool.schema_constants import (
    TX_ID_KEY, TX_DATETIME, STORE_ID, PAID_AMOUNT_VALUE_IN_CURRENCY,
    PAID_AMOUNT_CURRENCY, MERCHANT_CATEGORY, IP_COUNTRY_CODE, IS_FRAUD_TX,
    LAST_DISPUTE_STATUS, LAST_DISPUTE_DATETIME, NSURE_INITIATED_REFUND_DATETIME
)
from scripts.etl_helpers import build_merchants_table, build_labels_truth, refresh_materialized_views
from app.service.precision_detection.performance_monitor import monitor_execution_time, track_pipeline_metrics

logger = get_bridge_logger(__name__)


def extract_mature_transactions(
    sf_service: SnowflakeQueryService,
    cutoff_date: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """
    Extract mature transactions from Snowflake (≥6 months old, ≥14 days matured).
    
    Args:
        sf_service: Snowflake query service
        cutoff_date: Optional cutoff date (defaults to 6 months ago)
        
    Returns:
        List of transaction dictionaries
    """
    if cutoff_date is None:
        cutoff_date = datetime.now() - timedelta(days=180)  # 6 months
    
    maturity_date = cutoff_date - timedelta(days=14)  # 14 days matured
    
    table_name = sf_service.table_name
    
    query = f"""
    SELECT
        {TX_ID_KEY} as txn_id,
        {TX_DATETIME} as txn_ts,
        {STORE_ID} as merchant_id,
        COALESCE(BIN, '') || COALESCE(LAST_FOUR, '') as card_id,
        {PAID_AMOUNT_VALUE_IN_CURRENCY} as amount,
        {PAID_AMOUNT_CURRENCY} as currency,
        NSURE_LAST_DECISION as approval_status,
        {MERCHANT_CATEGORY} as mcc,
        {IP_COUNTRY_CODE} as country,
        REGION as region,
        {IS_FRAUD_TX} as is_fraud_final,
        {LAST_DISPUTE_STATUS} as dispute_final_outcome,
        {LAST_DISPUTE_DATETIME} as dispute_datetime,
        {NSURE_INITIATED_REFUND_DATETIME} as refund_ts,
        NULL as chargeback_ts  -- TODO: Map actual chargeback column when available
    FROM {table_name}
    WHERE {TX_DATETIME} <= %s
      AND {TX_DATETIME} <= %s
    ORDER BY {TX_DATETIME} DESC
    """
    
    logger.info(f"Extracting mature transactions before {cutoff_date}")
    results = sf_service.execute_query(query, (cutoff_date, maturity_date))
    logger.info(f"Extracted {len(results)} mature transactions")
    
    return results


def load_to_postgres(transactions: List[Dict[str, Any]]) -> None:
    """
    Load transactions into PostgreSQL pg_transactions table.
    
    Args:
        transactions: List of transaction dictionaries
    """
    if not transactions:
        logger.warning("No transactions to load")
        return
    
    with get_db_session() as db:
        insert_query = text("""
            INSERT INTO pg_transactions (
                txn_id, txn_ts, merchant_id, card_id, amount, currency,
                approval_status, mcc, country, region,
                is_fraud_final, dispute_final_outcome, dispute_reason_code,
                refund_ts, chargeback_ts
            ) VALUES (
                :txn_id, :txn_ts, :merchant_id, :card_id, :amount, :currency,
                :approval_status, :mcc, :country, :region,
                :is_fraud_final, :dispute_final_outcome, :dispute_reason_code,
                :refund_ts, :chargeback_ts
            )
            ON CONFLICT (txn_id) DO UPDATE SET
                updated_at = NOW()
        """)
        
        for txn in transactions:
            params = {
                "txn_id": txn.get("txn_id"),
                "txn_ts": txn.get("txn_ts"),
                "merchant_id": txn.get("merchant_id"),
                "card_id": txn.get("card_id"),
                "amount": txn.get("amount"),
                "currency": txn.get("currency"),
                "approval_status": txn.get("approval_status"),
                "mcc": txn.get("mcc"),
                "country": txn.get("country"),
                "region": txn.get("region"),
                "is_fraud_final": txn.get("is_fraud_final"),
                "dispute_final_outcome": txn.get("dispute_final_outcome"),
                "dispute_reason_code": None,  # TODO: Map from LAST_DISPUTE_REASON
                "refund_ts": txn.get("refund_ts"),
                "chargeback_ts": txn.get("chargeback_ts")
            }
            db.execute(insert_query, params)
        
        db.commit()
        logger.info(f"Loaded {len(transactions)} transactions into pg_transactions")




@monitor_execution_time("ETL Pipeline")
def main():
    """Main ETL pipeline orchestration."""
    import time
    start_time = time.time()
    try:
        sf_config = SnowflakeConfig.from_env()
        sf_factory = SnowflakeConnectionFactory(sf_config)
        sf_service = SnowflakeQueryService(sf_factory)
        cutoff = datetime.now() - timedelta(days=180)
        transactions = extract_mature_transactions(sf_service, cutoff)
        if not transactions:
            logger.warning("No mature transactions found")
            return
        load_to_postgres(transactions)
        build_merchants_table()
        build_labels_truth()
        refresh_materialized_views()
        duration = time.time() - start_time
        track_pipeline_metrics("ETL Pipeline", {
            "transactions_processed": len(transactions),
            "execution_time_seconds": duration,
            "transactions_per_second": len(transactions) / duration if duration > 0 else 0
        })
        logger.info("ETL pipeline completed successfully")
    except Exception as e:
        logger.error(f"ETL pipeline failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()

