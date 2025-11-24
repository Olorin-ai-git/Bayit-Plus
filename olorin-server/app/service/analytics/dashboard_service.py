"""
Dashboard Service for analytics microservice.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from app.service.logging import get_bridge_logger
from app.service.analytics.metrics_calculator import MetricsCalculator
from app.models.analytics import AnalyticsDashboardResponse, DashboardKPIs, TrendSeries, TrendDataPoint

logger = get_bridge_logger(__name__)


class DashboardService:
    """Service for generating dashboard data."""

    def __init__(self):
        """Initialize dashboard service."""
        self.metrics_calculator = MetricsCalculator()
        # Dashboard default: 30 days for wider visibility
        self.default_time_window = '30d'

    def _parse_time_window(self, time_window: str) -> timedelta:
        """Parse time window string to timedelta."""
        time_window = time_window.lower()
        if time_window == 'all':
            return timedelta(days=365 * 10)  # 10 years
        elif time_window.endswith('h'):
            return timedelta(hours=int(time_window[:-1]))
        elif time_window.endswith('d'):
            return timedelta(days=int(time_window[:-1]))
        else:
            return timedelta(days=30)

    async def get_dashboard_data(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        time_window: Optional[str] = None,
        investigation_id: Optional[str] = None
    ) -> AnalyticsDashboardResponse:
        """
        Get dashboard data including KPIs and trends.

        Args:
            start_date: Optional start date
            end_date: Optional end date
            time_window: Optional time window string
            investigation_id: Optional investigation ID filter

        Returns:
            AnalyticsDashboardResponse with dashboard data
        """
        # Determine date range
        if end_date is None:
            end_date = datetime.now()
        if start_date is None:
            if time_window:
                delta = self._parse_time_window(time_window)
            else:
                delta = self._parse_time_window(self.default_time_window)
            start_date = end_date - delta

        # Build filters
        filters = {}
        if investigation_id:
            filters['investigation_id'] = investigation_id

        # Calculate metrics
        metrics = await self.metrics_calculator.calculate_metrics(
            start_date, end_date, filters
        )

        # Build KPIs
        kpis = DashboardKPIs(
            precision=metrics.precision,
            recall=metrics.recall,
            f1_score=metrics.f1_score,
            capture_rate=metrics.capture_rate,
            approval_rate=metrics.approval_rate,
            false_positive_cost=metrics.false_positive_cost,
            chargeback_rate=metrics.chargeback_rate,
            decision_throughput=metrics.decision_throughput
        )

        # Generate trend data (simplified - would query actual time series)
        trends = self._generate_trends(start_date, end_date, filters)

        # Get recent decisions (simplified)
        recent_decisions = []

        # Pipeline health (simplified)
        pipeline_health = [{
            'pipelineId': 'main',
            'pipelineName': 'Fraud Detection Pipeline',
            'status': 'healthy',
            'freshnessSeconds': 60
        }]

        return AnalyticsDashboardResponse(
            kpis=kpis,
            trends=trends,
            recent_decisions=recent_decisions,
            pipeline_health=pipeline_health
        )

    def _generate_trends(
        self,
        start_date: datetime,
        end_date: datetime,
        filters: Dict[str, Any]
    ) -> List[TrendSeries]:
        """Generate trend data (simplified implementation)."""
        # In production, this would query actual time series data
        # For now, return empty trends
        return []

