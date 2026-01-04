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
from app.service.analytics.blindspot_query_builder import build_2d_distribution_query
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ModelBlindspotAnalyzer:
    """2D distribution analyzer for FN/FP/TP/TN across GMV × MODEL_SCORE."""

    def __init__(self):
        """Initialize the blindspot analyzer."""
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake")
        self.client = get_database_provider(db_provider)
        logger.info(f"ModelBlindspotAnalyzer initialized with {db_provider.upper()} provider")
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

    def _get_time_window(self, start_date: datetime = None, end_date: datetime = None) -> tuple:
        """Get the analysis time window."""
        if end_date is None:
            end_date = datetime.utcnow()
        if start_date is None:
            start_date = end_date - timedelta(days=30 * self.lookback_months)
        return start_date, end_date

    async def analyze_blindspots(
        self,
        export_csv: bool = True,
        start_date: datetime = None,
        end_date: datetime = None,
    ) -> Dict[str, Any]:
        """
        Run 2D distribution analysis.

        Args:
            export_csv: Whether to export results to CSV
            start_date: Optional start date for analysis window
            end_date: Optional end date for analysis window

        Returns:
            Dictionary with analysis results
        """
        try:
            actual_start, actual_end = self._get_time_window(start_date, end_date)
            logger.info(
                f"Starting model blindspot analysis for period: "
                f"{actual_start.strftime('%Y-%m-%d')} to {actual_end.strftime('%Y-%m-%d')}"
            )
            self.client.connect()

            # Query 1: nSure Approved Only (primary blindspot view)
            query_approved = build_2d_distribution_query(
                self.client.get_full_table_name(),
                self.gmv_bins,
                self.num_score_bins,
                self.olorin_threshold,
                actual_start,
                actual_end,
                nsure_approved_only=True,
            )
            logger.info("Running query for nSure APPROVED transactions...")
            results_approved = await self.client.execute_query_async(query_approved)
            logger.info(f"Approved query returned {len(results_approved) if results_approved else 0} rows")

            # Query 2: All Transactions
            query_all = build_2d_distribution_query(
                self.client.get_full_table_name(),
                self.gmv_bins,
                self.num_score_bins,
                self.olorin_threshold,
                actual_start,
                actual_end,
                nsure_approved_only=False,
            )
            logger.info("Running query for ALL transactions...")
            results_all = await self.client.execute_query_async(query_all)
            logger.info(f"All transactions query returned {len(results_all) if results_all else 0} rows")

            if not results_approved and not results_all:
                return self._empty_result("No data found in specified time window")

            # Process both result sets
            analysis_approved = self._process_results(results_approved) if results_approved else None
            analysis_all = self._process_results(results_all) if results_all else None

            # Use approved as primary, include all as secondary
            analysis = analysis_approved if analysis_approved else analysis_all
            analysis["analysis_period"] = {
                "start_date": actual_start.strftime("%Y-%m-%d"),
                "end_date": actual_end.strftime("%Y-%m-%d"),
            }

            # Include both datasets for toggle
            if analysis_all:
                analysis["all_transactions"] = {
                    "gmv_by_score": analysis_all.get("gmv_by_score", []),
                    "matrix": analysis_all.get("matrix", {}),
                    "summary": analysis_all.get("summary", {}),
                }

            # Include SQL queries for transparency
            analysis["sql_queries"] = {
                "all_transactions": query_all,
                "nsure_approved_only": query_approved,
            }

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

    async def analyze_investigated_entities(
        self,
        entity_ids: List[str],
        start_date: datetime = None,
        end_date: datetime = None,
    ) -> Dict[str, Any]:
        """
        Run 2D distribution analysis filtered to specific entity IDs.

        Args:
            entity_ids: List of entity IDs (emails) to filter by
            start_date: Optional start date for analysis window
            end_date: Optional end date for analysis window

        Returns:
            Dictionary with analysis results for investigated entities only
        """
        if not entity_ids:
            return self._empty_result("No entity IDs provided")

        try:
            actual_start, actual_end = self._get_time_window(start_date, end_date)
            logger.info(
                f"Running investigated entities analysis for {len(entity_ids)} entities, "
                f"period: {actual_start.strftime('%Y-%m-%d')} to {actual_end.strftime('%Y-%m-%d')}"
            )
            self.client.connect()

            query = build_2d_distribution_query(
                self.client.get_full_table_name(),
                self.gmv_bins,
                self.num_score_bins,
                self.olorin_threshold,
                actual_start,
                actual_end,
                nsure_approved_only=False,
                entity_ids=entity_ids,
            )
            logger.info(f"Running query for {len(entity_ids)} investigated entities...")
            results = await self.client.execute_query_async(query)
            logger.info(f"Investigated entities query returned {len(results) if results else 0} rows")

            if not results:
                return self._empty_result("No data found for investigated entities")

            analysis = self._process_results(results)
            analysis["entity_count"] = len(entity_ids)
            analysis["analysis_period"] = {
                "start_date": actual_start.strftime("%Y-%m-%d"),
                "end_date": actual_end.strftime("%Y-%m-%d"),
            }
            return analysis

        except Exception as e:
            logger.error(f"Investigated entities analysis failed: {e}")
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
            "gmv_by_score": [],
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
                "total_transactions", "fraud_gmv", "tp_gmv", "fp_gmv", "fn_gmv", "tn_gmv"
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for cell in cells:
                writer.writerow({k: cell.get(k, 0) for k in fieldnames})

        logger.info(f"CSV exported to: {csv_path}")
        return csv_path
