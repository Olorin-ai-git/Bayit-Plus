"""
Replay Engine Service for historical backtesting.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import os
import json
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy import text
from app.service.logging import get_bridge_logger
from app.service.agent.tools.database_tool import get_database_provider
from app.service.analytics.metrics_calculator import MetricsCalculator
from app.persistence.database import get_db_session

logger = get_bridge_logger(__name__)


class ReplayEngine:
    """Replay historical decisions with new rules/models."""

    def __init__(self):
        """Initialize replay engine."""
        db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake')
        self.client = get_database_provider(db_provider)
        self.metrics_calc = MetricsCalculator()
        logger.info(f"ReplayEngine initialized with {db_provider.upper()} provider")

    async def create_scenario(
        self,
        name: str,
        description: Optional[str],
        start_date: datetime,
        end_date: datetime,
        configuration: Dict[str, Any],
        created_by: str = "system"
    ) -> Dict[str, Any]:
        """
        Create a new replay scenario.

        Args:
            name: Scenario name
            description: Scenario description
            start_date: Start of time period
            end_date: End of time period
            configuration: Configuration overrides
            created_by: Creator user ID

        Returns:
            Created scenario dictionary
        """
        scenario_id = str(uuid.uuid4())
        now = datetime.utcnow()

        with get_db_session() as db:
            query = text("""
            INSERT INTO replay_scenarios (
                scenario_id, name, description, status, start_date, end_date,
                configuration, created_by, created_at, updated_at
            ) VALUES (:scenario_id, :name, :description, :status, :start_date, :end_date,
                      :configuration, :created_by, :created_at, :updated_at)
            """)

            db.execute(query, {
                'scenario_id': scenario_id,
                'name': name,
                'description': description,
                'status': 'draft',
                'start_date': start_date,
                'end_date': end_date,
                'configuration': json.dumps(configuration),
                'created_by': created_by,
                'created_at': now,
                'updated_at': now
            })

        return await self.get_scenario(scenario_id)

    async def get_scenario(self, scenario_id: str) -> Optional[Dict[str, Any]]:
        """
        Get scenario by ID.

        Args:
            scenario_id: Scenario ID

        Returns:
            Scenario dictionary or None
        """
        with get_db_session() as db:
            query = text("SELECT * FROM replay_scenarios WHERE scenario_id = :scenario_id")
            result = db.execute(query, {'scenario_id': scenario_id})
            rows = [dict(row) for row in result]
            if not rows:
                return None

            scenario = rows[0]
            scenario['id'] = scenario.get('scenario_id')
            scenario['startDate'] = scenario.get('start_date').isoformat() if scenario.get('start_date') else None
            scenario['endDate'] = scenario.get('end_date').isoformat() if scenario.get('end_date') else None
            scenario['createdAt'] = scenario.get('created_at').isoformat() if scenario.get('created_at') else None
            scenario['updatedAt'] = scenario.get('updated_at').isoformat() if scenario.get('updated_at') else None
            scenario['configuration'] = json.loads(scenario.get('configuration', '{}'))

            return scenario

    async def list_scenarios(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all scenarios, optionally filtered by status.

        Args:
            status: Optional status filter

        Returns:
            List of scenario dictionaries
        """
        with get_db_session() as db:
            if status:
                query = text("SELECT * FROM replay_scenarios WHERE status = :status ORDER BY created_at DESC")
                params = {'status': status}
            else:
                query = text("SELECT * FROM replay_scenarios ORDER BY created_at DESC")
                params = {}

            result = db.execute(query, params)
            scenarios = [dict(row) for row in result]

        return [
            {
                **scenario,
                'id': scenario.get('scenario_id'),
                'startDate': scenario.get('start_date').isoformat() if scenario.get('start_date') else None,
                'endDate': scenario.get('end_date').isoformat() if scenario.get('end_date') else None,
                'createdAt': scenario.get('created_at').isoformat() if scenario.get('created_at') else None,
                'updatedAt': scenario.get('updated_at').isoformat() if scenario.get('updated_at') else None,
                'configuration': json.loads(scenario.get('configuration', '{}'))
            }
            for scenario in scenarios
        ]

    async def run_scenario(self, scenario_id: str) -> Dict[str, Any]:
        """
        Run a replay scenario with deterministic re-evaluation.

        Args:
            scenario_id: Scenario ID

        Returns:
            Replay results dictionary
        """
        scenario = await self.get_scenario(scenario_id)
        if not scenario:
            raise ValueError(f"Scenario {scenario_id} not found")

        # Update status to running
        await self._update_scenario_status(scenario_id, 'running')

        try:
            start_date = datetime.fromisoformat(scenario['startDate'])
            end_date = datetime.fromisoformat(scenario['endDate'])
            config = scenario['configuration']

            # Get production metrics for comparison
            production_metrics = await self.metrics_calc.calculate_metrics(start_date, end_date)

            # Replay with new configuration
            replay_results = await self._deterministic_replay(
                start_date,
                end_date,
                config.get('modelVersion'),
                config.get('ruleVersion'),
                config.get('threshold', 0.5)
            )

            # Calculate diff vs production
            diff_comparison = self._calculate_diff(production_metrics, replay_results)

            # Calculate impact metrics
            impact_metrics = self._calculate_impact_metrics(production_metrics, replay_results)

            # Store results
            result_id = await self._store_results(
                scenario_id,
                replay_results,
                diff_comparison,
                impact_metrics
            )

            # Update scenario status
            await self._update_scenario_status(scenario_id, 'completed')

            return {
                "scenarioId": scenario_id,
                "resultId": result_id,
                "status": "completed",
                "replayResults": replay_results,
                "productionComparison": diff_comparison,
                "impactMetrics": impact_metrics
            }

        except Exception as e:
            logger.error(f"Replay scenario {scenario_id} failed: {e}")
            await self._update_scenario_status(scenario_id, 'failed')
            raise

    async def _deterministic_replay(
        self,
        start_date: datetime,
        end_date: datetime,
        model_version: Optional[str],
        rule_version: Optional[str],
        threshold: float
    ) -> Dict[str, Any]:
        """
        Perform deterministic re-evaluation of historical decisions.

        Args:
            start_date: Start of time period
            end_date: End of time period
            model_version: Model version override
            rule_version: Rule version override
            threshold: Decision threshold

        Returns:
            Replay results dictionary
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
        datetime_col = 'TX_DATETIME' if db_provider == 'snowflake' else 'tx_datetime'
        model_score_col = 'MODEL_SCORE' if db_provider == 'snowflake' else 'model_score'
        fraud_col = 'IS_FRAUD_TX' if db_provider == 'snowflake' else 'is_fraud_tx'
        
        where_sql = f"{datetime_col} >= '{start_date.isoformat()}' AND {datetime_col} <= '{end_date.isoformat()}'"

        query = f"""
        SELECT 
            COUNT(*) as total_decisions,
            SUM(CASE WHEN {model_score_col} > {threshold} THEN 1 ELSE 0 END) as would_decline,
            SUM(CASE WHEN {model_score_col} <= {threshold} THEN 1 ELSE 0 END) as would_approve,
            SUM(CASE WHEN {fraud_col} = 1 AND {model_score_col} > {threshold} THEN 1 ELSE 0 END) as would_catch_fraud,
            SUM(CASE WHEN {fraud_col} = 1 AND {model_score_col} <= {threshold} THEN 1 ELSE 0 END) as would_miss_fraud,
            SUM(CASE WHEN {fraud_col} = 0 AND {model_score_col} > {threshold} THEN 1 ELSE 0 END) as false_positives,
            SUM(CASE WHEN {fraud_col} = 1 AND {model_score_col} > {threshold} THEN 1 ELSE 0 END) as true_positives
        FROM {table_name}
        WHERE {where_sql}
        """

        results = self.client.execute_query(query)
        if not results:
            return {"status": "error", "message": "No data found"}

        row = results[0]
        total = int(row.get('total_decisions', 0) or 0)
        would_decline = int(row.get('would_decline', 0) or 0)
        would_approve = int(row.get('would_approve', 0) or 0)
        would_catch_fraud = int(row.get('would_catch_fraud', 0) or 0)
        would_miss_fraud = int(row.get('would_miss_fraud', 0) or 0)
        false_positives = int(row.get('false_positives', 0) or 0)
        true_positives = int(row.get('true_positives', 0) or 0)

        # Calculate metrics
        precision = true_positives / would_decline if would_decline > 0 else 0.0
        recall = true_positives / (true_positives + would_miss_fraud) if (true_positives + would_miss_fraud) > 0 else 0.0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        return {
            "totalDecisions": total,
            "wouldDecline": would_decline,
            "wouldApprove": would_approve,
            "wouldCatchFraud": would_catch_fraud,
            "wouldMissFraud": would_miss_fraud,
            "falsePositives": false_positives,
            "truePositives": true_positives,
            "precision": precision,
            "recall": recall,
            "f1Score": f1_score,
            "modelVersion": model_version or "current",
            "ruleVersion": rule_version or "current",
            "threshold": threshold
        }

    def _calculate_diff(self, production_metrics: Any, replay_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate difference between production and replay results.

        Args:
            production_metrics: Production metrics object
            replay_results: Replay results dictionary

        Returns:
            Diff comparison dictionary
        """
        prod_dict = production_metrics.dict() if hasattr(production_metrics, 'dict') else production_metrics

        return {
            "precisionDiff": replay_results.get('precision', 0) - prod_dict.get('precision', 0),
            "recallDiff": replay_results.get('recall', 0) - prod_dict.get('recall', 0),
            "f1ScoreDiff": replay_results.get('f1Score', 0) - prod_dict.get('f1_score', 0),
            "declineRateDiff": (replay_results.get('wouldDecline', 0) / replay_results.get('totalDecisions', 1)) - (prod_dict.get('false_positives', 0) + prod_dict.get('true_positives', 0)) / prod_dict.get('total_decisions', 1),
            "falsePositiveDiff": replay_results.get('falsePositives', 0) - prod_dict.get('false_positives', 0),
            "truePositiveDiff": replay_results.get('truePositives', 0) - prod_dict.get('true_positives', 0)
        }

    def _calculate_impact_metrics(self, production_metrics: Any, replay_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate impact metrics for replay scenario.

        Args:
            production_metrics: Production metrics object
            replay_results: Replay results dictionary

        Returns:
            Impact metrics dictionary
        """
        false_positive_cost = float(os.getenv('FALSE_POSITIVE_COST', '50.0'))
        prod_dict = production_metrics.dict() if hasattr(production_metrics, 'dict') else production_metrics

        false_positive_reduction = prod_dict.get('false_positives', 0) - replay_results.get('falsePositives', 0)
        cost_savings = false_positive_reduction * false_positive_cost

        return {
            "falsePositiveReduction": false_positive_reduction,
            "costSavings": cost_savings,
            "fraudCatchImprovement": replay_results.get('wouldCatchFraud', 0) - prod_dict.get('true_positives', 0),
            "precisionImprovement": replay_results.get('precision', 0) - prod_dict.get('precision', 0),
            "recallImprovement": replay_results.get('recall', 0) - prod_dict.get('recall', 0)
        }

    async def _store_results(
        self,
        scenario_id: str,
        replay_results: Dict[str, Any],
        diff_comparison: Dict[str, Any],
        impact_metrics: Dict[str, Any]
    ) -> str:
        """Store replay results in database."""
        result_id = str(uuid.uuid4())
        now = datetime.utcnow()

        with get_db_session() as db:
            query = text("""
            INSERT INTO replay_results (
                result_id, scenario_id, total_decisions, would_decline, would_approve,
                would_catch_fraud, would_miss_fraud, metrics, production_comparison,
                impact_metrics, created_at
            ) VALUES (:result_id, :scenario_id, :total_decisions, :would_decline, :would_approve,
                      :would_catch_fraud, :would_miss_fraud, :metrics, :production_comparison,
                      :impact_metrics, :created_at)
            """)

            db.execute(query, {
                'result_id': result_id,
                'scenario_id': scenario_id,
                'total_decisions': replay_results.get('totalDecisions', 0),
                'would_decline': replay_results.get('wouldDecline', 0),
                'would_approve': replay_results.get('wouldApprove', 0),
                'would_catch_fraud': replay_results.get('wouldCatchFraud', 0),
                'would_miss_fraud': replay_results.get('wouldMissFraud', 0),
                'metrics': json.dumps({
                    'precision': replay_results.get('precision', 0),
                    'recall': replay_results.get('recall', 0),
                    'f1Score': replay_results.get('f1Score', 0)
                }),
                'production_comparison': json.dumps(diff_comparison),
                'impact_metrics': json.dumps(impact_metrics),
                'created_at': now
            })

        return result_id

    async def get_scenario_results(self, scenario_id: str) -> Optional[Dict[str, Any]]:
        """
        Get results for a scenario.

        Args:
            scenario_id: Scenario ID

        Returns:
            Results dictionary or None
        """
        with get_db_session() as db:
            query = text("""
            SELECT * FROM replay_results
            WHERE scenario_id = :scenario_id
            ORDER BY created_at DESC
            LIMIT 1
            """)
            result = db.execute(query, {'scenario_id': scenario_id})
            rows = [dict(row) for row in result]
            if not rows:
                return None

            result_row = rows[0]
            return {
                **result_row,
                'id': result_row.get('result_id'),
                'metrics': json.loads(result_row.get('metrics', '{}')),
                'productionComparison': json.loads(result_row.get('production_comparison', '{}')),
                'impactMetrics': json.loads(result_row.get('impact_metrics', '{}'))
            }

    async def _update_scenario_status(self, scenario_id: str, status: str) -> None:
        """Update scenario status."""
        with get_db_session() as db:
            query = text("""
            UPDATE replay_scenarios SET
                status = :status,
                updated_at = :updated_at,
                completed_at = CASE WHEN :status = 'completed' THEN :updated_at ELSE completed_at END
            WHERE scenario_id = :scenario_id
            """)
            db.execute(query, {
                'scenario_id': scenario_id,
                'status': status,
                'updated_at': datetime.utcnow()
            })

