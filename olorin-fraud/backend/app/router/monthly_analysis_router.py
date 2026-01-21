"""
Monthly Analysis Router

API endpoints for triggering and monitoring monthly analysis flows.
Provides frontend-accessible control over the monthly investigation pipeline.

Feature: monthly-frontend-trigger

Endpoints:
- POST /api/v1/monthly-analysis/trigger - Start monthly flow
- GET  /api/v1/monthly-analysis/status - Current run status
- GET  /api/v1/monthly-analysis/status/{run_id} - Specific run status
- GET  /api/v1/monthly-analysis/history - Past runs
- GET  /api/v1/monthly-analysis/results/{run_id} - Full results
- POST /api/v1/monthly-analysis/cancel/{run_id} - Cancel run
- GET  /api/v1/monthly-analysis/reports/{run_id} - Report downloads
- POST /api/v1/monthly-analysis/blindspot - Standalone blindspot
"""

import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse

from app.middleware.firebase_auth_middleware import (
    AdminUser,
    FirebaseUser,
    InvestigatorUser,
)
from app.schemas.monthly_analysis_api import (
    BlindspotAnalysisResponse,
    BlindspotAnalysisTriggerRequest,
    CancelRunResponse,
    MonthlyAnalysisHistoryResponse,
    MonthlyAnalysisReportsResponse,
    MonthlyAnalysisResultsResponse,
    MonthlyAnalysisStatusResponse,
    MonthlyAnalysisTriggerRequest,
)
from app.service.investigation.monthly_analysis_api_service import (
    get_monthly_analysis_api_service,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(
    prefix="/api/v1/monthly-analysis",
    tags=["monthly-analysis"],
)


def _check_feature_enabled() -> None:
    """Check if monthly analysis API is enabled."""
    enabled = os.getenv("MONTHLY_ANALYSIS_API_ENABLED", "true").lower() == "true"
    if not enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Monthly analysis API is disabled",
        )


@router.post(
    "/trigger",
    response_model=MonthlyAnalysisStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Monthly Analysis",
    description="Start a new monthly analysis run for the specified month.",
)
async def trigger_monthly_analysis(
    request: MonthlyAnalysisTriggerRequest,
    current_user: InvestigatorUser,
) -> MonthlyAnalysisStatusResponse:
    """
    Trigger a new monthly analysis run.

    Requires investigator or admin role.
    Only one analysis can run at a time.

    Args:
        request: Analysis configuration (year, month, options)
        current_user: Authenticated user with investigator role

    Returns:
        Status of the newly created run

    Raises:
        409 Conflict: If another analysis is already running
        503 Unavailable: If monthly analysis API is disabled
    """
    _check_feature_enabled()

    service = get_monthly_analysis_api_service()

    try:
        response = await service.trigger_analysis(
            request=request,
            triggered_by=current_user.email,
        )
        logger.info(
            f"Monthly analysis triggered by {current_user.email}: "
            f"{request.year}/{request.month}"
        )
        return response

    except ValueError as e:
        # Already running
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get(
    "/status",
    response_model=MonthlyAnalysisStatusResponse,
    summary="Get Current Run Status",
    description="Get status of the current or most recent analysis run.",
)
async def get_current_status(
    current_user: FirebaseUser,
) -> MonthlyAnalysisStatusResponse:
    """
    Get status of current/most recent analysis run.

    Args:
        current_user: Any authenticated user

    Returns:
        Status of the current run

    Raises:
        404 Not Found: If no runs exist
    """
    _check_feature_enabled()

    service = get_monthly_analysis_api_service()
    response = service.get_status()

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis runs found",
        )

    return response


@router.get(
    "/status/{run_id}",
    response_model=MonthlyAnalysisStatusResponse,
    summary="Get Specific Run Status",
    description="Get status of a specific analysis run by ID.",
)
async def get_run_status(
    run_id: str,
    current_user: FirebaseUser,
) -> MonthlyAnalysisStatusResponse:
    """
    Get status of a specific run.

    Args:
        run_id: Unique run identifier
        current_user: Any authenticated user

    Returns:
        Status of the specified run

    Raises:
        404 Not Found: If run doesn't exist
    """
    _check_feature_enabled()

    service = get_monthly_analysis_api_service()
    response = service.get_status(run_id=run_id)

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run not found: {run_id}",
        )

    return response


@router.get(
    "/history",
    response_model=MonthlyAnalysisHistoryResponse,
    summary="Get Analysis History",
    description="Get paginated history of past analysis runs.",
)
async def get_analysis_history(
    current_user: FirebaseUser,
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    offset: int = Query(default=0, ge=0, description="Skip first N items"),
    status_filter: Optional[str] = Query(
        default=None,
        description="Filter by status (pending, running, completed, failed, cancelled)",
    ),
) -> MonthlyAnalysisHistoryResponse:
    """
    Get paginated history of analysis runs.

    Args:
        current_user: Any authenticated user
        limit: Maximum items to return (1-100)
        offset: Number of items to skip
        status_filter: Optional status filter

    Returns:
        Paginated list of runs
    """
    _check_feature_enabled()

    service = get_monthly_analysis_api_service()
    return service.get_history(
        limit=limit,
        offset=offset,
        status_filter=status_filter,
    )


