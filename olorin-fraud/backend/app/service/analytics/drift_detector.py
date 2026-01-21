"""
Drift Detector Service for data quality and feature drift monitoring.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import math
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
from scipy import stats

from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DriftDetector:
    """Detect data drift and quality issues."""

    def __init__(self):
        """Initialize drift detector."""
        db_provider_env = os.getenv("DATABASE_PROVIDER")
        if not db_provider_env:
            raise RuntimeError("DATABASE_PROVIDER environment variable is required")
        self.client = get_database_provider(db_provider_env)

        psi_threshold_env = os.getenv("DRIFT_PSI_THRESHOLD")
        if not psi_threshold_env:
            raise RuntimeError("DRIFT_PSI_THRESHOLD environment variable is required")
        self.psi_threshold = float(psi_threshold_env)

        kl_threshold_env = os.getenv("DRIFT_KL_THRESHOLD")
        if not kl_threshold_env:
            raise RuntimeError("DRIFT_KL_THRESHOLD environment variable is required")
        self.kl_threshold = float(kl_threshold_env)

        null_spike_env = os.getenv("NULL_SPIKE_THRESHOLD")
        if not null_spike_env:
            raise RuntimeError("NULL_SPIKE_THRESHOLD environment variable is required")
        self.null_spike_threshold = float(null_spike_env)

        self.db_provider = db_provider_env.lower()
        logger.info(
            f"DriftDetector initialized with {db_provider_env.upper()} provider"
        )

    def calculate_psi(
        self, reference_data: List[float], current_data: List[float], buckets: int = 10
    ) -> float:
        """
        Calculate Population Stability Index (PSI).

        Args:
            reference_data: Reference period data
            current_data: Current period data
            buckets: Number of bins for histogram

        Returns:
            PSI value
        """
        if not reference_data or not current_data:
            return 0.0

        ref_array = np.array([x for x in reference_data if x is not None])
        curr_array = np.array([x for x in current_data if x is not None])

        if len(ref_array) == 0 or len(curr_array) == 0:
            return 0.0

        # Create bins based on reference data
        _, bin_edges = np.histogram(ref_array, bins=buckets)

        # Calculate distributions
        ref_dist = np.histogram(ref_array, bins=bin_edges)[0]
        curr_dist = np.histogram(curr_array, bins=bin_edges)[0]

        # Normalize to get proportions
        ref_prop = (
            ref_dist / len(ref_array) if len(ref_array) > 0 else np.zeros(buckets)
        )
        curr_prop = (
            curr_dist / len(curr_array) if len(curr_array) > 0 else np.zeros(buckets)
        )

        # Add small constant to avoid division by zero
        ref_prop = np.where(ref_prop == 0, 0.0001, ref_prop)
        curr_prop = np.where(curr_prop == 0, 0.0001, curr_prop)

        # Calculate PSI: Σ((Actual % - Expected %) * ln(Actual % / Expected %))
        psi = np.sum((curr_prop - ref_prop) * np.log(curr_prop / ref_prop))

        return float(psi)

    def calculate_kl_divergence(
        self, reference_data: List[float], current_data: List[float], buckets: int = 10
    ) -> float:
        """
        Calculate Kullback-Leibler divergence.

        Args:
            reference_data: Reference period data
            current_data: Current period data
            buckets: Number of bins for histogram

        Returns:
            KL divergence value
        """
        if not reference_data or not current_data:
            return 0.0

        ref_array = np.array([x for x in reference_data if x is not None])
        curr_array = np.array([x for x in current_data if x is not None])

        if len(ref_array) == 0 or len(curr_array) == 0:
            return 0.0

        # Create bins based on reference data
        _, bin_edges = np.histogram(ref_array, bins=buckets)

        # Calculate distributions
        ref_dist = np.histogram(ref_array, bins=bin_edges)[0]
        curr_dist = np.histogram(curr_array, bins=bin_edges)[0]

        # Normalize to get probabilities
        ref_prob = (
            ref_dist / len(ref_array) if len(ref_array) > 0 else np.zeros(buckets)
        )
        curr_prob = (
            curr_dist / len(curr_array) if len(curr_array) > 0 else np.zeros(buckets)
        )

        # Add small constant to avoid division by zero
        ref_prob = np.where(ref_prob == 0, 0.0001, ref_prob)
        curr_prob = np.where(curr_prob == 0, 0.0001, curr_prob)

        # Calculate KL divergence: Σ P(x) * log(P(x) / Q(x))
        kl = np.sum(ref_prob * np.log(ref_prob / curr_prob))

        return float(kl)

    async def detect_drift(
        self,
        feature: str,
        reference_start: datetime,
        reference_end: datetime,
        current_start: datetime,
        current_end: datetime,
    ) -> Dict[str, Any]:
        """
        Detect drift for a feature using PSI (Population Stability Index) and KL divergence.

        Args:
            feature: Feature name
            reference_start: Reference period start
            reference_end: Reference period end
            current_start: Current period start
            current_end: Current period end

        Returns:
            Drift metrics dictionary
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        datetime_col = (
            "TX_DATETIME" if self.db_provider == "snowflake" else "tx_datetime"
        )

        # Fetch reference data
        ref_where = f"{datetime_col} >= '{reference_start.isoformat()}' AND {datetime_col} <= '{reference_end.isoformat()}'"
        ref_query = f"SELECT {feature} FROM {table_name} WHERE {ref_where} AND {feature} IS NOT NULL"
        ref_results = self.client.execute_query(ref_query)
        reference_data = [
            float(row.get(feature, 0))
            for row in ref_results
            if row.get(feature) is not None
        ]

        # Fetch current data
        curr_where = f"{datetime_col} >= '{current_start.isoformat()}' AND {datetime_col} <= '{current_end.isoformat()}'"
        curr_query = f"SELECT {feature} FROM {table_name} WHERE {curr_where} AND {feature} IS NOT NULL"
        curr_results = self.client.execute_query(curr_query)
        current_data = [
            float(row.get(feature, 0))
            for row in curr_results
            if row.get(feature) is not None
        ]

        # Calculate PSI and KL divergence
        psi = self.calculate_psi(reference_data, current_data)
        kl_divergence = self.calculate_kl_divergence(reference_data, current_data)

        drift_detected = psi > self.psi_threshold or kl_divergence > self.kl_threshold

        return {
            "feature": feature,
            "psi": psi,
            "klDivergence": kl_divergence,
            "psiThreshold": self.psi_threshold,
            "klThreshold": self.kl_threshold,
            "driftDetected": drift_detected,
            "referencePeriod": {
                "start": reference_start.isoformat(),
                "end": reference_end.isoformat(),
                "sampleSize": len(reference_data),
            },
            "currentPeriod": {
                "start": current_start.isoformat(),
                "end": current_end.isoformat(),
                "sampleSize": len(current_data),
            },
        }

    async def track_label_delay(
        self, start_date: datetime, end_date: datetime
    ) -> Dict[str, Any]:
        """
        Track label delay (time between transaction and fraud label availability).

        Args:
            start_date: Start of time period
            end_date: End of time period

        Returns:
            Label delay metrics dictionary
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        datetime_col = (
            "TX_DATETIME" if self.db_provider == "snowflake" else "tx_datetime"
        )
        chargeback_col = (
            "CHARGEBACK_DATE" if self.db_provider == "snowflake" else "chargeback_date"
        )
        fraud_col = "IS_FRAUD_TX" if self.db_provider == "snowflake" else "is_fraud_tx"

        where_sql = f"{datetime_col} >= '{start_date.isoformat()}' AND {datetime_col} <= '{end_date.isoformat()}'"

        query = f"""
        SELECT 
            {datetime_col},
            {chargeback_col},
            {fraud_col},
            CASE 
                WHEN {chargeback_col} IS NOT NULL AND {datetime_col} IS NOT NULL 
                THEN EXTRACT(EPOCH FROM ({chargeback_col} - {datetime_col})) / 3600.0
                ELSE NULL
            END as delay_hours
        FROM {table_name}
        WHERE {where_sql} AND {fraud_col} IS NOT NULL
        """

        results = self.client.execute_query(query)
        delays = [
            float(row.get("delay_hours", 0))
            for row in results
            if row.get("delay_hours") is not None
        ]

        if not delays:
            return {
                "averageDelayHours": 0.0,
                "medianDelayHours": 0.0,
                "p95DelayHours": 0.0,
                "labeledCount": 0,
                "unlabeledCount": 0,
            }

        delay_array = np.array(delays)
        labeled_count = len(delays)
        total_query = f"SELECT COUNT(*) as total FROM {table_name} WHERE {where_sql}"
        total_results = self.client.execute_query(total_query)
        total_count = int(total_results[0].get("total", 0) or 0) if total_results else 0
        unlabeled_count = total_count - labeled_count

        return {
            "averageDelayHours": float(np.mean(delay_array)),
            "medianDelayHours": float(np.median(delay_array)),
            "p95DelayHours": float(np.percentile(delay_array, 95)),
            "labeledCount": labeled_count,
            "unlabeledCount": unlabeled_count,
            "labelCompleteness": (
                labeled_count / total_count if total_count > 0 else 0.0
            ),
        }

    async def check_schema_conformance(
        self, start_date: datetime, end_date: datetime
    ) -> Dict[str, Any]:
        """
        Check schema conformance (ensure data matches expected structure).

        Args:
            start_date: Start of time period
            end_date: End of time period

        Returns:
            Schema conformance metrics dictionary
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        datetime_col = (
            "TX_DATETIME" if self.db_provider == "snowflake" else "tx_datetime"
        )

        where_sql = f"{datetime_col} >= '{start_date.isoformat()}' AND {datetime_col} <= '{end_date.isoformat()}'"

        # Expected required fields (use uppercase for Snowflake, lowercase for PostgreSQL)
        if self.db_provider == "snowflake":
            required_fields = [
                "TX_ID_KEY",
                "TX_DATETIME",
                "MODEL_SCORE",
                "EMAIL",
                "AMOUNT",
            ]
        else:
            required_fields = [
                "tx_id_key",
                "tx_datetime",
                "model_score",
                "email",
                "amount",
            ]

        conformance_issues = []
        for field in required_fields:
            query = f"""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN {field} IS NULL THEN 1 ELSE 0 END) as null_count
            FROM {table_name}
            WHERE {where_sql}
            """
            results = self.client.execute_query(query)
            if results:
                total = int(results[0].get("total", 0) or 0)
                null_count = int(results[0].get("null_count", 0) or 0)
                null_rate = null_count / total if total > 0 else 0.0
                if null_rate > 0.05:  # More than 5% nulls is a conformance issue
                    conformance_issues.append(
                        {
                            "field": field,
                            "nullRate": null_rate,
                            "nullCount": null_count,
                            "totalCount": total,
                        }
                    )

        return {
            "status": (
                "conformant" if len(conformance_issues) == 0 else "non_conformant"
            ),
            "issues": conformance_issues,
            "issueCount": len(conformance_issues),
        }

    async def detect_null_spikes(
        self,
        field: str,
        start_date: datetime,
        end_date: datetime,
        window_hours: int = 24,
    ) -> Dict[str, Any]:
        """
        Detect null value spikes.

        Args:
            field: Field name to check
            start_date: Start of time period
            end_date: End of time period
            window_hours: Time window in hours for spike detection

        Returns:
            Null spike detection results
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        datetime_col = (
            "TX_DATETIME" if self.db_provider == "snowflake" else "tx_datetime"
        )

        where_sql = f"{datetime_col} >= '{start_date.isoformat()}' AND {datetime_col} <= '{end_date.isoformat()}'"

        query = f"""
        SELECT 
            DATE_TRUNC('hour', {datetime_col}) as hour,
            COUNT(*) as total,
            SUM(CASE WHEN {field} IS NULL THEN 1 ELSE 0 END) as null_count
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY DATE_TRUNC('hour', {datetime_col})
        ORDER BY hour
        """

        results = self.client.execute_query(query)
        spikes = []

        baseline_null_rate = None
        for row in results:
            total = int(row.get("total", 0) or 0)
            null_count = int(row.get("null_count", 0) or 0)
            null_rate = null_count / total if total > 0 else 0.0

            if baseline_null_rate is None:
                baseline_null_rate = null_rate
            elif null_rate > baseline_null_rate + self.null_spike_threshold:
                spikes.append(
                    {
                        "timestamp": row.get("hour"),
                        "nullRate": null_rate,
                        "baselineNullRate": baseline_null_rate,
                        "spikeMagnitude": null_rate - baseline_null_rate,
                    }
                )

        return {
            "field": field,
            "spikesDetected": len(spikes),
            "spikes": spikes,
            "baselineNullRate": baseline_null_rate or 0.0,
        }

    async def detect_rare_values(
        self,
        field: str,
        start_date: datetime,
        end_date: datetime,
        rarity_threshold: float = 0.01,
    ) -> Dict[str, Any]:
        """
        Detect rare value anomalies.

        Args:
            field: Field name to check
            start_date: Start of time period
            end_date: End of time period
            rarity_threshold: Minimum frequency threshold (values below this are rare)

        Returns:
            Rare value detection results
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        datetime_col = (
            "TX_DATETIME" if self.db_provider == "snowflake" else "tx_datetime"
        )

        where_sql = f"{datetime_col} >= '{start_date.isoformat()}' AND {datetime_col} <= '{end_date.isoformat()}'"

        query = f"""
        SELECT
            {field} as value,
            COUNT(*) as count
        FROM {table_name}
        WHERE {where_sql} AND {field} IS NOT NULL
        GROUP BY {field}
        ORDER BY count DESC
        """

        results = self.client.execute_query(query)
        total_count = sum(int(row.get("count", 0) or 0) for row in results)

        rare_values = []
        for row in results:
            count = int(row.get("count", 0) or 0)
            frequency = count / total_count if total_count > 0 else 0.0
            if frequency < rarity_threshold:
                rare_values.append(
                    {"value": row.get("value"), "count": count, "frequency": frequency}
                )

        return {
            "field": field,
            "rareValuesDetected": len(rare_values),
            "rareValues": rare_values[:10],  # Top 10 rare values
            "totalUniqueValues": len(results),
        }

    async def check_feature_ranges(
        self,
        field: str,
        start_date: datetime,
        end_date: datetime,
        min_value: Optional[float] = None,
        max_value: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Check feature value ranges for violations.

        Args:
            field: Field name to check
            start_date: Start of time period
            end_date: End of time period
            min_value: Minimum allowed value
            max_value: Maximum allowed value

        Returns:
            Feature range check results
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        datetime_col = (
            "TX_DATETIME" if self.db_provider == "snowflake" else "tx_datetime"
        )

        where_sql = f"{datetime_col} >= '{start_date.isoformat()}' AND {datetime_col} <= '{end_date.isoformat()}'"

        query = f"""
        SELECT
            MIN({field}) as min_val,
            MAX({field}) as max_val,
            AVG({field}) as avg_val,
            COUNT(*) as total
        FROM {table_name}
        WHERE {where_sql} AND {field} IS NOT NULL
        """

        # Use reasonable defaults if not provided
        if min_value is None:
            min_value = float("-inf")
        if max_value is None:
            max_value = float("inf")

        results = self.client.execute_query(query)
        if not results:
            return {"status": "no_data", "violations": 0}

        row = results[0]
        min_val = float(row.get("min_val", 0) or 0)
        max_val = float(row.get("max_val", 0) or 0)
        avg_val = float(row.get("avg_val", 0) or 0)
        total = int(row.get("total", 0) or 0)

        # Check for violations
        violations_query = f"""
        SELECT COUNT(*) as violation_count
        FROM {table_name}
        WHERE {where_sql} AND {field} IS NOT NULL 
        AND ({field} < {min_value} OR {field} > {max_value})
        """
        violation_results = self.client.execute_query(violations_query)
        violation_count = (
            int(violation_results[0].get("violation_count", 0) or 0)
            if violation_results
            else 0
        )

        return {
            "field": field,
            "minValue": min_val,
            "maxValue": max_val,
            "avgValue": avg_val,
            "expectedRange": {"min": min_value, "max": max_value},
            "violations": violation_count,
            "violationRate": violation_count / total if total > 0 else 0.0,
            "status": "within_range" if violation_count == 0 else "violations_detected",
        }

    async def check_data_quality(
        self, start_date: datetime, end_date: datetime
    ) -> Dict[str, Any]:
        """
        Check comprehensive data quality metrics.

        Args:
            start_date: Start of time period
            end_date: End of time period

        Returns:
            Data quality metrics dictionary
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        datetime_col = (
            "TX_DATETIME" if self.db_provider == "snowflake" else "tx_datetime"
        )
        model_score_col = (
            "MODEL_SCORE" if self.db_provider == "snowflake" else "model_score"
        )
        email_col = "EMAIL" if self.db_provider == "snowflake" else "email"
        amount_col = "AMOUNT" if self.db_provider == "snowflake" else "amount"

        where_sql = f"{datetime_col} >= '{start_date.isoformat()}' AND {datetime_col} <= '{end_date.isoformat()}'"

        query = f"""
        SELECT 
            COUNT(*) as total_records,
            SUM(CASE WHEN {model_score_col} IS NULL THEN 1 ELSE 0 END) as null_scores,
            SUM(CASE WHEN {email_col} IS NULL THEN 1 ELSE 0 END) as null_emails,
            SUM(CASE WHEN {amount_col} IS NULL THEN 1 ELSE 0 END) as null_amounts
        FROM {table_name}
        WHERE {where_sql}
        """

        results = self.client.execute_query(query)
        if not results:
            return {"status": "error", "message": "No data found"}

        row = results[0]
        total = int(row.get("total_records", 0) or 0)
        null_scores = int(row.get("null_scores", 0) or 0)
        null_emails = int(row.get("null_emails", 0) or 0)
        null_amounts = int(row.get("null_amounts", 0) or 0)

        # Check for null spikes
        model_score_field = (
            "MODEL_SCORE" if self.db_provider == "snowflake" else "model_score"
        )
        null_spikes = await self.detect_null_spikes(
            model_score_field, start_date, end_date
        )

        # Check schema conformance
        schema_check = await self.check_schema_conformance(start_date, end_date)

        # Track label delay
        label_delay = await self.track_label_delay(start_date, end_date)

        return {
            "status": (
                "healthy"
                if schema_check.get("issueCount", 0) == 0
                else "issues_detected"
            ),
            "totalRecords": total,
            "nullScoreRate": null_scores / total if total > 0 else 0.0,
            "nullEmailRate": null_emails / total if total > 0 else 0.0,
            "nullAmountRate": null_amounts / total if total > 0 else 0.0,
            "completeness": (
                1.0 - (null_scores + null_emails + null_amounts) / (total * 3)
                if total > 0
                else 1.0
            ),
            "nullSpikes": null_spikes,
            "schemaConformance": schema_check,
            "labelDelay": label_delay,
        }

    async def check_drift_thresholds(self, feature: str) -> Dict[str, Any]:
        """
        Check if drift exceeds thresholds and generate alerts.

        Args:
            feature: Feature name

        Returns:
            Alert status dictionary
        """
        # Get recent drift metrics (last 7 days vs previous 7 days)
        end_date = datetime.utcnow()
        current_start = end_date - timedelta(days=7)
        reference_end = current_start
        reference_start = reference_end - timedelta(days=7)

        drift_result = await self.detect_drift(
            feature, reference_start, reference_end, current_start, end_date
        )

        alerts = []
        if drift_result["driftDetected"]:
            if drift_result["psi"] > self.psi_threshold:
                alerts.append(
                    {
                        "type": "psi_threshold_exceeded",
                        "severity": (
                            "high"
                            if drift_result["psi"] > self.psi_threshold * 2
                            else "medium"
                        ),
                        "message": f"PSI ({drift_result['psi']:.3f}) exceeds threshold ({self.psi_threshold})",
                        "feature": feature,
                        "value": drift_result["psi"],
                        "threshold": self.psi_threshold,
                    }
                )

            if drift_result["klDivergence"] > self.kl_threshold:
                alerts.append(
                    {
                        "type": "kl_threshold_exceeded",
                        "severity": (
                            "high"
                            if drift_result["klDivergence"] > self.kl_threshold * 2
                            else "medium"
                        ),
                        "message": f"KL divergence ({drift_result['klDivergence']:.3f}) exceeds threshold ({self.kl_threshold})",
                        "feature": feature,
                        "value": drift_result["klDivergence"],
                        "threshold": self.kl_threshold,
                    }
                )

        return {
            "feature": feature,
            "alerts": alerts,
            "alertCount": len(alerts),
            "driftMetrics": drift_result,
        }
