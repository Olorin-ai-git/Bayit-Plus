"""
Model Blindspot Analyzer for nSure vs Olorin Performance Analysis.

2D distribution analyzer for FN/FP/TP/TN across GMV × MODEL_SCORE.
Identifies blind spots where nSure underperforms that Olorin should focus on.

Feature: blindspot-analysis
"""

import csv
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List

from app.config.threshold_config import get_llm_fraud_threshold, get_risk_threshold
from app.service.agent.tools.database_tool import get_database_provider
from app.service.agent.tools.snowflake_tool.schema_constants import (
    GMV,
    IS_FRAUD_TX,
    MODEL_SCORE,
    TX_DATETIME,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ModelBlindspotAnalyzer:
    """
    2D distribution analyzer for FN/FP/TP/TN across GMV × MODEL_SCORE.
    Identifies blind spots where nSure underperforms.
    """

    def __init__(self):
        """Initialize the blindspot analyzer."""
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake")
        self.client = get_database_provider(db_provider)
        logger.info(
            f"ModelBlindspotAnalyzer initialized with {db_provider.upper()} provider"
        )
        self._load_configuration()

    def _load_configuration(self):
        """Load analysis configuration from environment variables."""
        self.num_score_bins = int(os.getenv("BLINDSPOT_SCORE_BINS", "20"))
        gmv_bins_str = os.getenv("BLINDSPOT_GMV_BINS", "0,50,100,250,500,1000,5000")
        self.gmv_bins = [int(x) for x in gmv_bins_str.split(",")]
        self.lookback_months = int(os.getenv("BLINDSPOT_LOOKBACK_MONTHS", "12"))
        self.olorin_threshold = get_risk_threshold()
        self.llm_fraud_threshold = get_llm_fraud_threshold()
        self.prompt_version = os.getenv("LLM_PROMPT_ACTIVE_VERSION", "unknown")

        logger.info(
            f"Blindspot Analyzer configured: score_bins={self.num_score_bins}, "
            f"gmv_bins={self.gmv_bins}, lookback={self.lookback_months}mo, "
            f"olorin_threshold={self.olorin_threshold}, prompt={self.prompt_version}"
        )

    def _get_time_window(self) -> tuple:
        """Get the analysis time window."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30 * self.lookback_months)
        return start_date, end_date

    def _build_gmv_case_statement(self) -> str:
        """Build CASE statement for GMV binning."""
        cases = []
        for i in range(len(self.gmv_bins) - 1):
            low, high = self.gmv_bins[i], self.gmv_bins[i + 1]
            cases.append(f"WHEN {GMV} >= {low} AND {GMV} < {high} THEN '{low}-{high}'")
        last_bin = self.gmv_bins[-1]
        cases.append(f"WHEN {GMV} >= {last_bin} THEN '{last_bin}+'")
        return "CASE " + " ".join(cases) + " ELSE 'unknown' END"

    def _build_2d_distribution_query(self) -> str:
        """Build SQL query for 2D binning analysis."""
        start_date, end_date = self._get_time_window()
        gmv_case = self._build_gmv_case_statement()

        query = f"""
        WITH binned_transactions AS (
            SELECT
                FLOOR({MODEL_SCORE} * {self.num_score_bins}) / {self.num_score_bins} AS score_bin,
                {gmv_case} AS gmv_bin,
                CASE WHEN {MODEL_SCORE} >= {self.olorin_threshold} THEN 1 ELSE 0 END AS predicted_fraud,
                {IS_FRAUD_TX} AS actual_fraud,
                {GMV},
                {MODEL_SCORE}
            FROM {self.client.get_full_table_name()}
            WHERE {TX_DATETIME} >= '{start_date.isoformat()}'
              AND {TX_DATETIME} < '{end_date.isoformat()}'
              AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
              AND {MODEL_SCORE} IS NOT NULL
              AND {GMV} IS NOT NULL
        )
        SELECT
            score_bin,
            gmv_bin,
            SUM(CASE WHEN predicted_fraud = 1 AND actual_fraud = 1 THEN 1 ELSE 0 END) AS tp,
            SUM(CASE WHEN predicted_fraud = 1 AND actual_fraud = 0 THEN 1 ELSE 0 END) AS fp,
            SUM(CASE WHEN predicted_fraud = 0 AND actual_fraud = 1 THEN 1 ELSE 0 END) AS fn,
            SUM(CASE WHEN predicted_fraud = 0 AND actual_fraud = 0 THEN 1 ELSE 0 END) AS tn,
            COUNT(*) AS total_transactions,
            SUM({GMV}) AS total_gmv,
            SUM(CASE WHEN actual_fraud = 1 THEN {GMV} ELSE 0 END) AS fraud_gmv,
            AVG({MODEL_SCORE}) AS avg_score
        FROM binned_transactions
        GROUP BY score_bin, gmv_bin
        ORDER BY gmv_bin, score_bin
        """
        return query

    async def analyze_blindspots(self, export_csv: bool = True) -> Dict[str, Any]:
        """
        Run 2D distribution analysis.

        Args:
            export_csv: Whether to export results to CSV

        Returns:
            Dictionary with analysis results
        """
        try:
            logger.info("Starting model blindspot analysis...")
            self.client.connect()

            query = self._build_2d_distribution_query()
            logger.info(f"Blindspot Query:\n{query}")

            results = await self.client.execute_query_async(query)
            logger.info(f"Query returned {len(results) if results else 0} rows")

            if not results:
                return self._empty_result("No data found in specified time window")

            analysis = self._process_results(results)

            if export_csv:
                csv_path = self._export_to_csv(analysis)
                analysis["csv_export_path"] = csv_path

            logger.info("Blindspot analysis completed successfully")
            return analysis

        except Exception as e:
            logger.error(f"Blindspot analysis failed: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {"status": "failed", "error": str(e)}
        finally:
            self._disconnect()

    def _disconnect(self):
        """Safely disconnect from database."""
        try:
            if hasattr(self.client, "disconnect"):
                self.client.disconnect()
        except Exception as e:
            logger.debug(f"Error during disconnect (non-critical): {e}")

    def _empty_result(self, message: str) -> Dict[str, Any]:
        """Return empty result structure."""
        return {
            "status": "success",
            "message": message,
            "training_info": self._get_training_info(),
            "matrix": {"score_bins": [], "gmv_bins": [], "cells": []},
            "blindspots": [],
            "summary": {},
            "timestamp": datetime.now().isoformat(),
        }

    def _get_training_info(self) -> Dict[str, Any]:
        """Get training configuration metadata."""
        return {
            "olorin_threshold": self.olorin_threshold,
            "prompt_version": self.prompt_version,
            "llm_fraud_threshold": self.llm_fraud_threshold,
            "analysis_timestamp": datetime.now().isoformat(),
        }

    def _process_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process query results into structured format."""
        from app.service.analytics.blindspot_processor import process_blindspot_results
        return process_blindspot_results(results, self._get_training_info(), self.gmv_bins)

    def _export_to_csv(self, analysis: Dict[str, Any]) -> str:
        """Export analysis to CSV file."""
        artifacts_dir = os.getenv("ARTIFACTS_DIR", "artifacts")
        os.makedirs(artifacts_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_path = f"{artifacts_dir}/blindspot_analysis_{timestamp}.csv"

        cells = analysis.get("matrix", {}).get("cells", [])
        if not cells:
            logger.warning("No cells to export to CSV")
            return csv_path

        with open(csv_path, "w", newline="") as csvfile:
            fieldnames = [
                "score_bin", "gmv_bin", "tp", "fp", "fn", "tn",
                "fn_rate", "fp_rate", "precision", "recall", "f1",
                "total_transactions", "fraud_gmv"
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for cell in cells:
                writer.writerow({k: cell.get(k, 0) for k in fieldnames})

        logger.info(f"CSV exported to: {csv_path}")
        return csv_path
