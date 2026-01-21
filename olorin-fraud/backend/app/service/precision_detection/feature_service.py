"""
Precision Feature Service

Provides precision-focused features and model scores to domain agents.
"""

import time
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import text

from app.persistence.database import get_db_session
from app.service.logging import get_bridge_logger
from app.service.precision_detection.performance_monitor import check_query_latency

logger = get_bridge_logger(__name__)


class PrecisionFeatureService:
    """
    Service for retrieving precision-focused features and model scores.

    Provides access to:
    - Transaction features (merchant burst, peer-group, transaction-level, graph, enrichment)
    - Merchant burst signals
    - Calibrated model scores
    """

    def get_transaction_features(self, txn_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve all precision features for a transaction.

        Args:
            txn_id: Transaction ID

        Returns:
            Dictionary with feature values or None if not found

        Raises:
            ValueError: If txn_id is empty or invalid
        """
        if not txn_id:
            raise ValueError("txn_id cannot be empty")

        try:
            query_start = time.time()
            with get_db_session() as db:
                # Check if view/table exists first (for SQLite compatibility)
                # Use inspect to check table existence, and query sqlite_master for views
                from sqlalchemy import inspect

                inspector = inspect(db.bind)
                table_names = inspector.get_table_names()

                # For SQLite, check views in sqlite_master table
                view_names = []
                try:
                    if "sqlite" in str(db.bind.url).lower():
                        result = db.execute(
                            text("SELECT name FROM sqlite_master WHERE type='view'")
                        )
                        view_names = [row[0] for row in result]
                    elif hasattr(inspector, "get_view_names"):
                        view_names = inspector.get_view_names()
                except Exception:
                    pass  # If view check fails, continue with table check only

                if (
                    "mv_features_txn" not in table_names
                    and "mv_features_txn" not in view_names
                ):
                    logger.debug(
                        "mv_features_txn view/table does not exist - precision detection tables not migrated yet"
                    )
                    return None

                query = text("SELECT * FROM mv_features_txn WHERE txn_id = :txn_id")
                result = db.execute(query, {"txn_id": txn_id}).fetchone()
                check_query_latency(query_start, threshold_ms=100.0)
                if not result:
                    logger.debug(f"Transaction {txn_id} not found in mv_features_txn")
                    return None
                features = dict(result._mapping)
                model_score = self.get_model_score(txn_id)
                if model_score is not None:
                    features["model_score"] = model_score
                return features

        except Exception as e:
            # Handle missing table/view gracefully
            error_msg = str(e).lower()
            if (
                "no such table" in error_msg
                or "does not exist" in error_msg
                or "table" in error_msg
                and "not found" in error_msg
            ):
                logger.debug(
                    f"mv_features_txn view/table does not exist - precision detection tables not migrated yet"
                )
                return None
            logger.error(
                f"Failed to get transaction features for {txn_id}: {e}", exc_info=True
            )
            raise

    def get_merchant_burst_signals(
        self, merchant_id: str, date: str
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve merchant burst signals for a specific merchant and date.

        Args:
            merchant_id: Merchant ID
            date: Date in YYYY-MM-DD format

        Returns:
            Dictionary with burst signals or None if not found

        Raises:
            ValueError: If merchant_id or date is invalid
        """
        if not merchant_id:
            raise ValueError("merchant_id cannot be empty")
        if not date:
            raise ValueError("date cannot be empty")

        try:
            # Validate date format
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise ValueError(f"Invalid date format: {date}. Expected YYYY-MM-DD")

        try:
            with get_db_session() as db:
                # Check if view/table exists first (for SQLite compatibility)
                # Use inspect to check table existence, and query sqlite_master for views
                from sqlalchemy import inspect

                inspector = inspect(db.bind)
                table_names = inspector.get_table_names()

                # For SQLite, check views in sqlite_master table
                view_names = []
                try:
                    if "sqlite" in str(db.bind.url).lower():
                        result = db.execute(
                            text("SELECT name FROM sqlite_master WHERE type='view'")
                        )
                        view_names = [row[0] for row in result]
                    elif hasattr(inspector, "get_view_names"):
                        view_names = inspector.get_view_names()
                except Exception:
                    pass  # If view check fails, continue with table check only

                if (
                    "mv_burst_flags" not in table_names
                    and "mv_burst_flags" not in view_names
                ):
                    logger.debug(
                        "mv_burst_flags view/table does not exist - precision detection tables not migrated yet"
                    )
                    return None

                query = text(
                    """
                    SELECT
                        merchant_id,
                        d,
                        is_burst_cardtest,
                        tiny_amt_rate,
                        z_uniq_cards
                    FROM mv_burst_flags
                    WHERE merchant_id = :merchant_id
                      AND d = :date::date
                """
                )

                result = db.execute(
                    query, {"merchant_id": merchant_id, "date": date}
                ).fetchone()

                if not result:
                    logger.debug(
                        f"Merchant burst signals not found for {merchant_id} on {date}"
                    )
                    return None

                return {
                    "merchant_id": result.merchant_id,
                    "date": str(result.d),
                    "is_burst_cardtest": result.is_burst_cardtest,
                    "tiny_amt_rate": (
                        float(result.tiny_amt_rate) if result.tiny_amt_rate else 0.0
                    ),
                    "z_unique_cards_30d": (
                        float(result.z_uniq_cards) if result.z_uniq_cards else 0.0
                    ),
                }

        except Exception as e:
            logger.error(f"Failed to get merchant burst signals: {e}", exc_info=True)
            raise

    def get_model_score(self, txn_id: str) -> Optional[float]:
        """
        Retrieve calibrated model score for a transaction.

        Args:
            txn_id: Transaction ID

        Returns:
            Calibrated probability (0-1) or None if not found

        Raises:
            ValueError: If txn_id is empty or invalid
        """
        if not txn_id:
            raise ValueError("txn_id cannot be empty")

        try:
            query_start = time.time()
            with get_db_session() as db:
                # Check if table exists first (for SQLite compatibility)
                # Use inspect to check table existence more reliably
                from sqlalchemy import inspect

                inspector = inspect(db.bind)
                table_names = inspector.get_table_names()

                if "pg_alerts" not in table_names:
                    logger.debug(
                        "pg_alerts table does not exist - precision detection tables not migrated yet"
                    )
                    return None

                query = text(
                    "SELECT score FROM pg_alerts WHERE txn_id = :txn_id ORDER BY created_at DESC LIMIT 1"
                )
                result = db.execute(query, {"txn_id": txn_id}).fetchone()
                check_query_latency(query_start, threshold_ms=100.0)
                if not result:
                    logger.debug(f"Model score not found for {txn_id}")
                    return None
                return float(result.score)

        except Exception as e:
            # Handle missing table gracefully
            error_msg = str(e).lower()
            if (
                "no such table" in error_msg
                or "does not exist" in error_msg
                or "table" in error_msg
                and "not found" in error_msg
            ):
                logger.debug(
                    f"pg_alerts table does not exist - precision detection tables not migrated yet"
                )
                return None
            logger.error(f"Failed to get model score for {txn_id}: {e}", exc_info=True)
            raise
