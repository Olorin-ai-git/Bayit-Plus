"""
KPI Dashboard Service
Feature: KPI Dashboard Microservice

Business logic for KPI metrics computation and retrieval.
"""

import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.models.kpi_models import KPIBreakdown, KPIDailyMetrics, KPIThresholdSweep
from app.schemas.kpi_schemas import (
    KPIBreakdownResponse,
    KPIDailyMetricsResponse,
    KPIDashboardResponse,
    KPIThresholdSweepResponse,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class KPIService:
    """Service for KPI metrics operations."""

    def __init__(self, db: Session):
        self.db = db
        # Load default date range from environment variable
        self.default_date_range_days = int(
            os.getenv("KPI_DEFAULT_DATE_RANGE_DAYS", "30")
        )

    def get_dashboard_metrics(
        self,
        pilot_id: str,
        tenant_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        model_version: Optional[str] = None,
    ) -> KPIDashboardResponse:
        """
        Get complete KPI dashboard metrics.

        Returns latest metrics for top tiles and time series data.
        """
        # Default date range from environment variable (no hardcoded values)
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=self.default_date_range_days)

        # Get latest daily metrics for top tiles
        latest_metrics = (
            self.db.query(KPIDailyMetrics)
            .filter(
                and_(
                    KPIDailyMetrics.pilot_id == pilot_id,
                    KPIDailyMetrics.tenant_id == tenant_id,
                    KPIDailyMetrics.metric_date <= end_date,
                    KPIDailyMetrics.metric_date >= start_date,
                )
            )
            .order_by(KPIDailyMetrics.metric_date.desc())
            .first()
        )

        # Get time series daily metrics
        daily_metrics_query = self.db.query(KPIDailyMetrics).filter(
            and_(
                KPIDailyMetrics.pilot_id == pilot_id,
                KPIDailyMetrics.tenant_id == tenant_id,
                KPIDailyMetrics.metric_date <= end_date,
                KPIDailyMetrics.metric_date >= start_date,
            )
        )

        if model_version:
            daily_metrics_query = daily_metrics_query.filter(
                KPIDailyMetrics.model_version == model_version
            )

        daily_metrics_list = daily_metrics_query.order_by(
            KPIDailyMetrics.metric_date.asc()
        ).all()

        # Get threshold sweep data
        sweep_query = self.db.query(KPIThresholdSweep).filter(
            and_(
                KPIThresholdSweep.pilot_id == pilot_id,
                KPIThresholdSweep.tenant_id == tenant_id,
                KPIThresholdSweep.sweep_date <= end_date,
                KPIThresholdSweep.sweep_date >= start_date,
            )
        )

        if model_version:
            sweep_query = sweep_query.filter(
                KPIThresholdSweep.model_version == model_version
            )

        threshold_sweep_list = sweep_query.order_by(
            KPIThresholdSweep.threshold.asc()
        ).all()

        # Get breakdowns
        breakdown_query = self.db.query(KPIBreakdown).filter(
            and_(
                KPIBreakdown.pilot_id == pilot_id,
                KPIBreakdown.tenant_id == tenant_id,
                KPIBreakdown.breakdown_date <= end_date,
                KPIBreakdown.breakdown_date >= start_date,
            )
        )

        breakdowns_list = breakdown_query.all()

        # Build response
        return KPIDashboardResponse(
            recall=latest_metrics.recall if latest_metrics else None,
            fpr=latest_metrics.fpr if latest_metrics else None,
            precision=latest_metrics.precision if latest_metrics else None,
            net_savings=latest_metrics.net_savings if latest_metrics else None,
            latency_p95=latest_metrics.latency_p95 if latest_metrics else None,
            error_rate=latest_metrics.error_rate if latest_metrics else None,
            daily_metrics=[
                KPIDailyMetricsResponse.model_validate(m, from_attributes=True)
                for m in daily_metrics_list
            ],
            threshold_sweep=[
                KPIThresholdSweepResponse.model_validate(s, from_attributes=True)
                for s in threshold_sweep_list
            ],
            breakdowns=[
                KPIBreakdownResponse.model_validate(b, from_attributes=True)
                for b in breakdowns_list
            ],
            pilot_id=pilot_id,
            tenant_id=tenant_id,
            date_range_start=start_date,
            date_range_end=end_date,
            last_updated=datetime.utcnow(),
        )

    def get_daily_metrics(
        self,
        pilot_id: str,
        tenant_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[KPIDailyMetricsResponse]:
        """Get daily metrics for time series charts."""
        query = self.db.query(KPIDailyMetrics).filter(
            and_(
                KPIDailyMetrics.pilot_id == pilot_id,
                KPIDailyMetrics.tenant_id == tenant_id,
            )
        )

        if start_date:
            query = query.filter(KPIDailyMetrics.metric_date >= start_date)
        if end_date:
            query = query.filter(KPIDailyMetrics.metric_date <= end_date)

        metrics = query.order_by(KPIDailyMetrics.metric_date.asc()).all()
        return [
            KPIDailyMetricsResponse.model_validate(m, from_attributes=True)
            for m in metrics
        ]

    def get_threshold_sweep(
        self, pilot_id: str, tenant_id: str, model_version: Optional[str] = None
    ) -> List[KPIThresholdSweepResponse]:
        """Get threshold sweep data for profit curve."""
        query = self.db.query(KPIThresholdSweep).filter(
            and_(
                KPIThresholdSweep.pilot_id == pilot_id,
                KPIThresholdSweep.tenant_id == tenant_id,
            )
        )

        if model_version:
            query = query.filter(KPIThresholdSweep.model_version == model_version)

        sweeps = query.order_by(KPIThresholdSweep.threshold.asc()).all()
        return [
            KPIThresholdSweepResponse.model_validate(s, from_attributes=True)
            for s in sweeps
        ]

    def get_breakdowns(
        self,
        pilot_id: str,
        tenant_id: str,
        breakdown_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[KPIBreakdownResponse]:
        """Get KPI breakdowns by dimension."""
        query = self.db.query(KPIBreakdown).filter(
            and_(KPIBreakdown.pilot_id == pilot_id, KPIBreakdown.tenant_id == tenant_id)
        )

        if breakdown_type:
            query = query.filter(KPIBreakdown.breakdown_type == breakdown_type)
        if start_date:
            query = query.filter(KPIBreakdown.breakdown_date >= start_date)
        if end_date:
            query = query.filter(KPIBreakdown.breakdown_date <= end_date)

        breakdowns = query.all()
        return [
            KPIBreakdownResponse.model_validate(b, from_attributes=True)
            for b in breakdowns
        ]
