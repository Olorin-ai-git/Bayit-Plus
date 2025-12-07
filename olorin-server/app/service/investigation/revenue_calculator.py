"""
Revenue Calculator Service

Calculates revenue implications (Saved Fraud GMV, Lost Revenues, Net Value)
for completed investigations with DETAILED reasoning and explanations.

Feature: 024-revenue-implication-tracking
"""

import os
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from app.config.revenue_config import RevenueConfig, get_revenue_config
from app.schemas.revenue_implication import (
    ConfidenceLevel,
    LostRevenuesBreakdown,
    NetValueBreakdown,
    PredictionValidation,
    RevenueAggregation,
    RevenueCalculationRequest,
    RevenueImplication,
    SavedFraudGMVBreakdown,
    TransactionDetail,
)
from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RevenueCalculator:
    """Calculates revenue implications for fraud investigations."""

    def __init__(self, config: Optional[RevenueConfig] = None):
        """
        Initialize revenue calculator.

        Args:
            config: Revenue configuration. If None, loads from environment.
        """
        self.config = config or get_revenue_config()
        self._db_provider = None

    def _get_db_provider(self):
        """Get or create database provider."""
        if self._db_provider is None:
            self._db_provider = get_database_provider()
            self._db_provider.connect()
        return self._db_provider

    def _is_snowflake(self) -> bool:
        """Check if using Snowflake database."""
        return os.getenv("DATABASE_PROVIDER", "snowflake").lower() == "snowflake"

    def _build_entity_clause(
        self, entity_type: str, entity_value: str
    ) -> Tuple[str, str]:
        """Build SQL clause for entity filtering."""
        is_sf = self._is_snowflake()

        entity_map = {
            "email": "EMAIL_NORMALIZED" if is_sf else "email_normalized",
            "device_id": "DEVICE_ID" if is_sf else "device_id",
            "ip": "IP" if is_sf else "ip",
            "phone": "PHONE_NORMALIZED" if is_sf else "phone_normalized",
        }

        col = entity_map.get(entity_type.lower())
        if not col:
            col = entity_type.upper() if is_sf else entity_type.lower()

        return col, f"{col} = '{entity_value}'"

    def validate_prediction_exists(
        self,
        entity_type: str,
        entity_value: str,
        investigation_id: Optional[str] = None,
    ) -> PredictionValidation:
        """
        Validate that Olorin actually predicted this entity as fraudulent.

        This is the CRITICAL check that ensures we only claim revenue savings
        for entities that Olorin actually identified as risky.

        The query checks the Postgres PREDICTIONS table for:
        1. Any predictions for this entity
        2. Whether predicted_label = 1 (fraud) for any transaction
        3. The average predicted_risk score

        Args:
            entity_type: Type of entity (email, device_id, etc.)
            entity_value: The entity identifier
            investigation_id: Optional investigation ID to filter by

        Returns:
            PredictionValidation with validation result and explanation
        """
        from app.persistence.database import get_db_session
        from sqlalchemy import text

        # Get risk threshold from environment
        risk_threshold = float(os.getenv("RISK_THRESHOLD_DEFAULT", "0.5"))

        try:
            with get_db_session() as db:
                # Query predictions table for this entity
                # First try with investigation_id if provided, then fall back to entity-only
                base_query = """
                    SELECT
                        COUNT(*) as prediction_count,
                        SUM(CASE WHEN predicted_label = 1 THEN 1 ELSE 0 END) as fraud_predictions,
                        AVG(predicted_risk) as avg_predicted_risk,
                        MAX(predicted_risk) as max_predicted_risk
                    FROM predictions
                    WHERE entity_type = :entity_type
                      AND entity_id = :entity_value
                """
                params = {
                    "entity_type": entity_type,
                    "entity_value": entity_value,
                }

                # Try with investigation_id first if provided
                if investigation_id:
                    query_with_inv = base_query + " AND investigation_id = :investigation_id"
                    params_with_inv = {**params, "investigation_id": investigation_id}
                    result = db.execute(text(query_with_inv), params_with_inv)
                    row = result.fetchone()

                    # If no predictions found with investigation_id, try without it
                    if row is None or row.prediction_count == 0:
                        logger.info(
                            f"[REVENUE] No predictions found for investigation_id={investigation_id}, "
                            f"checking entity-level predictions..."
                        )
                        result = db.execute(text(base_query), params)
                        row = result.fetchone()
                else:
                    result = db.execute(text(base_query), params)
                    row = result.fetchone()

                if row is None or row.prediction_count == 0:
                    return PredictionValidation(
                        entity_predicted_as_fraud=False,
                        prediction_count=0,
                        avg_predicted_risk=None,
                        risk_threshold_used=risk_threshold,
                        validation_message=(
                            f"NO PREDICTIONS FOUND for {entity_type}='{entity_value}' in Postgres. "
                            f"Olorin has not evaluated this entity. Revenue calculation SKIPPED."
                        ),
                    )

                prediction_count = int(row.prediction_count)
                fraud_predictions = int(row.fraud_predictions or 0)
                avg_risk = float(row.avg_predicted_risk) if row.avg_predicted_risk else None
                max_risk = float(row.max_predicted_risk) if row.max_predicted_risk else None

                # Entity is predicted as fraud if ANY transaction has predicted_label=1
                entity_predicted_as_fraud = fraud_predictions > 0

                if entity_predicted_as_fraud:
                    validation_message = (
                        f"✅ VALIDATED: Olorin predicted {entity_type}='{entity_value}' as FRAUDULENT. "
                        f"Found {prediction_count} predictions, {fraud_predictions} marked as fraud "
                        f"(avg_risk={avg_risk:.3f}, max_risk={max_risk:.3f}, threshold={risk_threshold}). "
                        f"Revenue calculation PROCEEDING."
                    )
                else:
                    validation_message = (
                        f"⚠️ NOT PREDICTED AS FRAUD: Olorin did NOT predict {entity_type}='{entity_value}' "
                        f"as fraudulent. Found {prediction_count} predictions but predicted_label=0 for all "
                        f"(avg_risk={avg_risk:.3f}, threshold={risk_threshold}). "
                        f"Revenue calculation SKIPPED - cannot claim savings for undetected entity."
                    )

                logger.info(f"[REVENUE] Prediction validation: {validation_message}")

                return PredictionValidation(
                    entity_predicted_as_fraud=entity_predicted_as_fraud,
                    prediction_count=prediction_count,
                    avg_predicted_risk=avg_risk,
                    risk_threshold_used=risk_threshold,
                    validation_message=validation_message,
                )

        except Exception as e:
            logger.error(f"[REVENUE] ❌ Failed to validate predictions: {e}", exc_info=True)
            # On error, return a conservative result (don't claim savings)
            return PredictionValidation(
                entity_predicted_as_fraud=False,
                prediction_count=0,
                avg_predicted_risk=None,
                risk_threshold_used=risk_threshold,
                validation_message=(
                    f"ERROR validating predictions for {entity_type}='{entity_value}': {e}. "
                    f"Revenue calculation SKIPPED due to validation error."
                ),
            )

    async def calculate_saved_fraud_gmv(
        self,
        entity_type: str,
        entity_value: str,
        window_start: datetime,
        window_end: datetime,
        merchant_name: Optional[str] = None,
        investigation_window_start: Optional[datetime] = None,
        investigation_window_end: Optional[datetime] = None,
    ) -> Tuple[Decimal, int, SavedFraudGMVBreakdown]:
        """
        Calculate Saved Fraud GMV with DETAILED reasoning.

        Saved Fraud GMV = Sum of GMV for APPROVED transactions that were fraud.
        These are transactions that nSure approved but turned out to be fraud,
        representing the loss that would have occurred without Olorin detection.

        REASONING:
        - These transactions were APPROVED by nSure (let through)
        - But later confirmed as FRAUD (IS_FRAUD_TX = 1)
        - If Olorin had blocked them, this GMV would have been saved
        - This represents the VALUE that Olorin's fraud detection provides

        Returns:
            Tuple of (saved_fraud_gmv, count, breakdown)
        """
        is_sf = self._is_snowflake()
        db = self._get_db_provider()
        table_name = db.get_full_table_name()

        # Column names
        gmv_col = "PAID_AMOUNT_VALUE_IN_CURRENCY" if is_sf else "paid_amount_value_in_currency"
        decision_col = "NSURE_LAST_DECISION" if is_sf else "nSure_last_decision"
        fraud_col = "IS_FRAUD_TX" if is_sf else "is_fraud_tx"
        datetime_col = "TX_DATETIME" if is_sf else "tx_datetime"
        tx_id_col = "TX_ID_KEY" if is_sf else "tx_id_key"
        merchant_col = "MERCHANT_NAME" if is_sf else "merchant_name"

        entity_col, entity_clause = self._build_entity_clause(entity_type, entity_value)

        # Aggregate query
        agg_query = f"""
        SELECT
            COALESCE(SUM({gmv_col}), 0) as saved_fraud_gmv,
            COUNT(*) as approved_fraud_count,
            COALESCE(AVG({gmv_col}), 0) as avg_value,
            COALESCE(MIN({gmv_col}), 0) as min_value,
            COALESCE(MAX({gmv_col}), 0) as max_value
        FROM {table_name}
        WHERE {entity_clause}
          AND {datetime_col} >= '{window_start.isoformat()}'
          AND {datetime_col} < '{window_end.isoformat()}'
          AND UPPER({decision_col}) = 'APPROVED'
          AND {fraud_col} = 1
        """

        # Sample transactions query (top 5 by value)
        sample_query = f"""
        SELECT
            {tx_id_col} as tx_id,
            {gmv_col} as gmv,
            {decision_col} as decision,
            {fraud_col} as is_fraud,
            {datetime_col} as tx_datetime,
            {merchant_col} as merchant
        FROM {table_name}
        WHERE {entity_clause}
          AND {datetime_col} >= '{window_start.isoformat()}'
          AND {datetime_col} < '{window_end.isoformat()}'
          AND UPPER({decision_col}) = 'APPROVED'
          AND {fraud_col} = 1
        ORDER BY {gmv_col} DESC
        LIMIT 5
        """

        logger.info(
            f"[REVENUE] 💰 Calculating SAVED FRAUD GMV for {entity_type}={entity_value}"
        )
        logger.info(f"[REVENUE]    Window: {window_start.date()} to {window_end.date()}")
        logger.info(f"[REVENUE]    Criteria: APPROVED + IS_FRAUD_TX=1")

        try:
            # Execute aggregate query
            if hasattr(db, "execute_query_async"):
                result = await db.execute_query_async(agg_query)
            else:
                result = db.execute_query(agg_query)

            gmv = Decimal("0")
            count = 0
            avg_val = Decimal("0")
            min_val = Decimal("0")
            max_val = Decimal("0")

            if result and len(result) > 0:
                row = result[0]
                gmv = Decimal(str(row.get("saved_fraud_gmv", 0) or 0))
                count = int(row.get("approved_fraud_count", 0) or 0)
                avg_val = Decimal(str(row.get("avg_value", 0) or 0))
                min_val = Decimal(str(row.get("min_value", 0) or 0))
                max_val = Decimal(str(row.get("max_value", 0) or 0))

            # Get sample transactions
            samples: List[TransactionDetail] = []
            try:
                if hasattr(db, "execute_query_async"):
                    sample_result = await db.execute_query_async(sample_query)
                else:
                    sample_result = db.execute_query(sample_query)

                for row in sample_result[:5]:
                    samples.append(TransactionDetail(
                        tx_id=str(row.get("tx_id", "unknown")),
                        gmv=Decimal(str(row.get("gmv", 0) or 0)),
                        decision=str(row.get("decision", "APPROVED")),
                        is_fraud=True,
                        tx_datetime=row.get("tx_datetime", window_start),
                        merchant=row.get("merchant"),
                    ))
            except Exception as sample_err:
                logger.warning(f"[REVENUE] Could not fetch sample transactions: {sample_err}")

            # Build detailed reasoning with time window methodology
            reasoning = self._build_saved_fraud_reasoning(
                entity_type, entity_value, merchant_name,
                gmv, count, avg_val, min_val, max_val,
                window_start, window_end,
                investigation_window_start, investigation_window_end
            )

            methodology = (
                "METHODOLOGY: Query all transactions where:\n"
                f"  1. Entity ({entity_type}) = '{entity_value}'\n"
                f"  2. Transaction date between {window_start.date()} and {window_end.date()}\n"
                "  3. nSure decision = APPROVED (transaction was let through)\n"
                "  4. IS_FRAUD_TX = 1 (confirmed as fraud after the fact)\n"
                "\n"
                "Sum the GMV of all matching transactions. This represents the total\n"
                "monetary value that would have been lost to fraud without detection."
            )

            breakdown = SavedFraudGMVBreakdown(
                total_saved_gmv=gmv,
                reasoning=reasoning,
                methodology=methodology,
                transaction_count=count,
                avg_fraud_tx_value=avg_val,
                min_tx_value=min_val,
                max_tx_value=max_val,
                sample_transactions=samples,
                query_window_start=window_start,
                query_window_end=window_end,
            )

            logger.info(f"[REVENUE] ✅ Saved Fraud GMV: ${gmv:,.2f} from {count} transactions")
            return gmv, count, breakdown

        except Exception as e:
            logger.error(f"[REVENUE] ❌ Error calculating Saved Fraud GMV: {e}")
            empty_breakdown = SavedFraudGMVBreakdown(
                total_saved_gmv=Decimal("0"),
                reasoning=f"Calculation failed: {e}",
                methodology="N/A - calculation failed",
                transaction_count=0,
                query_window_start=window_start,
                query_window_end=window_end,
            )
            return Decimal("0"), 0, empty_breakdown

    def _build_saved_fraud_reasoning(
        self,
        entity_type: str,
        entity_value: str,
        merchant_name: Optional[str],
        gmv: Decimal,
        count: int,
        avg_val: Decimal,
        min_val: Decimal,
        max_val: Decimal,
        gmv_window_start: datetime,
        gmv_window_end: datetime,
        investigation_window_start: Optional[datetime] = None,
        investigation_window_end: Optional[datetime] = None,
    ) -> str:
        """Build detailed reasoning for Saved Fraud GMV with time window methodology."""
        merchant_text = f" (Merchant: {merchant_name})" if merchant_name else ""

        # Build time window methodology section if investigation window is provided
        window_methodology = ""
        if investigation_window_start and investigation_window_end:
            window_methodology = (
                f"═══════════════════════════════════════════════════════════════\n"
                f"TIME WINDOW METHODOLOGY\n"
                f"═══════════════════════════════════════════════════════════════\n\n"
                f"STEP 1: INVESTIGATION PERIOD\n"
                f"  Period: {investigation_window_start.date()} to {investigation_window_end.date()}\n"
                f"  During this time, Olorin analyzed the entity and identified risk patterns.\n"
                f"  This is when the entity was flagged as potentially fraudulent.\n\n"
                f"STEP 2: SAVED FRAUD GMV PERIOD (Post-Investigation)\n"
                f"  Period: {gmv_window_start.date()} to {gmv_window_end.date()}\n"
                f"  This is the FUTURE period AFTER the investigation would have completed.\n"
                f"  We look at what happened to this entity AFTER we identified the risk.\n\n"
                f"STEP 3: THE VALUE PROPOSITION\n"
                f"  If Olorin had BLOCKED this entity at the END of the investigation period\n"
                f"  ({investigation_window_end.date()}), the following fraud in the GMV period\n"
                f"  would have been PREVENTED.\n\n"
                f"  ┌─────────────────────────────────────────────────────────────┐\n"
                f"  │  Investigation Period    │    Saved Fraud GMV Period       │\n"
                f"  │  (Risk Detection)        │    (Future Losses Prevented)    │\n"
                f"  │  [{investigation_window_start.date()}]───[{investigation_window_end.date()}]───[{gmv_window_end.date()}]        │\n"
                f"  │  ↑                        ↑                                 │\n"
                f"  │  Fraud patterns          Block would                       │\n"
                f"  │  identified              prevent this                      │\n"
                f"  └─────────────────────────────────────────────────────────────┘\n\n"
            )

        if count == 0:
            return (
                f"SAVED FRAUD GMV ANALYSIS for {entity_type}='{entity_value}'{merchant_text}\n\n"
                f"{window_methodology}"
                f"═══════════════════════════════════════════════════════════════\n"
                f"RESULT\n"
                f"═══════════════════════════════════════════════════════════════\n\n"
                f"RESULT: $0.00 - No approved fraud transactions found in GMV window.\n\n"
                f"GMV ANALYSIS WINDOW: {gmv_window_start.date()} to {gmv_window_end.date()}\n\n"
                f"EXPLANATION:\n"
                f"During the GMV window (AFTER the investigation period),\n"
                f"no transactions for this entity were both:\n"
                f"  • APPROVED by nSure (let through), AND\n"
                f"  • Later confirmed as FRAUD\n\n"
                f"This could mean:\n"
                f"  1. This entity had no fraudulent activity after the investigation, OR\n"
                f"  2. All post-investigation fraud was correctly BLOCKED, OR\n"
                f"  3. The entity stopped transacting after being identified\n"
            )

        return (
            f"SAVED FRAUD GMV ANALYSIS for {entity_type}='{entity_value}'{merchant_text}\n\n"
            f"{window_methodology}"
            f"═══════════════════════════════════════════════════════════════\n"
            f"RESULT\n"
            f"═══════════════════════════════════════════════════════════════\n\n"
            f"RESULT: ${gmv:,.2f} WOULD HAVE BEEN SAVED\n\n"
            f"GMV ANALYSIS WINDOW: {gmv_window_start.date()} to {gmv_window_end.date()}\n\n"
            f"WHAT THIS MEANS:\n"
            f"AFTER the investigation identified this entity as risky, there were {count}\n"
            f"transactions that nSure APPROVED but were later confirmed as FRAUD.\n\n"
            f"If Olorin had BLOCKED this entity at the end of the investigation period,\n"
            f"these ${gmv:,.2f} in fraudulent transactions would have been PREVENTED.\n\n"
            f"TRANSACTION STATISTICS:\n"
            f"  • Total Approved Fraud Transactions (Post-Investigation): {count}\n"
            f"  • Total GMV Lost to Fraud: ${gmv:,.2f}\n"
            f"  • Average Transaction Value: ${avg_val:,.2f}\n"
            f"  • Smallest Fraud Transaction: ${min_val:,.2f}\n"
            f"  • Largest Fraud Transaction: ${max_val:,.2f}\n\n"
            f"VALUE PROPOSITION:\n"
            f"This ${gmv:,.2f} represents PREVENTABLE losses. Using Olorin's risk detection\n"
            f"from the investigation period, these future fraudulent transactions could\n"
            f"have been blocked BEFORE they occurred.\n"
        )

    async def calculate_lost_revenues(
        self,
        entity_type: str,
        entity_value: str,
        window_start: datetime,
        window_end: datetime,
        take_rate: Optional[Decimal] = None,
        lifetime_multiplier: Optional[Decimal] = None,
        merchant_name: Optional[str] = None,
        investigation_window_start: Optional[datetime] = None,
        investigation_window_end: Optional[datetime] = None,
    ) -> Tuple[Decimal, int, Decimal, LostRevenuesBreakdown]:
        """
        Calculate Lost Revenues with DETAILED reasoning.

        Lost Revenues = Sum of GMV for BLOCKED legitimate transactions × take_rate × multiplier.

        REASONING:
        - These transactions were BLOCKED (rejected) by the system
        - But they were actually LEGITIMATE (IS_FRAUD_TX = 0 or NULL)
        - This is a FALSE POSITIVE - blocking good transactions
        - The lost revenue = blocked_gmv × take_rate × lifetime_multiplier

        WHY TAKE RATE:
        - nSure.ai earns a percentage (take rate) on each approved transaction
        - When legitimate transactions are blocked, nSure loses that fee
        - Default take rate is 0.75% (can be configured)

        WHY LIFETIME MULTIPLIER:
        - Blocking a user may lose their entire future business, not just one transaction
        - Multiplier accounts for customer lifetime value (default: 1x = just this tx)
        - Set to 4x or 6x to represent 2-3 years of expected lifetime value

        Returns:
            Tuple of (lost_revenues, count, blocked_gmv, breakdown)
        """
        is_sf = self._is_snowflake()
        db = self._get_db_provider()
        table_name = db.get_full_table_name()

        # Use config defaults if not overridden
        rate = take_rate if take_rate is not None else self.config.take_rate_percent
        multiplier = (
            lifetime_multiplier
            if lifetime_multiplier is not None
            else self.config.lifetime_multiplier
        )

        # Column names
        gmv_col = "PAID_AMOUNT_VALUE_IN_CURRENCY" if is_sf else "paid_amount_value_in_currency"
        decision_col = "NSURE_LAST_DECISION" if is_sf else "nSure_last_decision"
        fraud_col = "IS_FRAUD_TX" if is_sf else "is_fraud_tx"
        datetime_col = "TX_DATETIME" if is_sf else "tx_datetime"
        tx_id_col = "TX_ID_KEY" if is_sf else "tx_id_key"
        merchant_col = "MERCHANT_NAME" if is_sf else "merchant_name"

        entity_col, entity_clause = self._build_entity_clause(entity_type, entity_value)

        # Aggregate query for blocked legitimate transactions
        agg_query = f"""
        SELECT
            COALESCE(SUM({gmv_col}), 0) as blocked_gmv,
            COUNT(*) as blocked_legitimate_count,
            COALESCE(AVG({gmv_col}), 0) as avg_value
        FROM {table_name}
        WHERE {entity_clause}
          AND {datetime_col} >= '{window_start.isoformat()}'
          AND {datetime_col} < '{window_end.isoformat()}'
          AND UPPER({decision_col}) IN ('BLOCK', 'REJECT', 'DECLINE', 'DECLINED', 'REJECTED')
          AND ({fraud_col} = 0 OR {fraud_col} IS NULL)
        """

        # Sample transactions query
        sample_query = f"""
        SELECT
            {tx_id_col} as tx_id,
            {gmv_col} as gmv,
            {decision_col} as decision,
            {fraud_col} as is_fraud,
            {datetime_col} as tx_datetime,
            {merchant_col} as merchant
        FROM {table_name}
        WHERE {entity_clause}
          AND {datetime_col} >= '{window_start.isoformat()}'
          AND {datetime_col} < '{window_end.isoformat()}'
          AND UPPER({decision_col}) IN ('BLOCK', 'REJECT', 'DECLINE', 'DECLINED', 'REJECTED')
          AND ({fraud_col} = 0 OR {fraud_col} IS NULL)
        ORDER BY {gmv_col} DESC
        LIMIT 5
        """

        logger.info(
            f"[REVENUE] 📉 Calculating LOST REVENUES for {entity_type}={entity_value}"
        )
        logger.info(f"[REVENUE]    Window: {window_start.date()} to {window_end.date()}")
        logger.info(f"[REVENUE]    Criteria: BLOCKED + IS_FRAUD_TX=0/NULL (false positives)")
        logger.info(f"[REVENUE]    Take Rate: {rate}% × Lifetime Multiplier: {multiplier}x")

        try:
            # Execute aggregate query
            if hasattr(db, "execute_query_async"):
                result = await db.execute_query_async(agg_query)
            else:
                result = db.execute_query(agg_query)

            blocked_gmv = Decimal("0")
            count = 0
            avg_val = Decimal("0")

            if result and len(result) > 0:
                row = result[0]
                blocked_gmv = Decimal(str(row.get("blocked_gmv", 0) or 0))
                count = int(row.get("blocked_legitimate_count", 0) or 0)
                avg_val = Decimal(str(row.get("avg_value", 0) or 0))

            # Calculate lost revenues with formula
            lost_revenues = blocked_gmv * (rate / Decimal("100")) * multiplier

            # Get sample transactions
            samples: List[TransactionDetail] = []
            try:
                if hasattr(db, "execute_query_async"):
                    sample_result = await db.execute_query_async(sample_query)
                else:
                    sample_result = db.execute_query(sample_query)

                for row in sample_result[:5]:
                    samples.append(TransactionDetail(
                        tx_id=str(row.get("tx_id", "unknown")),
                        gmv=Decimal(str(row.get("gmv", 0) or 0)),
                        decision=str(row.get("decision", "BLOCKED")),
                        is_fraud=False,
                        tx_datetime=row.get("tx_datetime", window_start),
                        merchant=row.get("merchant"),
                    ))
            except Exception as sample_err:
                logger.warning(f"[REVENUE] Could not fetch sample transactions: {sample_err}")

            # Build detailed reasoning with time window methodology
            reasoning = self._build_lost_revenues_reasoning(
                entity_type, entity_value, merchant_name,
                blocked_gmv, lost_revenues, count, avg_val,
                rate, multiplier, window_start, window_end,
                investigation_window_start, investigation_window_end
            )

            formula = (
                f"Lost Revenues = Blocked GMV × (Take Rate / 100) × Lifetime Multiplier\n"
                f"             = ${blocked_gmv:,.2f} × ({rate}% / 100) × {multiplier}\n"
                f"             = ${blocked_gmv:,.2f} × {float(rate)/100:.4f} × {multiplier}\n"
                f"             = ${lost_revenues:,.2f}"
            )

            methodology = (
                "METHODOLOGY: Query all transactions where:\n"
                f"  1. Entity ({entity_type}) = '{entity_value}'\n"
                f"  2. Transaction date between {window_start.date()} and {window_end.date()}\n"
                "  3. nSure decision IN (BLOCK, REJECT, DECLINE, DECLINED, REJECTED)\n"
                "  4. IS_FRAUD_TX = 0 or NULL (NOT fraud - legitimate transaction)\n"
                "\n"
                "Sum the GMV of all matching transactions (Blocked GMV).\n"
                "Then apply the formula:\n"
                f"  Lost Revenues = Blocked GMV × (Take Rate / 100) × Lifetime Multiplier\n"
                "\n"
                "This represents the revenue nSure.ai loses from blocking legitimate users."
            )

            breakdown = LostRevenuesBreakdown(
                total_lost_revenues=lost_revenues,
                blocked_gmv_total=blocked_gmv,
                take_rate_percent=rate,
                lifetime_multiplier=multiplier,
                reasoning=reasoning,
                methodology=methodology,
                formula_applied=formula,
                transaction_count=count,
                avg_blocked_tx_value=avg_val,
                sample_transactions=samples,
                query_window_start=window_start,
                query_window_end=window_end,
            )

            logger.info(
                f"[REVENUE] ✅ Lost Revenues: ${lost_revenues:,.2f} "
                f"(${blocked_gmv:,.2f} × {rate}% × {multiplier}x) from {count} transactions"
            )
            return lost_revenues, count, blocked_gmv, breakdown

        except Exception as e:
            logger.error(f"[REVENUE] ❌ Error calculating Lost Revenues: {e}")
            empty_breakdown = LostRevenuesBreakdown(
                total_lost_revenues=Decimal("0"),
                blocked_gmv_total=Decimal("0"),
                take_rate_percent=rate,
                lifetime_multiplier=multiplier,
                reasoning=f"Calculation failed: {e}",
                methodology="N/A - calculation failed",
                formula_applied="N/A",
                transaction_count=0,
                query_window_start=window_start,
                query_window_end=window_end,
            )
            return Decimal("0"), 0, Decimal("0"), empty_breakdown

    def _build_lost_revenues_reasoning(
        self,
        entity_type: str,
        entity_value: str,
        merchant_name: Optional[str],
        blocked_gmv: Decimal,
        lost_revenues: Decimal,
        count: int,
        avg_val: Decimal,
        rate: Decimal,
        multiplier: Decimal,
        gmv_window_start: datetime,
        gmv_window_end: datetime,
        investigation_window_start: Optional[datetime] = None,
        investigation_window_end: Optional[datetime] = None,
    ) -> str:
        """Build detailed reasoning for Lost Revenues with time window methodology."""
        merchant_text = f" (Merchant: {merchant_name})" if merchant_name else ""

        # Build time window methodology section if investigation window is provided
        window_methodology = ""
        if investigation_window_start and investigation_window_end:
            window_methodology = (
                f"═══════════════════════════════════════════════════════════════\n"
                f"TIME WINDOW METHODOLOGY\n"
                f"═══════════════════════════════════════════════════════════════\n\n"
                f"We analyze blocked legitimate transactions in the GMV window\n"
                f"({gmv_window_start.date()} to {gmv_window_end.date()}) to understand\n"
                f"the cost of false positives if Olorin had blocked this entity.\n\n"
                f"IMPORTANT: This represents the 'cost' side of the equation.\n"
                f"If we had blocked this entity after investigation, we would also\n"
                f"have blocked these legitimate transactions (false positives).\n\n"
            )

        if count == 0:
            return (
                f"LOST REVENUES ANALYSIS for {entity_type}='{entity_value}'{merchant_text}\n\n"
                f"{window_methodology}"
                f"═══════════════════════════════════════════════════════════════\n"
                f"RESULT\n"
                f"═══════════════════════════════════════════════════════════════\n\n"
                f"RESULT: $0.00 - No false positives found.\n\n"
                f"GMV ANALYSIS WINDOW: {gmv_window_start.date()} to {gmv_window_end.date()}\n\n"
                f"EXPLANATION:\n"
                f"During the GMV window, no transactions for this entity were both:\n"
                f"  • BLOCKED by the system (rejected), AND\n"
                f"  • Actually LEGITIMATE (not fraud)\n\n"
                f"This is EXCELLENT - it means:\n"
                f"  1. All blocked transactions were genuine fraud (no false positives), OR\n"
                f"  2. No transactions were blocked for this entity, OR\n"
                f"  3. This entity had no legitimate activity in the GMV window\n\n"
                f"ZERO FALSE POSITIVES = ZERO LOST REVENUES\n"
            )

        lifetime_explanation = ""
        if multiplier > 1:
            lifetime_explanation = (
                f"\nLIFETIME VALUE CONSIDERATION:\n"
                f"The lifetime multiplier of {multiplier}x accounts for the fact that\n"
                f"blocking a user doesn't just lose one transaction - it may lose their\n"
                f"entire future business. A {multiplier}x multiplier represents an\n"
                f"estimated {float(multiplier) * 6:.0f} months of expected customer value.\n"
            )

        return (
            f"LOST REVENUES ANALYSIS for {entity_type}='{entity_value}'{merchant_text}\n\n"
            f"{window_methodology}"
            f"═══════════════════════════════════════════════════════════════\n"
            f"RESULT\n"
            f"═══════════════════════════════════════════════════════════════\n\n"
            f"RESULT: ${lost_revenues:,.2f} WOULD BE LOST in potential revenues\n\n"
            f"GMV ANALYSIS WINDOW: {gmv_window_start.date()} to {gmv_window_end.date()}\n\n"
            f"WHAT THIS MEANS:\n"
            f"In the GMV window, there were {count} transactions that were BLOCKED\n"
            f"(rejected) but were actually LEGITIMATE (not fraud).\n\n"
            f"If Olorin had blocked this entity after the investigation period,\n"
            f"these FALSE POSITIVES totaling ${blocked_gmv:,.2f} would also have been blocked.\n\n"
            f"REVENUE CALCULATION:\n"
            f"  ┌─────────────────────────────────────────────────────────────┐\n"
            f"  │ Blocked GMV (legitimate tx):     ${blocked_gmv:>15,.2f}      │\n"
            f"  │ × Take Rate:                     {rate:>15.2f}%             │\n"
            f"  │ × Lifetime Multiplier:           {multiplier:>15.1f}x             │\n"
            f"  ├─────────────────────────────────────────────────────────────┤\n"
            f"  │ = LOST REVENUES:                 ${lost_revenues:>15,.2f}      │\n"
            f"  └─────────────────────────────────────────────────────────────┘\n\n"
            f"BREAKDOWN:\n"
            f"  • Total Blocked Legitimate Transactions: {count}\n"
            f"  • Total Blocked GMV: ${blocked_gmv:,.2f}\n"
            f"  • Average Transaction Value: ${avg_val:,.2f}\n"
            f"  • Take Rate Applied: {rate}%\n"
            f"  • Lifetime Multiplier: {multiplier}x\n"
            f"{lifetime_explanation}\n"
            f"WHY THIS MATTERS:\n"
            f"This ${lost_revenues:,.2f} represents the 'cost' of blocking this entity.\n"
            f"It must be weighed against the 'benefit' (Saved Fraud GMV) to determine\n"
            f"the NET VALUE of the fraud detection decision.\n"
        )

    def calculate_net_value(
        self,
        saved_fraud_gmv: Decimal,
        lost_revenues: Decimal,
        entity_type: str,
        entity_value: str,
        merchant_name: Optional[str] = None,
    ) -> Tuple[Decimal, NetValueBreakdown]:
        """
        Calculate Net Value with detailed reasoning.

        Net Value = Saved Fraud GMV - Lost Revenues

        This represents the TOTAL VALUE that Olorin/nSure.ai derives from
        fraud detection for this entity:
        - POSITIVE = fraud detection is profitable (saved more than lost)
        - NEGATIVE = false positives cost more than fraud detected

        Returns:
            Tuple of (net_value, breakdown)
        """
        net_value = saved_fraud_gmv - lost_revenues

        # Calculate ROI if there are lost revenues
        roi_percentage: Optional[Decimal] = None
        if lost_revenues > 0:
            roi_percentage = ((saved_fraud_gmv - lost_revenues) / lost_revenues) * 100

        is_positive = net_value >= 0

        # Build reasoning
        merchant_text = f" for {merchant_name}" if merchant_name else ""
        
        if net_value > 0:
            reasoning = (
                f"NET VALUE ANALYSIS{merchant_text}\n"
                f"═══════════════════════════════════════════════════════════════\n\n"
                f"RESULT: +${net_value:,.2f} NET POSITIVE VALUE ✅\n\n"
                f"CALCULATION:\n"
                f"  Saved Fraud GMV:   ${saved_fraud_gmv:>12,.2f}  (fraud we would detect)\n"
                f"  - Lost Revenues:   ${lost_revenues:>12,.2f}  (false positive cost)\n"
                f"  ────────────────────────────────────\n"
                f"  = NET VALUE:       ${net_value:>12,.2f}\n\n"
                f"INTERPRETATION:\n"
                f"Olorin's fraud detection for {entity_type}='{entity_value}' is PROFITABLE.\n"
                f"The value saved from detecting fraud (${saved_fraud_gmv:,.2f}) exceeds\n"
                f"the cost of false positives (${lost_revenues:,.2f}).\n\n"
                f"This means for every dollar lost to false positives, we save\n"
                f"${saved_fraud_gmv / lost_revenues if lost_revenues > 0 else 'N/A':.2f} from fraud detection.\n"
            )
        elif net_value < 0:
            reasoning = (
                f"NET VALUE ANALYSIS{merchant_text}\n"
                f"═══════════════════════════════════════════════════════════════\n\n"
                f"RESULT: ${net_value:,.2f} NET NEGATIVE VALUE ⚠️\n\n"
                f"CALCULATION:\n"
                f"  Saved Fraud GMV:   ${saved_fraud_gmv:>12,.2f}  (fraud we would detect)\n"
                f"  - Lost Revenues:   ${lost_revenues:>12,.2f}  (false positive cost)\n"
                f"  ────────────────────────────────────\n"
                f"  = NET VALUE:       ${net_value:>12,.2f}\n\n"
                f"INTERPRETATION:\n"
                f"⚠️ FALSE POSITIVES EXCEED FRAUD DETECTION VALUE\n\n"
                f"The cost of blocking legitimate transactions (${lost_revenues:,.2f})\n"
                f"is greater than the fraud we would detect (${saved_fraud_gmv:,.2f}).\n\n"
                f"RECOMMENDATION:\n"
                f"  • Review detection thresholds to reduce false positives\n"
                f"  • Consider adjusting risk scores for this entity pattern\n"
                f"  • Investigate if entity should be whitelisted\n"
            )
        else:
            reasoning = (
                f"NET VALUE ANALYSIS{merchant_text}\n"
                f"═══════════════════════════════════════════════════════════════\n\n"
                f"RESULT: $0.00 - BREAK EVEN\n\n"
                f"The saved fraud GMV equals the lost revenues.\n"
                f"Fraud detection is neither adding nor subtracting value.\n"
            )

        breakdown = NetValueBreakdown(
            net_value=net_value,
            formula="Net Value = Saved Fraud GMV - Lost Revenues",
            reasoning=reasoning,
            is_positive=is_positive,
            roi_percentage=roi_percentage,
        )

        logger.info(
            f"[REVENUE] {'✅' if is_positive else '⚠️'} Net Value: ${net_value:,.2f} "
            f"(Saved ${saved_fraud_gmv:,.2f} - Lost ${lost_revenues:,.2f})"
        )
        return net_value, breakdown

    def determine_confidence_level(self, total_tx_count: int) -> ConfidenceLevel:
        """
        Determine confidence level based on transaction volume.

        Args:
            total_tx_count: Total transactions analyzed

        Returns:
            Confidence level (HIGH, MEDIUM, or LOW)
        """
        if total_tx_count >= self.config.high_confidence_min_transactions:
            return ConfidenceLevel.HIGH
        elif total_tx_count >= self.config.medium_confidence_min_transactions:
            return ConfidenceLevel.MEDIUM
        else:
            return ConfidenceLevel.LOW

    async def calculate_revenue_implication(
        self,
        request: RevenueCalculationRequest,
        merchant_name: Optional[str] = None,
    ) -> RevenueImplication:
        """
        Calculate complete revenue implication for an investigation with FULL DETAILED REASONING.

        This is the main entry point for revenue calculations. It:
        1. Calculates Saved Fraud GMV with detailed breakdown
        2. Calculates Lost Revenues with detailed breakdown
        3. Calculates Net Value with interpretation
        4. Compiles all reasoning into a comprehensive report

        Args:
            request: Calculation request with entity and window details
            merchant_name: Optional merchant name for context

        Returns:
            RevenueImplication with all calculated metrics AND detailed breakdowns
        """
        # Log investigation window if available (for methodology)
        inv_window_info = ""
        if request.investigation_window_start and request.investigation_window_end:
            inv_window_info = (
                f"[REVENUE] Investigation Window: {request.investigation_window_start.date()} to "
                f"{request.investigation_window_end.date()}\n"
            )

        logger.info(
            f"\n{'='*70}\n"
            f"[REVENUE] 💰 REVENUE IMPLICATION CALCULATION\n"
            f"{'='*70}\n"
            f"[REVENUE] Investigation: {request.investigation_id}\n"
            f"[REVENUE] Entity: {request.entity_type}='{request.entity_value}'\n"
            f"[REVENUE] Merchant: {merchant_name or 'Unknown'}\n"
            f"{inv_window_info}"
            f"[REVENUE] GMV Window: {request.gmv_window_start.date()} to {request.gmv_window_end.date()}\n"
            f"{'='*70}"
        )

        # Get configuration values
        take_rate = request.take_rate_override or self.config.take_rate_percent
        multiplier = request.lifetime_multiplier_override or self.config.lifetime_multiplier

        # CRITICAL: Validate that Olorin actually predicted this entity as fraudulent
        # Without this check, we cannot claim "Olorin would have saved this money"
        prediction_validation: Optional[PredictionValidation] = None

        if not request.skip_prediction_validation:
            logger.info(f"[REVENUE] Step 0: Validating Olorin predictions in Postgres...")
            prediction_validation = self.validate_prediction_exists(
                request.entity_type,
                request.entity_value,
                request.investigation_id,
            )

            if not prediction_validation.entity_predicted_as_fraud:
                # Olorin did NOT predict this entity as fraud - cannot claim savings
                logger.warning(
                    f"[REVENUE] ⚠️ SKIPPING revenue calculation: {prediction_validation.validation_message}"
                )
                return RevenueImplication(
                    investigation_id=request.investigation_id,
                    entity_type=request.entity_type,
                    entity_value=request.entity_value,
                    merchant_name=merchant_name,
                    saved_fraud_gmv=Decimal("0"),
                    lost_revenues=Decimal("0"),
                    net_value=Decimal("0"),
                    take_rate_used=take_rate,
                    lifetime_multiplier_used=multiplier,
                    gmv_window_start=request.gmv_window_start,
                    gmv_window_end=request.gmv_window_end,
                    investigation_window_start=request.investigation_window_start,
                    investigation_window_end=request.investigation_window_end,
                    prediction_validation=prediction_validation,
                    calculation_successful=True,  # Not an error, just no prediction
                    skipped_due_to_prediction=True,
                    error_message=prediction_validation.validation_message,
                )

            logger.info(f"[REVENUE] ✅ Prediction validated: {prediction_validation.validation_message}")
        else:
            logger.info(f"[REVENUE] Step 0: Skipping prediction validation (pre-validated)")

        try:
            # 1. Calculate Saved Fraud GMV with detailed breakdown
            logger.info(f"[REVENUE] Step 1/3: Calculating Saved Fraud GMV...")
            saved_gmv, approved_fraud_count, saved_breakdown = await self.calculate_saved_fraud_gmv(
                request.entity_type,
                request.entity_value,
                request.gmv_window_start,
                request.gmv_window_end,
                merchant_name,
                request.investigation_window_start,
                request.investigation_window_end,
            )

            # 2. Calculate Lost Revenues with detailed breakdown
            logger.info(f"[REVENUE] Step 2/3: Calculating Lost Revenues...")
            lost_rev, blocked_legit_count, blocked_gmv, lost_breakdown = await self.calculate_lost_revenues(
                request.entity_type,
                request.entity_value,
                request.gmv_window_start,
                request.gmv_window_end,
                take_rate,
                multiplier,
                merchant_name,
                request.investigation_window_start,
                request.investigation_window_end,
            )

            # 3. Calculate Net Value with interpretation
            logger.info(f"[REVENUE] Step 3/3: Calculating Net Value...")
            net_val, net_breakdown = self.calculate_net_value(
                saved_gmv,
                lost_rev,
                request.entity_type,
                request.entity_value,
                merchant_name,
            )

            # Determine confidence
            total_tx = approved_fraud_count + blocked_legit_count
            confidence = self.determine_confidence_level(total_tx)

            # Log summary
            logger.info(
                f"\n{'='*70}\n"
                f"[REVENUE] 📊 REVENUE CALCULATION COMPLETE\n"
                f"{'='*70}\n"
                f"[REVENUE] Saved Fraud GMV:     ${saved_gmv:>12,.2f} ({approved_fraud_count} tx)\n"
                f"[REVENUE] Lost Revenues:       ${lost_rev:>12,.2f} ({blocked_legit_count} tx)\n"
                f"[REVENUE] ──────────────────────────────────────\n"
                f"[REVENUE] NET VALUE:           ${net_val:>12,.2f} {'✅' if net_val >= 0 else '⚠️'}\n"
                f"[REVENUE] Confidence:          {confidence.value.upper()}\n"
                f"{'='*70}"
            )

            return RevenueImplication(
                investigation_id=request.investigation_id,
                entity_type=request.entity_type,
                entity_value=request.entity_value,
                merchant_name=merchant_name,
                saved_fraud_gmv=saved_gmv,
                lost_revenues=lost_rev,
                net_value=net_val,
                # Detailed breakdowns with full reasoning
                saved_fraud_breakdown=saved_breakdown,
                lost_revenues_breakdown=lost_breakdown,
                net_value_breakdown=net_breakdown,
                # Transaction counts
                approved_fraud_tx_count=approved_fraud_count,
                blocked_legitimate_tx_count=blocked_legit_count,
                total_tx_count=total_tx,
                # Configuration used
                take_rate_used=take_rate,
                lifetime_multiplier_used=multiplier,
                # Time windows for methodology explanation
                investigation_window_start=request.investigation_window_start,
                investigation_window_end=request.investigation_window_end,
                gmv_window_start=request.gmv_window_start,
                gmv_window_end=request.gmv_window_end,
                # Prediction validation result
                prediction_validation=prediction_validation,
                confidence_level=confidence,
                calculation_successful=True,
            )

        except Exception as e:
            logger.error(
                f"[REVENUE] ❌ Failed to calculate revenue for {request.investigation_id}: {e}",
                exc_info=True
            )
            return RevenueImplication(
                investigation_id=request.investigation_id,
                entity_type=request.entity_type,
                entity_value=request.entity_value,
                merchant_name=merchant_name,
                take_rate_used=take_rate,
                lifetime_multiplier_used=multiplier,
                gmv_window_start=request.gmv_window_start,
                gmv_window_end=request.gmv_window_end,
                calculation_successful=False,
                error_message=str(e),
            )


