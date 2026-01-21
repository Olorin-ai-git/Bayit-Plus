"""
KPI Dashboard API Router
Feature: KPI Dashboard Microservice

Provides REST API endpoints for fraud detection KPIs:
- Dashboard metrics (top tiles + charts)
- Daily metrics time series
- Threshold sweep analysis
- Breakdowns by merchant/segment/method/model
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.persistence.database import get_db
from app.schemas.kpi_schemas import (
    KPIBreakdownResponse,
    KPIDailyMetricsResponse,
    KPIDashboardResponse,
    KPIMetricsRequest,
    KPIThresholdSweepResponse,
)
from app.security.auth import User
from app.security.auth import require_read_or_dev as require_read
from app.service.kpi_service import KPIService

router = APIRouter(
    prefix="/api/v1/kpi",
    tags=["KPI Dashboard"],
    responses={404: {"description": "Not found"}},
)


def get_kpi_service(db: Session = Depends(get_db)) -> KPIService:
    """Dependency for KPIService."""
    return KPIService(db)


def get_current_tenant(current_user: User = Depends(require_read)) -> str:
    """
    Extract tenant_id from user context.
    In production, this comes from JWT token or user record.

    Raises HTTPException if tenant_id cannot be determined.
    """
    # Extract tenant_id from user scopes
    # Format: "tenant:{tenant_id}" in scopes
    tenant_scope = next(
        (s for s in current_user.scopes if s.startswith("tenant:")), None
    )
    if tenant_scope:
        return tenant_scope.split(":", 1)[1]

    # Check user record for tenant_id attribute
    tenant_id = getattr(current_user, "tenant_id", None)
    if tenant_id:
        return tenant_id

    # If tenant_id cannot be determined, raise error (no fallback)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Tenant ID could not be determined from user context. Ensure user has tenant scope or tenant_id attribute.",
    )


def check_kpi_permission(current_user: User, required_role: str = "read") -> bool:
    """
    Check if user has permission to access KPI dashboard.

    Roles:
    - admin: Full access
    - analyst: Can edit thresholds, download
    - client_viewer: Read-only, masked fields
    """
    if "admin" in current_user.scopes:
        return True

    if required_role == "read":
        # All authenticated users can read
        return True

    if required_role == "write" and "analyst" in current_user.scopes:
        return True

    if required_role == "view" and "client_viewer" in current_user.scopes:
        return True

    return False


@router.get(
    "/dashboard/{pilot_id}",
    response_model=KPIDashboardResponse,
    summary="Get KPI dashboard",
    description="Get complete KPI dashboard metrics for a pilot. Requires read permission.",
)
async def get_kpi_dashboard(
    pilot_id: str,
    start_date: Optional[datetime] = Query(None, description="Start date for metrics"),
    end_date: Optional[datetime] = Query(None, description="End date for metrics"),
    model_version: Optional[str] = Query(None, description="Filter by model version"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read),
    tenant_id: str = Depends(get_current_tenant),
) -> KPIDashboardResponse:
    """
    Get complete KPI dashboard metrics.

    Access control:
    - admin: Full access
    - analyst: Full access
    - client_viewer: Read-only access (some fields may be masked)
    """
    if not check_kpi_permission(current_user, "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to access KPI dashboard",
        )

    service = get_kpi_service(db)
    return service.get_dashboard_metrics(
        pilot_id=pilot_id,
        tenant_id=tenant_id,
        start_date=start_date,
        end_date=end_date,
        model_version=model_version,
    )


@router.get(
    "/daily/{pilot_id}",
    response_model=List[KPIDailyMetricsResponse],
    summary="Get daily metrics",
    description="Get daily KPI metrics time series",
)
async def get_daily_metrics(
    pilot_id: str,
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read),
    tenant_id: str = Depends(get_current_tenant),
) -> List[KPIDailyMetricsResponse]:
    """Get daily metrics time series."""
    service = get_kpi_service(db)
    return service.get_daily_metrics(
        pilot_id=pilot_id, tenant_id=tenant_id, start_date=start_date, end_date=end_date
    )


@router.get(
    "/threshold-sweep/{pilot_id}",
    response_model=List[KPIThresholdSweepResponse],
    summary="Get threshold sweep",
    description="Get threshold sweep data for profit curve analysis",
)
async def get_threshold_sweep(
    pilot_id: str,
    model_version: Optional[str] = Query(None, description="Filter by model version"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read),
    tenant_id: str = Depends(get_current_tenant),
) -> List[KPIThresholdSweepResponse]:
    """Get threshold sweep data."""
    service = get_kpi_service(db)
    return service.get_threshold_sweep(
        pilot_id=pilot_id, tenant_id=tenant_id, model_version=model_version
    )


@router.get(
    "/breakdowns/{pilot_id}",
    response_model=List[KPIBreakdownResponse],
    summary="Get KPI breakdowns",
    description="Get KPI breakdowns by merchant, segment, method, or model version",
)
async def get_breakdowns(
    pilot_id: str,
    breakdown_type: Optional[str] = Query(
        None, description="merchant, segment, method, model_version"
    ),
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read),
    tenant_id: str = Depends(get_current_tenant),
) -> List[KPIBreakdownResponse]:
    """Get KPI breakdowns."""
    service = get_kpi_service(db)
    return service.get_breakdowns(
        pilot_id=pilot_id,
        tenant_id=tenant_id,
        breakdown_type=breakdown_type,
        start_date=start_date,
        end_date=end_date,
    )