@router.get(
    "/results/{run_id}",
    response_model=MonthlyAnalysisResultsResponse,
    summary="Get Full Results",
    description="Get full results for a completed analysis run.",
)
async def get_analysis_results(
    run_id: str,
    current_user: FirebaseUser,
) -> MonthlyAnalysisResultsResponse:
    """
    Get full results for a completed run.

    Args:
        run_id: Unique run identifier
        current_user: Any authenticated user

    Returns:
        Full results with metrics and daily breakdown

    Raises:
        404 Not Found: If run doesn't exist
    """
    _check_feature_enabled()

    service = get_monthly_analysis_api_service()
    response = service.get_results(run_id=run_id)

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run not found: {run_id}",
        )

    return response


@router.post(
    "/cancel/{run_id}",
    response_model=CancelRunResponse,
    summary="Cancel Running Analysis",
    description="Request cancellation of a running analysis.",
)
async def cancel_analysis(
    run_id: str,
    current_user: InvestigatorUser,
) -> CancelRunResponse:
    """
    Cancel a running analysis.

    Requires investigator or admin role.
    Analysis will stop after completing current day.

    Args:
        run_id: Run to cancel
        current_user: User with investigator role

    Returns:
        Cancellation confirmation

    Raises:
        404 Not Found: If run not found or not cancellable
    """
    _check_feature_enabled()

    service = get_monthly_analysis_api_service()
    response = service.cancel_run(run_id=run_id)

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run not found or not running: {run_id}",
        )

    logger.info(f"Monthly analysis cancelled by {current_user.email}: {run_id}")
    return response


@router.get(
    "/reports/{run_id}",
    response_model=MonthlyAnalysisReportsResponse,
    summary="Get Available Reports",
    description="Get list of available reports for a run.",
)
async def get_reports(
    run_id: str,
    current_user: FirebaseUser,
) -> MonthlyAnalysisReportsResponse:
    """
    Get available reports for a run.

    Args:
        run_id: Run identifier
        current_user: Any authenticated user

    Returns:
        List of available report download links

    Raises:
        404 Not Found: If run doesn't exist
    """
    _check_feature_enabled()

    service = get_monthly_analysis_api_service()
    response = service.get_reports(run_id=run_id)

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run not found: {run_id}",
        )

    return response


@router.get(
    "/reports/{run_id}/download/{report_type}",
    summary="Download Report",
    description="Download a specific report file.",
)
async def download_report(
    run_id: str,
    report_type: str,
    current_user: FirebaseUser,
) -> FileResponse:
    """
    Download a report file.

    Args:
        run_id: Run identifier
        report_type: Type of report (html, csv, pdf)
        current_user: Any authenticated user

    Returns:
        File download response

    Raises:
        404 Not Found: If report doesn't exist
    """
    _check_feature_enabled()

    service = get_monthly_analysis_api_service()

    # Get run state to find year/month
    run_status = service.get_status(run_id=run_id)
    if not run_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run not found: {run_id}",
        )

    # Build report path
    output_base_dir = Path(
        os.getenv("MONTHLY_ANALYSIS_OUTPUT_DIR", "artifacts/monthly_analysis")
    )
    output_dir = output_base_dir / f"{run_status.year}_{run_status.month:02d}"

    # Map report type to filename
    filename_map = {
        "html": "monthly_summary.html",
        "csv": "blindspots.csv",
    }

    filename = filename_map.get(report_type)
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid report type: {report_type}",
        )

    report_path = output_dir / filename
    if not report_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report not found: {report_type}",
        )

    # Determine media type
    media_type_map = {
        "html": "text/html",
        "csv": "text/csv",
    }

    return FileResponse(
        path=str(report_path),
        media_type=media_type_map.get(report_type, "application/octet-stream"),
        filename=f"monthly_analysis_{run_status.year}_{run_status.month:02d}.{report_type}",
    )


@router.post(
    "/blindspot",
    response_model=BlindspotAnalysisResponse,
    summary="Run Blindspot Analysis",
    description="Run standalone blindspot analysis without full monthly flow.",
)
async def run_blindspot_analysis(
    request: BlindspotAnalysisTriggerRequest,
    current_user: InvestigatorUser,
) -> BlindspotAnalysisResponse:
    """
    Run standalone blindspot analysis.

    Requires investigator or admin role.

    Args:
        request: Analysis parameters (date range, export options)
        current_user: User with investigator role

    Returns:
        Blindspot analysis results
    """
    _check_feature_enabled()

    service = get_monthly_analysis_api_service()

    logger.info(
        f"Blindspot analysis triggered by {current_user.email}: "
        f"{request.start_date} to {request.end_date}"
    )

    return await service.run_blindspot_analysis(request=request)