def aggregate_revenue_metrics(
    implications: List[RevenueImplication],
) -> RevenueAggregation:
    """
    Aggregate revenue metrics across multiple investigations.

    Args:
        implications: List of individual revenue implications

    Returns:
        Aggregated revenue metrics
    """
    successful = [r for r in implications if r.calculation_successful]
    failed = [r for r in implications if not r.calculation_successful]

    # Aggregate by merchant (if merchant info available)
    merchant_breakdown: Dict[str, Dict[str, Any]] = {}

    for r in successful:
        # Extract merchant from entity or use default
        merchant = "Unknown"  # Would need merchant info passed through

        if merchant not in merchant_breakdown:
            merchant_breakdown[merchant] = {
                "saved_fraud_gmv": Decimal("0"),
                "lost_revenues": Decimal("0"),
                "net_value": Decimal("0"),
                "investigation_count": 0,
            }

        merchant_breakdown[merchant]["saved_fraud_gmv"] += r.saved_fraud_gmv
        merchant_breakdown[merchant]["lost_revenues"] += r.lost_revenues
        merchant_breakdown[merchant]["net_value"] += r.net_value
        merchant_breakdown[merchant]["investigation_count"] += 1

    return RevenueAggregation(
        total_investigations=len(implications),
        successful_calculations=len(successful),
        failed_calculations=len(failed),
        total_saved_fraud_gmv=sum(r.saved_fraud_gmv for r in successful),
        total_lost_revenues=sum(r.lost_revenues for r in successful),
        total_net_value=sum(r.net_value for r in successful),
        total_approved_fraud_tx=sum(r.approved_fraud_tx_count for r in successful),
        total_blocked_legitimate_tx=sum(
            r.blocked_legitimate_tx_count for r in successful
        ),
        merchant_breakdown=merchant_breakdown if merchant_breakdown else None,
    )

