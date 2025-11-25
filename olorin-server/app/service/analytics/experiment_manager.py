"""
Experiment Manager Service for A/B testing analytics.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import hashlib
import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from scipy import stats
from sqlalchemy import text

from app.persistence.database import get_db_session
from app.service.agent.tools.database_tool import get_database_provider
from app.service.analytics.metrics_calculator import MetricsCalculator
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ExperimentManager:
    """Manage A/B tests and experiments."""

    def __init__(self):
        """Initialize experiment manager."""
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake")
        self.client = get_database_provider(db_provider)
        self.metrics_calc = MetricsCalculator()
        logger.info(
            f"ExperimentManager initialized with {db_provider.upper()} provider"
        )

    def assign_variant(self, experiment_id: str, user_id: str) -> str:
        """
        Assign user to experiment variant using hash-based assignment.

        Args:
            experiment_id: Experiment ID
            user_id: User ID

        Returns:
            Variant ID
        """
        experiment = self._get_experiment(experiment_id)
        if not experiment:
            logger.warning(f"Experiment {experiment_id} not found, returning 'control'")
            return "control"

        traffic_split = json.loads(experiment.get("traffic_split", "{}"))
        variants = json.loads(experiment.get("variants", "[]"))

        if not variants or not traffic_split:
            return "control"

        hash_input = f"{experiment_id}:{user_id}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        bucket = hash_value % 100

        cumulative = 0
        for variant_id, percentage in sorted(traffic_split.items()):
            cumulative += percentage
            if bucket < cumulative:
                return variant_id

        return variants[0].get("id", "control") if variants else "control"

    async def create_experiment(
        self, experiment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new experiment.

        Args:
            experiment_data: Experiment configuration

        Returns:
            Created experiment dictionary
        """
        experiment_id = str(uuid.uuid4())
        created_by = experiment_data.get("createdBy", "system")
        now = datetime.utcnow()

        with get_db_session() as db:
            query = text(
                """
            INSERT INTO experiments (
                experiment_id, name, description, status, start_date, end_date,
                traffic_split, success_metrics, guardrails, variants, created_by,
                created_at, updated_at
            ) VALUES (:experiment_id, :name, :description, :status, :start_date, :end_date,
                      :traffic_split, :success_metrics, :guardrails, :variants, :created_by,
                      :created_at, :updated_at)
            """
            )

            db.execute(
                query,
                {
                    "experiment_id": experiment_id,
                    "name": experiment_data["name"],
                    "description": experiment_data.get("description"),
                    "status": experiment_data.get("status", "draft"),
                    "start_date": datetime.fromisoformat(experiment_data["startDate"]),
                    "end_date": (
                        datetime.fromisoformat(experiment_data["endDate"])
                        if experiment_data.get("endDate")
                        else None
                    ),
                    "traffic_split": json.dumps(experiment_data["trafficSplit"]),
                    "success_metrics": json.dumps(experiment_data["successMetrics"]),
                    "guardrails": json.dumps(experiment_data.get("guardrails", [])),
                    "variants": json.dumps(experiment_data["variants"]),
                    "created_by": created_by,
                    "created_at": now,
                    "updated_at": now,
                },
            )

            for variant in experiment_data["variants"]:
                variant_id = variant.get("id", str(uuid.uuid4()))
                variant_query = text(
                    """
                INSERT INTO experiment_variants (
                    variant_id, experiment_id, name, description, configuration,
                    created_at, updated_at
                ) VALUES (:variant_id, :experiment_id, :name, :description, :configuration,
                          :created_at, :updated_at)
                """
                )
                db.execute(
                    variant_query,
                    {
                        "variant_id": variant_id,
                        "experiment_id": experiment_id,
                        "name": variant["name"],
                        "description": variant.get("description"),
                        "configuration": json.dumps(variant.get("configuration", {})),
                        "created_at": now,
                        "updated_at": now,
                    },
                )

        return await self.get_experiment(experiment_id)

    async def get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """
        Get experiment by ID.

        Args:
            experiment_id: Experiment ID

        Returns:
            Experiment dictionary or None
        """
        experiment = self._get_experiment(experiment_id)
        if not experiment:
            return None

        with get_db_session() as db:
            variants_query = text(
                """
            SELECT variant_id, name, description, configuration, metrics,
                   statistical_significance, lift
            FROM experiment_variants
            WHERE experiment_id = :experiment_id
            """
            )
            variants_result = db.execute(
                variants_query, {"experiment_id": experiment_id}
            )
            variants = [dict(row) for row in variants_result]

            result_query = text(
                """
            SELECT winner_variant_id, conclusion, recommendation, impact_estimate
            FROM experiment_results
            WHERE experiment_id = :experiment_id
            """
            )
            result_result = db.execute(result_query, {"experiment_id": experiment_id})
            result = [dict(row) for row in result_result]

        experiment["variants"] = [
            {
                **v,
                "id": v.get("variant_id"),
                "configuration": json.loads(v.get("configuration", "{}")),
                "metrics": (
                    json.loads(v.get("metrics", "{}")) if v.get("metrics") else None
                ),
                "statisticalSignificance": (
                    json.loads(v.get("statistical_significance", "{}"))
                    if v.get("statistical_significance")
                    else None
                ),
            }
            for v in variants
        ]

        if result:
            experiment["results"] = {
                "winner": result[0].get("winner_variant_id"),
                "conclusion": result[0].get("conclusion"),
                "recommendation": result[0].get("recommendation"),
                "impactEstimate": (
                    json.loads(result[0].get("impact_estimate", "{}"))
                    if result[0].get("impact_estimate")
                    else None
                ),
            }

        return experiment

    async def list_experiments(
        self, status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        List all experiments, optionally filtered by status.

        Args:
            status: Optional status filter

        Returns:
            List of experiment dictionaries
        """
        with get_db_session() as db:
            if status:
                query = text(
                    "SELECT * FROM experiments WHERE status = :status ORDER BY created_at DESC"
                )
                params = {"status": status}
            else:
                query = text("SELECT * FROM experiments ORDER BY created_at DESC")
                params = {}

            result = db.execute(query, params)
            experiments = [dict(row) for row in result]

        return [
            {
                **exp,
                "id": exp.get("experiment_id"),
                "startDate": (
                    exp.get("start_date").isoformat() if exp.get("start_date") else None
                ),
                "endDate": (
                    exp.get("end_date").isoformat() if exp.get("end_date") else None
                ),
                "createdAt": (
                    exp.get("created_at").isoformat() if exp.get("created_at") else None
                ),
                "updatedAt": (
                    exp.get("updated_at").isoformat() if exp.get("updated_at") else None
                ),
                "trafficSplit": json.loads(exp.get("traffic_split", "{}")),
                "successMetrics": json.loads(exp.get("success_metrics", "[]")),
                "guardrails": json.loads(exp.get("guardrails", "[]")),
                "variants": json.loads(exp.get("variants", "[]")),
            }
            for exp in experiments
        ]

    async def update_experiment(
        self, experiment_id: str, updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update experiment.

        Args:
            experiment_id: Experiment ID
            updates: Fields to update

        Returns:
            Updated experiment dictionary
        """
        set_clauses = []
        params: Dict[str, Any] = {"experiment_id": experiment_id}

        if "name" in updates:
            set_clauses.append("name = :name")
            params["name"] = updates["name"]

        if "description" in updates:
            set_clauses.append("description = :description")
            params["description"] = updates["description"]

        if "status" in updates:
            set_clauses.append("status = :status")
            params["status"] = updates["status"]

        if "startDate" in updates:
            set_clauses.append("start_date = :start_date")
            params["start_date"] = datetime.fromisoformat(updates["startDate"])

        if "endDate" in updates:
            set_clauses.append("end_date = :end_date")
            params["end_date"] = (
                datetime.fromisoformat(updates["endDate"])
                if updates["endDate"]
                else None
            )

        if "trafficSplit" in updates:
            set_clauses.append("traffic_split = :traffic_split")
            params["traffic_split"] = json.dumps(updates["trafficSplit"])

        if "guardrails" in updates:
            set_clauses.append("guardrails = :guardrails")
            params["guardrails"] = json.dumps(updates["guardrails"])

        set_clauses.append("updated_at = :updated_at")
        params["updated_at"] = datetime.utcnow()

        with get_db_session() as db:
            query = text(
                f"UPDATE experiments SET {', '.join(set_clauses)} WHERE experiment_id = :experiment_id"
            )
            db.execute(query, params)

        return await self.get_experiment(experiment_id)

    async def promote_experiment(
        self, experiment_id: str, variant_id: str
    ) -> Dict[str, Any]:
        """
        Promote winning variant to production.

        Args:
            experiment_id: Experiment ID
            variant_id: Winning variant ID

        Returns:
            Updated experiment dictionary
        """
        await self.update_experiment(experiment_id, {"status": "completed"})

        result_id = str(uuid.uuid4())
        now = datetime.utcnow()

        with get_db_session() as db:
            # Check if result already exists
            check_query = text(
                "SELECT result_id FROM experiment_results WHERE experiment_id = :experiment_id"
            )
            existing = db.execute(
                check_query, {"experiment_id": experiment_id}
            ).fetchone()

            if existing:
                query = text(
                    """
                UPDATE experiment_results SET
                    winner_variant_id = :winner_variant_id,
                    recommendation = :recommendation,
                    updated_at = :updated_at
                WHERE experiment_id = :experiment_id
                """
                )
            else:
                query = text(
                    """
                INSERT INTO experiment_results (
                    result_id, experiment_id, winner_variant_id, recommendation, created_at, updated_at
                ) VALUES (:result_id, :experiment_id, :winner_variant_id, :recommendation, :created_at, :updated_at)
                """
                )
            db.execute(
                query,
                {
                    "result_id": result_id,
                    "experiment_id": experiment_id,
                    "winner_variant_id": variant_id,
                    "recommendation": "promote",
                    "created_at": now,
                    "updated_at": now,
                },
            )

        return await self.get_experiment(experiment_id)

    async def get_experiment_results(
        self, experiment_id: str, start_date: datetime, end_date: datetime
    ) -> Dict[str, Any]:
        """
        Get experiment results for a time period.

        Args:
            experiment_id: Experiment ID
            start_date: Start of time period
            end_date: End of time period

        Returns:
            Experiment results dictionary
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake").lower()
        datetime_col = "TX_DATETIME" if db_provider == "snowflake" else "tx_datetime"
        experiment_col = (
            "EXPERIMENT_ID" if db_provider == "snowflake" else "experiment_id"
        )
        variant_col = "VARIANT_ID" if db_provider == "snowflake" else "variant_id"
        fraud_col = "IS_FRAUD_TX" if db_provider == "snowflake" else "is_fraud_tx"
        model_score_col = "MODEL_SCORE" if db_provider == "snowflake" else "model_score"

        where_clauses = [
            f"{datetime_col} >= '{start_date.isoformat()}'",
            f"{datetime_col} <= '{end_date.isoformat()}'",
            f"{experiment_col} = '{experiment_id}'",
        ]
        where_sql = " AND ".join(where_clauses)

        query = f"""
        SELECT 
            {variant_col},
            COUNT(*) as total_decisions,
            SUM(CASE WHEN {fraud_col} = 1 THEN 1 ELSE 0 END) as fraud_count,
            SUM(CASE WHEN {fraud_col} = 0 THEN 1 ELSE 0 END) as non_fraud_count,
            AVG({model_score_col}) as avg_score
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY {variant_col}
        """

        results = self.client.execute_query(query)
        variants = []

        for row in results:
            variant_id = row["VARIANT_ID"]
            metrics = await self.metrics_calc.calculate_metrics(
                start_date,
                end_date,
                {"experiment_id": experiment_id, "variant_id": variant_id},
            )

            variants.append(
                {
                    "variantId": variant_id,
                    "metrics": metrics.dict(),
                    "totalDecisions": row["total_decisions"],
                }
            )

        return {
            "experimentId": experiment_id,
            "variants": variants,
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
        }

    def calculate_lift(
        self, control_metrics: Dict[str, Any], treatment_metrics: Dict[str, Any]
    ) -> float:
        """
        Calculate lift percentage for treatment vs control.

        Args:
            control_metrics: Control variant metrics
            treatment_metrics: Treatment variant metrics

        Returns:
            Lift percentage
        """
        control_precision = control_metrics.get("precision", 0)
        treatment_precision = treatment_metrics.get("precision", 0)

        if control_precision == 0:
            return 0.0

        return ((treatment_precision - control_precision) / control_precision) * 100

    def calculate_statistical_significance(
        self,
        control_data: List[float],
        treatment_data: List[float],
        alpha: float = 0.05,
    ) -> Dict[str, Any]:
        """
        Calculate statistical significance using t-test.

        Args:
            control_data: Control variant data points
            treatment_data: Treatment variant data points
            alpha: Significance level

        Returns:
            Statistical significance results
        """
        if len(control_data) < 2 or len(treatment_data) < 2:
            return {
                "pValue": 1.0,
                "confidenceInterval": [0.0, 0.0],
                "isSignificant": False,
            }

        control_array = np.array(control_data)
        treatment_array = np.array(treatment_data)

        t_stat, p_value = stats.ttest_ind(
            control_array, treatment_array, equal_var=False
        )

        control_mean = np.mean(control_array)
        treatment_mean = np.mean(treatment_array)
        control_std = np.std(control_array, ddof=1)
        treatment_std = np.std(treatment_array, ddof=1)

        se_diff = np.sqrt(
            (control_std**2 / len(control_array))
            + (treatment_std**2 / len(treatment_array))
        )
        margin = (
            stats.t.ppf(
                1 - alpha / 2, min(len(control_array), len(treatment_array)) - 1
            )
            * se_diff
        )

        ci_lower = (treatment_mean - control_mean) - margin
        ci_upper = (treatment_mean - control_mean) + margin

        return {
            "pValue": float(p_value),
            "confidenceInterval": [float(ci_lower), float(ci_upper)],
            "isSignificant": p_value < alpha,
        }

    async def check_guardrails(self, experiment_id: str) -> List[Dict[str, Any]]:
        """
        Check guardrail violations for an experiment.

        Args:
            experiment_id: Experiment ID

        Returns:
            List of guardrail statuses
        """
        experiment = self._get_experiment(experiment_id)
        if not experiment:
            return []

        guardrails = json.loads(experiment.get("guardrails", "[]"))
        results = await self.get_experiment_results(
            experiment_id,
            datetime.fromisoformat(experiment["start_date"]),
            (
                datetime.utcnow()
                if not experiment.get("end_date")
                else datetime.fromisoformat(experiment["end_date"])
            ),
        )

        guardrail_statuses = []

        for guardrail in guardrails:
            metric = guardrail["metric"]
            threshold = guardrail["threshold"]
            direction = guardrail["direction"]

            for variant in results["variants"]:
                variant_metrics = variant["metrics"]
                current_value = None

                if metric == "conversion_rate":
                    current_value = variant_metrics.get("approvalRate", 0)
                elif metric == "auth_success_rate":
                    current_value = variant_metrics.get("approvalRate", 0)
                elif metric == "latency_p95":
                    current_value = variant_metrics.get("modelLatency", {}).get(
                        "p95", 0
                    )
                elif metric == "manual_review_rate":
                    review_count = (
                        variant_metrics.get("totalDecisions", 0)
                        - variant_metrics.get("approvedCount", 0)
                        - variant_metrics.get("declinedCount", 0)
                    )
                    current_value = (
                        review_count / variant_metrics.get("totalDecisions", 1)
                        if variant_metrics.get("totalDecisions", 0) > 0
                        else 0
                    )

                if current_value is not None:
                    violated = False
                    if direction == "above" and current_value > threshold:
                        violated = True
                    elif direction == "below" and current_value < threshold:
                        violated = True

                    status = (
                        "violated"
                        if violated
                        else (
                            "warning"
                            if abs(current_value - threshold) / threshold < 0.1
                            else "ok"
                        )
                    )

                    guardrail_statuses.append(
                        {
                            "metric": metric,
                            "variantId": variant["variantId"],
                            "threshold": threshold,
                            "currentValue": current_value,
                            "direction": direction,
                            "status": status,
                            "action": guardrail.get("action", "alert"),
                        }
                    )

        return guardrail_statuses

    def _get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Get experiment from database."""
        with get_db_session() as db:
            query = text(
                "SELECT * FROM experiments WHERE experiment_id = :experiment_id"
            )
            result = db.execute(query, {"experiment_id": experiment_id})
            rows = [dict(row) for row in result]
            return rows[0] if rows else None
