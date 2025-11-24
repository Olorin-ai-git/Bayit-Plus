"""
Data Analyzer

Analyzes and summarizes investigation data.
"""

from typing import Dict, Any

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DataAnalyzer:
    """Analyzes and summarizes investigation data."""

    @staticmethod
    def summarize_snowflake_data(snowflake_data) -> str:
        """Summarize Snowflake data for tool selection - handles both string and dict."""
        if not snowflake_data:
            return "No Snowflake data available yet"

        # Handle both string (non-JSON) and dict (JSON) data
        if isinstance(snowflake_data, str):
            # Summarize string data instead of showing raw content
            return f"Snowflake data available ({len(snowflake_data)} chars)"

        if not isinstance(snowflake_data, dict):
            return f"Snowflake data type: {type(snowflake_data).__name__}"

        # Extract key metrics from JSON data
        summary_parts = []

        if "results" in snowflake_data:
            results = snowflake_data["results"]
            summary_parts.append(f"- {len(results)} records analyzed")

            # Look for high risk scores
            # CRITICAL FIX: Handle None values to prevent TypeError
            high_risk = [r for r in results if r.get("MODEL_SCORE") is not None and r.get("MODEL_SCORE", 0) > 0.7]
            if high_risk:
                summary_parts.append(f"- {len(high_risk)} high-risk transactions found")

            # CRITICAL: No fraud indicators can be used during investigation to prevent data leakage
            # All fraud indicator columns (IS_FRAUD_TX, COUNT_DISPUTES, COUNT_FRAUD_ALERTS, etc.) are excluded
            # Summary must be based on behavioral patterns only

        if "row_count" in snowflake_data:
            summary_parts.append(f"- Total rows: {snowflake_data['row_count']}")

        return "\n".join(summary_parts) if summary_parts else "Snowflake data received"

    @staticmethod
    def extract_key_metrics(snowflake_data) -> Dict[str, Any]:
        """Extract key metrics from Snowflake data."""
        metrics = {
            "total_records": 0,
            "high_risk_count": 0,
            "fraud_count": 0,
            "average_risk_score": 0.0,
            "date_range": None
        }

        if not isinstance(snowflake_data, dict) or "results" not in snowflake_data:
            return metrics

        results = snowflake_data["results"]
        if not results:
            return metrics

        metrics["total_records"] = len(results)

        # Calculate risk metrics
        # CRITICAL FIX: Filter out None values to prevent TypeError
        model_scores = [r.get("MODEL_SCORE") for r in results if "MODEL_SCORE" in r and r.get("MODEL_SCORE") is not None]
        if model_scores:
            metrics["average_risk_score"] = sum(model_scores) / len(model_scores)
            metrics["high_risk_count"] = len([s for s in model_scores if s > 0.7])

        # CRITICAL: No fraud indicators can be used during investigation to prevent data leakage
        # All fraud indicator columns (IS_FRAUD_TX, COUNT_DISPUTES, COUNT_FRAUD_ALERTS, etc.) are excluded
        # Fraud count must be based on behavioral patterns only (e.g., rejected transactions)
        metrics["fraud_count"] = len([r for r in results 
                                     if r.get("NSURE_LAST_DECISION") in ("REJECT", "BLOCK", "DECLINE")])

        # Extract date range
        if results:
            first_date = results[0].get('TX_DATETIME', 'N/A')
            last_date = results[-1].get('TX_DATETIME', 'N/A') if len(results) > 1 else first_date
            metrics["date_range"] = f"{first_date} to {last_date}"

        return metrics

    @staticmethod
    def analyze_risk_patterns(snowflake_data) -> Dict[str, Any]:
        """Analyze risk patterns in Snowflake data."""
        patterns = {
            "risk_distribution": {},
            "fraud_indicators": [],
            "temporal_patterns": {},
            "geographic_patterns": {}
        }

        if not isinstance(snowflake_data, dict) or "results" not in snowflake_data:
            return patterns

        results = snowflake_data["results"]
        if not results:
            return patterns

        # Analyze risk score distribution
        # CRITICAL FIX: Handle None values to prevent TypeError
        risk_ranges = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        for record in results:
            score = record.get("MODEL_SCORE")
            if score is None:
                continue  # Skip None scores
            if score < 0.3:
                risk_ranges["low"] += 1
            elif score < 0.6:
                risk_ranges["medium"] += 1
            elif score < 0.8:
                risk_ranges["high"] += 1
            else:
                risk_ranges["critical"] += 1

        patterns["risk_distribution"] = risk_ranges

        # Identify fraud indicators
        fraud_indicators = []
        for record in results:
            # CRITICAL: No fraud indicators can be used during investigation to prevent data leakage
            # All fraud indicator columns (IS_FRAUD_TX, COUNT_DISPUTES, COUNT_FRAUD_ALERTS, etc.) are excluded
            # Fraud indicators must be based on behavioral patterns only
            if record.get("NSURE_LAST_DECISION") == "reject":
                fraud_indicators.append("Transaction rejected by rules")
            # CRITICAL FIX: Handle None values to prevent TypeError
            model_score = record.get("MODEL_SCORE")
            if model_score is not None and model_score > 0.9:
                fraud_indicators.append("Very high risk score")

        patterns["fraud_indicators"] = list(set(fraud_indicators))

        return patterns