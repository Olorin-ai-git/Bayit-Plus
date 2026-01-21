"""
Model Score Distribution Analyzer for Fraud Detection.

Analyzes the distribution of model scores across approved transactions,
segmented by fraud vs safe transactions, to inform selection thresholds.

Based on statistical analysis approach: visualize GMV distribution across
score buckets to understand model calibration and optimal cutoffs.
"""

import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.service.agent.tools.database_tool import get_database_provider
from app.service.agent.tools.snowflake_tool.schema_constants import (
    GMV,
    IS_FRAUD_TX,
    MODEL_SCORE,
    TX_DATETIME,
    is_valid_column,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ScoreDistributionAnalyzer:
    """
    Analyzes model score distribution for approved transactions.

    Creates histogram data showing fraud vs safe GMV across score buckets
    to inform selection algorithm optimization.
    """

    def __init__(self):
        """Initialize the score distribution analyzer."""
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake")
        self.client = get_database_provider(db_provider)
        logger.info(
            f"ScoreDistributionAnalyzer initialized with {db_provider.upper()} provider"
        )
        self._load_configuration()

    def _load_configuration(self):
        """Load analysis configuration from environment."""
        self.num_buckets = int(os.getenv("ANALYSIS_NUM_BUCKETS", "20"))
        self.reference_date = os.getenv("SELECTOR_REFERENCE_DATE")
        self.time_window_hours = int(os.getenv("SELECTOR_TIME_WINDOW_HOURS", "24"))
        self.lookback_months = int(os.getenv("SELECTOR_HISTORICAL_OFFSET_MONTHS", "12"))

        logger.info(
            f"Distribution Analyzer configured: buckets={self.num_buckets}, "
            f"window={self.time_window_hours}h, lookback={self.lookback_months}mo"
        )

    def _get_reference_time(self) -> datetime:
        """Get reference time for analysis (uses SELECTOR_HISTORICAL_OFFSET_MONTHS)."""
        if self.reference_date:
            try:
                if len(self.reference_date) == 10:
                    self.reference_date += "T12:00:00"
                return datetime.fromisoformat(self.reference_date)
            except ValueError:
                logger.warning(
                    f"Invalid SELECTOR_REFERENCE_DATE format: {self.reference_date}"
                )

        return datetime.utcnow() - timedelta(days=30 * self.lookback_months)

    def _build_approved_filter(self, decision_col: str, db_provider: str) -> str:
        """Build case-insensitive APPROVED filter."""
        if db_provider == "snowflake":
            return f"UPPER({decision_col}) = 'APPROVED'"
        else:
            return f"UPPER({decision_col}) = 'APPROVED'"

    def _build_distribution_query(self) -> str:
        """
        Build SQL query for score distribution analysis.

        Returns:
            SQL query string
        """
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake").lower()
        datetime_col = "TX_DATETIME" if db_provider == "snowflake" else "tx_datetime"
        fraud_col = "IS_FRAUD_TX" if db_provider == "snowflake" else "is_fraud_tx"
        decision_col = (
            "NSURE_LAST_DECISION"
            if db_provider == "snowflake"
            else "nSure_last_decision"
        )

        approved_filter = self._build_approved_filter(decision_col, db_provider)

        reference_time = self._get_reference_time()
        window_start = reference_time - timedelta(hours=self.time_window_hours)
        window_end = reference_time

        logger.info(
            f"Analysis window: {window_start.isoformat()} to {window_end.isoformat()}"
        )

        bucket_size = 1.0 / self.num_buckets

        if db_provider == "snowflake":
            date_filter = f"{datetime_col} >= '{window_start.isoformat()}' AND {datetime_col} < '{window_end.isoformat()}'"
        else:
            date_filter = f"{datetime_col} >= '{window_start.isoformat()}' AND {datetime_col} < '{window_end.isoformat()}'"

        query = f"""
        WITH score_buckets AS (
            SELECT
                FLOOR({MODEL_SCORE} * {self.num_buckets}) / {self.num_buckets} AS score_bucket_min,
                (FLOOR({MODEL_SCORE} * {self.num_buckets}) + 1) / {self.num_buckets} AS score_bucket_max,
                CASE WHEN {fraud_col} = 1 THEN 'fraud' ELSE 'safe' END AS tx_type,
                {GMV},
                {MODEL_SCORE}
            FROM {self.client.get_full_table_name()}
            WHERE {date_filter}
              AND {approved_filter}
              AND {MODEL_SCORE} IS NOT NULL
              AND {GMV} IS NOT NULL
        )
        SELECT
            score_bucket_min,
            score_bucket_max,
            tx_type,
            COUNT(*) as transaction_count,
            SUM({GMV}) as total_gmv,
            AVG({GMV}) as avg_gmv,
            MIN({GMV}) as min_gmv,
            MAX({GMV}) as max_gmv,
            AVG({MODEL_SCORE}) as avg_score
        FROM score_buckets
        GROUP BY score_bucket_min, score_bucket_max, tx_type
        ORDER BY score_bucket_min, tx_type
        """

        return query

    async def analyze_distribution(
        self, export_csv: bool = True
    ) -> Dict[str, Any]:
        """
        Analyze model score distribution across fraud and safe transactions.

        Args:
            export_csv: Whether to export results to CSV

        Returns:
            Dictionary with distribution analysis results
        """
        try:
            logger.info("🔄 Starting model score distribution analysis...")

            self.client.connect()

            query = self._build_distribution_query()
            logger.info(f"📝 Distribution Query:\n{query}")

            results = await self.client.execute_query_async(query)
            logger.info(f"📊 Query returned {len(results) if results else 0} rows")

            if not results:
                return {
                    "status": "success",
                    "message": "No data found in specified time window",
                    "buckets": [],
                    "timestamp": datetime.now().isoformat(),
                }

            analysis = self._process_distribution_results(results)

            if export_csv:
                csv_path = self._export_to_csv(analysis)
                analysis["csv_export_path"] = csv_path

            logger.info("✅ Distribution analysis completed")
            return analysis

        except Exception as e:
            logger.error(f"❌ Distribution analysis failed: {e}")
            import traceback

            logger.error(f"📜 Full traceback: {traceback.format_exc()}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }
        finally:
            try:
                if hasattr(self.client, "disconnect_async"):
                    await self.client.disconnect_async()
                elif hasattr(self.client, "disconnect"):
                    disconnect_method = getattr(self.client, "disconnect")
                    if callable(disconnect_method):
                        import inspect

                        if inspect.iscoroutinefunction(disconnect_method):
                            await disconnect_method()
                        else:
                            disconnect_method()
            except Exception as e:
                logger.debug(f"Error during disconnect (non-critical): {e}")

    def _process_distribution_results(
        self, results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Process distribution query results into structured format."""
        buckets = {}

        for row in results:
            bucket_min_val = row.get("SCORE_BUCKET_MIN")
            if bucket_min_val is None:
                bucket_min_val = row.get("score_bucket_min")

            bucket_max_val = row.get("SCORE_BUCKET_MAX")
            if bucket_max_val is None:
                bucket_max_val = row.get("score_bucket_max")

            if bucket_min_val is None or bucket_max_val is None:
                logger.warning(f"Skipping row with missing bucket values: {row}")
                continue

            bucket_min = float(bucket_min_val)
            bucket_max = float(bucket_max_val)
            tx_type = (row.get("TX_TYPE") or row.get("tx_type") or "").lower()

            bucket_key = f"{bucket_min:.3f}-{bucket_max:.3f}"

            if bucket_key not in buckets:
                buckets[bucket_key] = {
                    "bucket_min": bucket_min,
                    "bucket_max": bucket_max,
                    "fraud_gmv": 0.0,
                    "safe_gmv": 0.0,
                    "fraud_count": 0,
                    "safe_count": 0,
                    "fraud_avg_gmv": 0.0,
                    "safe_avg_gmv": 0.0,
                }

            gmv = float(row.get("TOTAL_GMV") or row.get("total_gmv") or 0)
            count = int(row.get("TRANSACTION_COUNT") or row.get("transaction_count") or 0)
            avg_gmv = float(row.get("AVG_GMV") or row.get("avg_gmv") or 0)

            if tx_type == "fraud":
                buckets[bucket_key]["fraud_gmv"] = gmv
                buckets[bucket_key]["fraud_count"] = count
                buckets[bucket_key]["fraud_avg_gmv"] = avg_gmv
            else:
                buckets[bucket_key]["safe_gmv"] = gmv
                buckets[bucket_key]["safe_count"] = count
                buckets[bucket_key]["safe_avg_gmv"] = avg_gmv

        sorted_buckets = sorted(buckets.values(), key=lambda x: x["bucket_min"])

        total_fraud_gmv = sum(b["fraud_gmv"] for b in sorted_buckets)
        total_safe_gmv = sum(b["safe_gmv"] for b in sorted_buckets)
        total_fraud_count = sum(b["fraud_count"] for b in sorted_buckets)
        total_safe_count = sum(b["safe_count"] for b in sorted_buckets)

        return {
            "status": "success",
            "buckets": sorted_buckets,
            "summary": {
                "total_fraud_gmv": round(total_fraud_gmv, 2),
                "total_safe_gmv": round(total_safe_gmv, 2),
                "total_fraud_count": total_fraud_count,
                "total_safe_count": total_safe_count,
                "fraud_percentage": (
                    round(total_fraud_count / (total_fraud_count + total_safe_count) * 100, 2)
                    if (total_fraud_count + total_safe_count) > 0
                    else 0
                ),
                "num_buckets": len(sorted_buckets),
            },
            "timestamp": datetime.now().isoformat(),
        }

    def _export_to_csv(self, analysis: Dict[str, Any]) -> str:
        """Export distribution analysis to CSV file."""
        import csv

        artifacts_dir = os.getenv("ARTIFACTS_DIR", "olorin-server/artifacts")
        os.makedirs(artifacts_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_path = f"{artifacts_dir}/score_distribution_{timestamp}.csv"

        with open(csv_path, "w", newline="") as csvfile:
            fieldnames = [
                "bucket_range",
                "bucket_min",
                "bucket_max",
                "fraud_gmv",
                "safe_gmv",
                "fraud_count",
                "safe_count",
                "fraud_percentage",
                "total_gmv",
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for bucket in analysis["buckets"]:
                total_count = bucket["fraud_count"] + bucket["safe_count"]
                fraud_pct = (
                    round(bucket["fraud_count"] / total_count * 100, 2)
                    if total_count > 0
                    else 0
                )

                writer.writerow(
                    {
                        "bucket_range": f"{bucket['bucket_min']:.3f}-{bucket['bucket_max']:.3f}",
                        "bucket_min": bucket["bucket_min"],
                        "bucket_max": bucket["bucket_max"],
                        "fraud_gmv": round(bucket["fraud_gmv"], 2),
                        "safe_gmv": round(bucket["safe_gmv"], 2),
                        "fraud_count": bucket["fraud_count"],
                        "safe_count": bucket["safe_count"],
                        "fraud_percentage": fraud_pct,
                        "total_gmv": round(
                            bucket["fraud_gmv"] + bucket["safe_gmv"], 2
                        ),
                    }
                )

        logger.info(f"📁 CSV exported to: {csv_path}")
        return csv_path
