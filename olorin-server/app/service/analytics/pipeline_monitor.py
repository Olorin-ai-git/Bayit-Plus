"""
Pipeline Monitor Service for observability and SLO tracking.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import os
import json
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy import text
from app.service.logging import get_bridge_logger
from app.service.agent.tools.database_tool import get_database_provider
from app.persistence.database import get_db_session

logger = get_bridge_logger(__name__)


class PipelineMonitor:
    """Monitor pipeline health and SLOs."""

    def __init__(self):
        """Initialize pipeline monitor."""
        db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake')
        self.client = get_database_provider(db_provider)
        self.freshness_threshold_minutes = int(os.getenv('PIPELINE_FRESHNESS_THRESHOLD_MINUTES', '5'))
        self.completeness_threshold = float(os.getenv('PIPELINE_COMPLETENESS_THRESHOLD', '0.99'))
        self.success_rate_threshold = float(os.getenv('PIPELINE_SUCCESS_RATE_THRESHOLD', '0.95'))
        logger.info(f"PipelineMonitor initialized with {db_provider.upper()} provider")

    async def check_freshness(self) -> Dict[str, Any]:
        """
        Check data freshness.

        Returns:
            Freshness metrics dictionary
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
        datetime_col = 'TX_DATETIME' if db_provider == 'snowflake' else 'tx_datetime'
        
        query = f"""
        SELECT MAX({datetime_col}) as latest_timestamp
        FROM {table_name}
        """

        results = self.client.execute_query(query)
        if not results:
            return {"status": "error", "message": "No data found"}

        latest = results[0].get('latest_timestamp')
        if not latest:
            return {"status": "error", "message": "No timestamp found"}

        if isinstance(latest, str):
            latest_dt = datetime.fromisoformat(latest.replace('Z', '+00:00'))
        else:
            latest_dt = latest

        age_minutes = (datetime.now(latest_dt.tzinfo) - latest_dt).total_seconds() / 60

        return {
            "status": "healthy" if age_minutes < self.freshness_threshold_minutes else "stale",
            "latestTimestamp": latest_dt.isoformat(),
            "ageMinutes": age_minutes,
            "thresholdMinutes": self.freshness_threshold_minutes
        }

    async def check_completeness(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        Check data completeness.

        Args:
            start_date: Start of time period
            end_date: End of time period

        Returns:
            Completeness metrics dictionary
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
        datetime_col = 'TX_DATETIME' if db_provider == 'snowflake' else 'tx_datetime'
        model_score_col = 'MODEL_SCORE' if db_provider == 'snowflake' else 'model_score'
        
        where_sql = f"{datetime_col} >= '{start_date.isoformat()}' AND {datetime_col} <= '{end_date.isoformat()}'"

        query = f"""
        SELECT 
            COUNT(*) as actual_count,
            SUM(CASE WHEN {model_score_col} IS NOT NULL THEN 1 ELSE 0 END) as complete_count
        FROM {table_name}
        WHERE {where_sql}
        """

        results = self.client.execute_query(query)
        if not results:
            return {"status": "error", "message": "No data found"}

        row = results[0]
        actual = int(row.get('actual_count', 0) or 0)
        complete = int(row.get('complete_count', 0) or 0)

        completeness = complete / actual if actual > 0 else 0.0

        return {
            "status": "healthy" if completeness >= self.completeness_threshold else "degraded",
            "completeness": completeness,
            "threshold": self.completeness_threshold,
            "actualCount": actual,
            "completeCount": complete
        }

    async def check_success_rate(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        Check pipeline success rate.

        Args:
            start_date: Start of time period
            end_date: End of time period

        Returns:
            Success rate metrics dictionary
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
        datetime_col = 'TX_DATETIME' if db_provider == 'snowflake' else 'tx_datetime'
        model_score_col = 'MODEL_SCORE' if db_provider == 'snowflake' else 'model_score'
        email_col = 'EMAIL' if db_provider == 'snowflake' else 'email'
        
        where_sql = f"{datetime_col} >= '{start_date.isoformat()}' AND {datetime_col} <= '{end_date.isoformat()}'"

        query = f"""
        SELECT 
            COUNT(*) as total_decisions,
            SUM(CASE WHEN {model_score_col} IS NOT NULL AND {email_col} IS NOT NULL THEN 1 ELSE 0 END) as successful_decisions
        FROM {table_name}
        WHERE {where_sql}
        """

        results = self.client.execute_query(query)
        if not results:
            return {"status": "error", "message": "No data found"}

        row = results[0]
        total = int(row.get('total_decisions', 0) or 0)
        successful = int(row.get('successful_decisions', 0) or 0)

        success_rate = successful / total if total > 0 else 0.0

        return {
            "status": "healthy" if success_rate >= self.success_rate_threshold else "degraded",
            "successRate": success_rate,
            "threshold": self.success_rate_threshold,
            "totalDecisions": total,
            "successfulDecisions": successful
        }

    async def get_pipeline_health(self) -> Dict[str, Any]:
        """
        Get comprehensive pipeline health status.

        Returns:
            Pipeline health dictionary
        """
        freshness = await self.check_freshness()
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=1)
        completeness = await self.check_completeness(start_date, end_date)
        success_rate = await self.check_success_rate(start_date, end_date)

        freshness_met = freshness.get('status') == 'healthy'
        completeness_met = completeness.get('status') == 'healthy'
        success_rate_met = success_rate.get('status') == 'healthy'

        overall_status = 'healthy'
        if not (freshness_met and completeness_met and success_rate_met):
            overall_status = 'degraded'
        if not freshness_met and not completeness_met:
            overall_status = 'unhealthy'

        health_data = {
            "overallStatus": overall_status,
            "freshness": freshness,
            "completeness": completeness,
            "successRate": success_rate,
            "sloStatus": {
                "freshnessMet": freshness_met,
                "completenessMet": completeness_met,
                "successRateMet": success_rate_met
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        # Store health snapshot
        await self._store_health_snapshot(health_data)

        return health_data

    async def _store_health_snapshot(self, health_data: Dict[str, Any]) -> None:
        """Store pipeline health snapshot."""
        health_id = str(uuid.uuid4())
        now = datetime.utcnow()

        with get_db_session() as db:
            query = text("""
            INSERT INTO pipeline_health (
                health_id, freshness_minutes, completeness, success_rate,
                freshness_slo_met, completeness_slo_met, success_rate_slo_met,
                overall_status, recorded_at
            ) VALUES (:health_id, :freshness_minutes, :completeness, :success_rate,
                      :freshness_slo_met, :completeness_slo_met, :success_rate_slo_met,
                      :overall_status, :recorded_at)
            """)

            db.execute(query, {
                'health_id': health_id,
                'freshness_minutes': health_data['freshness'].get('ageMinutes', 0),
                'completeness': health_data['completeness'].get('completeness', 0),
                'success_rate': health_data['successRate'].get('successRate', 0),
                'freshness_slo_met': health_data['sloStatus']['freshnessMet'],
                'completeness_slo_met': health_data['sloStatus']['completenessMet'],
                'success_rate_slo_met': health_data['sloStatus']['successRateMet'],
                'overall_status': health_data['overallStatus'],
                'recorded_at': now
            })

    async def log_audit_event(
        self,
        action_type: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        query_params: Optional[Dict[str, Any]] = None,
        request_body: Optional[Dict[str, Any]] = None,
        status_code: Optional[int] = None,
        response_size: Optional[int] = None
    ) -> None:
        """
        Log an audit event.

        Args:
            action_type: Type of action (query, export, create, update, delete, read)
            resource_type: Type of resource
            resource_id: Resource ID
            user_id: User ID
            user_email: User email
            endpoint: API endpoint
            method: HTTP method
            query_params: Query parameters
            request_body: Request body
            status_code: HTTP status code
            response_size: Response size in bytes
        """
        log_id = str(uuid.uuid4())
        now = datetime.utcnow()

        with get_db_session() as db:
            query = text("""
            INSERT INTO audit_logs (
                log_id, action_type, resource_type, resource_id, user_id, user_email,
                endpoint, method, query_params, request_body, status_code, response_size, timestamp
            ) VALUES (:log_id, :action_type, :resource_type, :resource_id, :user_id, :user_email,
                      :endpoint, :method, :query_params, :request_body, :status_code, :response_size, :timestamp)
            """)

            db.execute(query, {
                'log_id': log_id,
                'action_type': action_type,
                'resource_type': resource_type,
                'resource_id': resource_id,
                'user_id': user_id,
                'user_email': user_email,
                'endpoint': endpoint,
                'method': method,
                'query_params': json.dumps(query_params) if query_params else None,
                'request_body': json.dumps(request_body) if request_body else None,
                'status_code': status_code,
                'response_size': response_size,
                'timestamp': now
            })

    async def get_audit_logs(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        action_type: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get audit logs with filters.

        Args:
            start_date: Start date filter
            end_date: End date filter
            action_type: Action type filter
            user_id: User ID filter
            limit: Maximum number of logs to return

        Returns:
            List of audit log dictionaries
        """
        with get_db_session() as db:
            where_clauses = []
            params: Dict[str, Any] = {'limit': limit}

            if start_date:
                where_clauses.append("timestamp >= :start_date")
                params['start_date'] = start_date

            if end_date:
                where_clauses.append("timestamp <= :end_date")
                params['end_date'] = end_date

            if action_type:
                where_clauses.append("action_type = :action_type")
                params['action_type'] = action_type

            if user_id:
                where_clauses.append("user_id = :user_id")
                params['user_id'] = user_id

            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

            query = text(f"""
            SELECT * FROM audit_logs
            WHERE {where_sql}
            ORDER BY timestamp DESC
            LIMIT :limit
            """)

            result = db.execute(query, params)
            logs = [dict(row) for row in result]

        return [
            {
                **log,
                'id': log.get('log_id'),
                'queryParams': json.loads(log.get('query_params', '{}')) if log.get('query_params') else None,
                'requestBody': json.loads(log.get('request_body', '{}')) if log.get('request_body') else None
            }
            for log in logs
        ]

    async def check_slo_violations(self) -> List[Dict[str, Any]]:
        """
        Check for SLO violations and generate alerts.

        Returns:
            List of SLO violation alerts
        """
        health = await self.get_pipeline_health()
        violations = []

        if not health['sloStatus']['freshnessMet']:
            violations.append({
                "slo": "freshness",
                "severity": "high",
                "message": f"Data freshness ({health['freshness']['ageMinutes']:.1f} min) exceeds threshold ({health['freshness']['thresholdMinutes']} min)",
                "currentValue": health['freshness']['ageMinutes'],
                "threshold": health['freshness']['thresholdMinutes']
            })

        if not health['sloStatus']['completenessMet']:
            violations.append({
                "slo": "completeness",
                "severity": "medium",
                "message": f"Data completeness ({health['completeness']['completeness']:.2%}) below threshold ({health['completeness']['threshold']:.2%})",
                "currentValue": health['completeness']['completeness'],
                "threshold": health['completeness']['threshold']
            })

        if not health['sloStatus']['successRateMet']:
            violations.append({
                "slo": "success_rate",
                "severity": "high",
                "message": f"Pipeline success rate ({health['successRate']['successRate']:.2%}) below threshold ({health['successRate']['threshold']:.2%})",
                "currentValue": health['successRate']['successRate'],
                "threshold": health['successRate']['threshold']
            })

        return violations

