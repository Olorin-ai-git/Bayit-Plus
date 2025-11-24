"""
ETL Helper Functions

Shared utilities for ETL pipeline operations.
"""

from typing import List, Dict, Any
from sqlalchemy import text
from app.persistence.database import get_db_session
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def build_merchants_table() -> None:
    """Build pg_merchants table by aggregating merchant metadata."""
    with get_db_session() as db:
        db.execute(text("DELETE FROM pg_merchants"))
        insert_query = text("""
            INSERT INTO pg_merchants (merchant_id, mcc, region, avg_monthly_txn, signup_date)
            SELECT
                merchant_id,
                MODE() WITHIN GROUP (ORDER BY mcc) as mcc,
                MODE() WITHIN GROUP (ORDER BY region) as region,
                AVG(daily_txn_count) * 30 as avg_monthly_txn,
                MIN(txn_ts::date) as signup_date
            FROM (
                SELECT
                    merchant_id, mcc, region,
                    date_trunc('day', txn_ts) as day,
                    COUNT(*) as daily_txn_count, txn_ts
                FROM pg_transactions
                GROUP BY merchant_id, mcc, region, date_trunc('day', txn_ts), txn_ts
            ) daily_stats
            GROUP BY merchant_id
        """)
        db.execute(insert_query)
        db.commit()
        logger.info("Built pg_merchants table")


def build_labels_truth() -> None:
    """Build ground-truth labels from mature transaction outcomes."""
    with get_db_session() as db:
        db.execute(text("DELETE FROM labels_truth"))
        insert_query = text("""
            INSERT INTO labels_truth (txn_id, y_true, label_maturity_days, label_source)
            SELECT
                txn_id,
                CASE
                    WHEN is_fraud_final = TRUE OR chargeback_ts IS NOT NULL THEN 1
                    ELSE 0
                END as y_true,
                EXTRACT(EPOCH FROM (NOW() - txn_ts)) / 86400 as label_maturity_days,
                CASE
                    WHEN is_fraud_final = TRUE THEN 'fraud_flag'
                    WHEN chargeback_ts IS NOT NULL THEN 'chargeback'
                    WHEN dispute_final_outcome IS NOT NULL THEN 'dispute'
                    ELSE 'legitimate'
                END as label_source
            FROM pg_transactions
            WHERE txn_ts <= NOW() - INTERVAL '6 months'
              AND (txn_ts <= NOW() - INTERVAL '14 days' OR chargeback_ts IS NOT NULL)
        """)
        db.execute(insert_query)
        db.commit()
        count_query = text("SELECT y_true, COUNT(*) as cnt FROM labels_truth GROUP BY y_true")
        results = db.execute(count_query).fetchall()
        logger.info(f"Built labels_truth: {dict(results)}")


def refresh_materialized_views() -> None:
    """Refresh all feature engineering materialized views."""
    views = [
        "mv_merchant_day", "mv_burst_flags", "mv_peer_stats", "mv_peer_flags",
        "mv_txn_feats_basic", "mv_txn_graph_feats", "mv_trailing_merchant", "mv_features_txn"
    ]
    with get_db_session() as db:
        for view in views:
            try:
                db.execute(text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view}"))
                db.commit()
                logger.info(f"Refreshed {view}")
            except Exception as e:
                logger.error(f"Failed to refresh {view}: {e}")
                db.rollback()
                raise

