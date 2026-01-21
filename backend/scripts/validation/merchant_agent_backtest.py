"""
Merchant Agent Backtesting and Validation Framework

Validates merchant agent strategy by:
1. Running merchant agent on historical data (24h from 6 months ago)
2. Comparing predictions with actual outcomes (today's data)
3. Calculating accuracy metrics and validation scores

Usage:
    python merchant_agent_backtest.py --entity-type user_id --entity-id USER_12345
    python merchant_agent_backtest.py --entity-type email --entity-id user@example.com --historical-days 180
"""

import argparse
import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.service.agent.orchestration.domain_agents.merchant_agent import (
    merchant_agent_node,
)
from app.service.agent.orchestration.state_schema import InvestigationState
from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MerchantAgentBacktester:
    """Backtesting framework for merchant agent validation."""

    def __init__(self, historical_days: int = 180):
        """
        Initialize backtester.

        Args:
            historical_days: Number of days to look back for historical data (default: 180 = 6 months)
        """
        self.historical_days = historical_days
        self.snowflake_client = None

    async def initialize(self):
        """Initialize Snowflake client."""
        self.snowflake_client = RealSnowflakeClient()
        await self.snowflake_client.connect()
        logger.info(f"✅ Snowflake client initialized for backtesting")

    async def cleanup(self):
        """Cleanup resources."""
        if self.snowflake_client:
            await self.snowflake_client.disconnect()
            logger.info("✅ Snowflake client disconnected")

    async def fetch_historical_data(
        self, entity_type: str, entity_id: str, historical_date: datetime
    ) -> Dict[str, Any]:
        """
        Fetch historical transaction data for a specific date (24h window).

        Args:
            entity_type: Type of entity (user_id, email, ip, etc.)
            entity_id: Entity identifier
            historical_date: Date to fetch historical data for (start of 24h window)

        Returns:
            Dictionary with Snowflake query results
        """
        # Calculate 24h window
        window_start = historical_date
        window_end = historical_date + timedelta(hours=24)

        # Build entity filter based on entity type
        entity_filters = {
            "user_id": f"EMAIL = '{entity_id}' OR USER_ID = '{entity_id}'",
            "email": f"EMAIL = '{entity_id}'",
            "ip": f"IP = '{entity_id}'",
            "device_id": f"DEVICE_ID = '{entity_id}'",
        }

        entity_filter = entity_filters.get(
            entity_type.lower(), f"EMAIL = '{entity_id}'"
        )

        # Build query for historical 24h window
        query = f"""
        SELECT 
            TX_ID_KEY,
            TX_DATETIME,
            MERCHANT_NAME,
            MERCHANT_SEGMENT_ID,
            MERCHANT_RISK_LEVEL,
            MERCHANT_DECISIONS,
            MERCHANT_LAST_DECISION,
            MERCHANT_LAST_DECISION_DATETIME,
            COUNT_MERCHANT_DECISIONS,
            DAYS_FROM_FIRST_MERCHANT_ACCEPTANCE_TO_TX,
            PAID_AMOUNT_VALUE_IN_CURRENCY,
            MODEL_SCORE,
            IS_FRAUD_TX,
            EMAIL,
            USER_ID,
            IP,
            DEVICE_ID
        FROM DBT.DBT_PROD.TXS
        WHERE {entity_filter}
          AND TX_DATETIME >= '{window_start.isoformat()}'
          AND TX_DATETIME < '{window_end.isoformat()}'
        ORDER BY TX_DATETIME ASC
        """

        logger.info(f"📊 Fetching historical data for {entity_type}={entity_id}")
        logger.info(
            f"   Window: {window_start.isoformat()} to {window_end.isoformat()}"
        )

        try:
            results = await self.snowflake_client.execute_query(query)
            logger.info(f"✅ Fetched {len(results)} historical transactions")

            return {
                "results": results,
                "row_count": len(results),
                "window_start": window_start.isoformat(),
                "window_end": window_end.isoformat(),
            }
        except Exception as e:
            logger.error(f"❌ Failed to fetch historical data: {e}")
            return {"results": [], "row_count": 0}

    async def fetch_actual_outcomes(
        self, entity_type: str, entity_id: str, historical_date: datetime
    ) -> Dict[str, Any]:
        """
        Fetch actual fraud outcomes for transactions that occurred after the historical window.

        This fetches data from today (or recent period) to see what actually happened
        with the entities identified in the historical period.

        Args:
            entity_type: Type of entity
            entity_id: Entity identifier
            historical_date: Historical date we're validating

        Returns:
            Dictionary with actual outcomes (fraud flags, chargebacks, etc.)
        """
        # Look at outcomes from historical_date + 1 day to today
        # This gives us time to see if fraud was confirmed
        outcome_start = historical_date + timedelta(days=1)
        outcome_end = datetime.now()

        entity_filters = {
            "user_id": f"EMAIL = '{entity_id}' OR USER_ID = '{entity_id}'",
            "email": f"EMAIL = '{entity_id}'",
            "ip": f"IP = '{entity_id}'",
            "device_id": f"DEVICE_ID = '{entity_id}'",
        }

        entity_filter = entity_filters.get(
            entity_type.lower(), f"EMAIL = '{entity_id}'"
        )

        # Query for actual outcomes
        query = f"""
        SELECT 
            TX_ID_KEY,
            TX_DATETIME,
            IS_FRAUD_TX,
            MERCHANT_NAME,
            PAID_AMOUNT_VALUE_IN_CURRENCY,
            MODEL_SCORE,
            NSURE_LAST_DECISION
        FROM DBT.DBT_PROD.TXS
        WHERE {entity_filter}
          AND TX_DATETIME >= '{outcome_start.isoformat()}'
          AND TX_DATETIME <= '{outcome_end.isoformat()}'
        ORDER BY TX_DATETIME ASC
        """

        logger.info(f"📊 Fetching actual outcomes for {entity_type}={entity_id}")
        logger.info(
            f"   Outcome window: {outcome_start.isoformat()} to {outcome_end.isoformat()}"
        )

        try:
            results = await self.snowflake_client.execute_query(query)
            logger.info(f"✅ Fetched {len(results)} outcome transactions")

            # Calculate fraud statistics
            total_transactions = len(results)
            fraud_transactions = sum(
                1
                for r in results
                if r.get("IS_FRAUD_TX") == 1 or r.get("IS_FRAUD_TX") == "1"
            )
            blocked_transactions = sum(
                1
                for r in results
                if r.get("NSURE_LAST_DECISION") == "BLOCK"
                or r.get("NSURE_LAST_DECISION") == "REJECT"
            )

            return {
                "results": results,
                "row_count": total_transactions,
                "fraud_count": fraud_transactions,
                "blocked_count": blocked_transactions,
                "fraud_rate": (
                    fraud_transactions / total_transactions
                    if total_transactions > 0
                    else 0.0
                ),
                "outcome_start": outcome_start.isoformat(),
                "outcome_end": outcome_end.isoformat(),
            }
        except Exception as e:
            logger.error(f"❌ Failed to fetch actual outcomes: {e}")
            return {
                "results": [],
                "row_count": 0,
                "fraud_count": 0,
                "blocked_count": 0,
                "fraud_rate": 0.0,
            }

    async def run_merchant_agent_on_historical(
        self, entity_type: str, entity_id: str, historical_date: datetime
    ) -> Dict[str, Any]:
        """
        Run merchant agent on historical data and get predictions.

        Args:
            entity_type: Type of entity
            entity_id: Entity identifier
            historical_date: Historical date to analyze

        Returns:
            Merchant agent findings and risk score
        """
        # Fetch historical data
        historical_data = await self.fetch_historical_data(
            entity_type, entity_id, historical_date
        )

        if historical_data["row_count"] == 0:
            logger.warning(
                f"⚠️ No historical data found for {entity_type}={entity_id} on {historical_date.date()}"
            )
            return {"error": "no_historical_data", "risk_score": None, "findings": {}}

        # Create investigation state for merchant agent
        investigation_state: InvestigationState = {
            "investigation_id": f"backtest_{entity_id}_{historical_date.date()}",
            "entity_id": entity_id,
            "entity_type": entity_type,
            "snowflake_data": historical_data,
            "tool_results": {},
            "domain_findings": {},
            "tools_used": [],
            "risk_indicators": [],
        }

        # Run merchant agent
        logger.info(f"🔍 Running merchant agent on historical data...")
        try:
            result_state = await merchant_agent_node(investigation_state)
            merchant_findings = result_state.get("domain_findings", {}).get(
                "merchant", {}
            )

            risk_score = merchant_findings.get("risk_score")
            confidence = merchant_findings.get("confidence")

            logger.info(f"✅ Merchant agent completed")
            logger.info(f"   Risk score: {risk_score}")
            logger.info(f"   Confidence: {confidence}")

            return {
                "risk_score": risk_score,
                "confidence": confidence,
                "findings": merchant_findings,
                "historical_transactions": historical_data["row_count"],
            }
        except Exception as e:
            logger.error(f"❌ Merchant agent failed: {e}", exc_info=True)
            return {"error": str(e), "risk_score": None, "findings": {}}

    async def validate_predictions(
        self, predictions: Dict[str, Any], actual_outcomes: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compare predictions with actual outcomes and calculate validation metrics.

        Args:
            predictions: Merchant agent predictions (risk_score, findings, etc.)
            actual_outcomes: Actual fraud outcomes

        Returns:
            Validation metrics and comparison results
        """
        if predictions.get("error"):
            return {"error": predictions["error"], "validation_complete": False}

        predicted_risk = predictions.get("risk_score", 0.0)
        predicted_confidence = predictions.get("confidence", 0.0)

        actual_fraud_rate = actual_outcomes.get("fraud_rate", 0.0)
        actual_fraud_count = actual_outcomes.get("fraud_count", 0)
        actual_total = actual_outcomes.get("row_count", 0)

        # Calculate validation metrics
        # High risk prediction (>0.6) should correlate with high fraud rate (>0.2)
        predicted_high_risk = (
            predicted_risk > 0.6 if predicted_risk is not None else False
        )
        actual_high_fraud = actual_fraud_rate > 0.2

        # Calculate accuracy
        prediction_correct = predicted_high_risk == actual_high_fraud

        # Calculate risk score correlation
        risk_correlation = (
            abs(predicted_risk - actual_fraud_rate)
            if predicted_risk is not None
            else None
        )

        validation_results = {
            "validation_complete": True,
            "predicted_risk_score": predicted_risk,
            "predicted_confidence": predicted_confidence,
            "predicted_high_risk": predicted_high_risk,
            "actual_fraud_rate": actual_fraud_rate,
            "actual_fraud_count": actual_fraud_count,
            "actual_total_transactions": actual_total,
            "actual_high_fraud": actual_high_fraud,
            "prediction_correct": prediction_correct,
            "risk_correlation_error": risk_correlation,
            "historical_transactions": predictions.get("historical_transactions", 0),
        }

        logger.info(f"📊 Validation Results:")
        logger.info(
            f"   Predicted Risk: {predicted_risk:.3f} (High Risk: {predicted_high_risk})"
        )
        logger.info(
            f"   Actual Fraud Rate: {actual_fraud_rate:.3f} (High Fraud: {actual_high_fraud})"
        )
        logger.info(f"   Prediction Correct: {prediction_correct}")
        logger.info(
            f"   Risk Correlation Error: {risk_correlation:.3f}"
            if risk_correlation
            else "   Risk Correlation Error: N/A"
        )

        return validation_results

    async def run_backtest(
        self,
        entity_type: str,
        entity_id: str,
        historical_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Run complete backtest: historical prediction + actual outcome comparison.

        Args:
            entity_type: Type of entity
            entity_id: Entity identifier
            historical_date: Historical date to test (default: 6 months ago)

        Returns:
            Complete backtest results
        """
        if historical_date is None:
            historical_date = datetime.now() - timedelta(days=self.historical_days)

        logger.info(f"🚀 Starting backtest for {entity_type}={entity_id}")
        logger.info(f"   Historical date: {historical_date.date()}")
        logger.info(f"   Historical days offset: {self.historical_days}")

        # Step 1: Run merchant agent on historical data
        predictions = await self.run_merchant_agent_on_historical(
            entity_type, entity_id, historical_date
        )

        # Step 2: Fetch actual outcomes
        actual_outcomes = await self.fetch_actual_outcomes(
            entity_type, entity_id, historical_date
        )

        # Step 3: Validate predictions
        validation = await self.validate_predictions(predictions, actual_outcomes)

        # Combine results
        backtest_results = {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "historical_date": historical_date.isoformat(),
            "predictions": predictions,
            "actual_outcomes": actual_outcomes,
            "validation": validation,
            "timestamp": datetime.now().isoformat(),
        }

        return backtest_results


async def main():
    """Main entry point for backtesting script."""
    parser = argparse.ArgumentParser(
        description="Backtest merchant agent on historical data"
    )
    parser.add_argument(
        "--entity-type",
        required=True,
        help="Entity type (user_id, email, ip, device_id)",
    )
    parser.add_argument("--entity-id", required=True, help="Entity identifier")
    parser.add_argument(
        "--historical-days",
        type=int,
        default=180,
        help="Days to look back (default: 180 = 6 months)",
    )
    parser.add_argument(
        "--historical-date",
        help="Specific historical date (YYYY-MM-DD), overrides historical-days",
    )
    parser.add_argument("--output", help="Output file path for results JSON")

    args = parser.parse_args()

    # Parse historical date if provided
    historical_date = None
    if args.historical_date:
        try:
            historical_date = datetime.fromisoformat(args.historical_date)
        except ValueError:
            logger.error(
                f"❌ Invalid historical date format: {args.historical_date}. Use YYYY-MM-DD"
            )
            return

    # Initialize backtester
    backtester = MerchantAgentBacktester(historical_days=args.historical_days)

    try:
        await backtester.initialize()

        # Run backtest
        results = await backtester.run_backtest(
            entity_type=args.entity_type,
            entity_id=args.entity_id,
            historical_date=historical_date,
        )

        # Output results
        if args.output:
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w") as f:
                json.dump(results, f, indent=2)
            logger.info(f"✅ Results saved to {output_path}")
        else:
            print(json.dumps(results, indent=2))

        # Print summary
        validation = results.get("validation", {})
        if validation.get("validation_complete"):
            print("\n" + "=" * 60)
            print("BACKTEST SUMMARY")
            print("=" * 60)
            print(f"Entity: {args.entity_type}={args.entity_id}")
            print(f"Historical Date: {results['historical_date']}")
            print(
                f"\nPredicted Risk Score: {validation.get('predicted_risk_score', 'N/A')}"
            )
            print(f"Actual Fraud Rate: {validation.get('actual_fraud_rate', 0):.3f}")
            print(f"Prediction Correct: {validation.get('prediction_correct', False)}")
            print(
                f"Risk Correlation Error: {validation.get('risk_correlation_error', 'N/A')}"
            )
            print("=" * 60)

    except Exception as e:
        logger.error(f"❌ Backtest failed: {e}", exc_info=True)
    finally:
        await backtester.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
