"""
Investigation Comparison API Router

RESTful API endpoint for comparing fraud metrics across time windows.
Used for OpenAPI schema generation and frontend TypeScript type generation.

Constitutional Compliance:
- All configuration from environment variables
- No hardcoded business logic
- Proper error handling with ErrorResponse model
- Uses existing database provider infrastructure
"""

import os
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Response, status

from app.service.investigation.comparison_service import compare_windows
from app.service.investigation.data_availability_check import check_data_availability
from app.service.investigation.html_report_generator import generate_html_report
from app.service.investigation.investigation_comparison_service import (
    compare_investigations,
)
from app.service.investigation.window_computation import compute_windows_from_specs
from app.service.logging import get_bridge_logger

from .models.investigation_comparison_models import (
    ComparisonRequest,
    ComparisonResponse,
    InvestigationComparisonRequest,
)
from .models.investigation_models import ErrorResponse

logger = get_bridge_logger(__name__)

router = APIRouter(prefix=os.getenv("API_PREFIX", "/api"), tags=["investigation"])


@router.post(
    "/investigation/compare",
    response_model=ComparisonResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request - Invalid input"},
        422: {"model": ErrorResponse, "description": "Validation Error"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
    },
    summary="Compare fraud metrics across time windows",
    description="""
    Compare fraud detection metrics between two time windows for a specific entity
    (and/or merchant scope). Returns metrics, deltas, and optional visualizations.

    **Constitutional Compliance:**
    - Window validation performed by Pydantic models
    - Entity normalization (email: lowercase, phone: E164)
    - All timestamps in ISO 8601 format, America/New_York timezone
    - Divide-by-zero guards in all metric calculations
    - Artifacts persisted to artifacts/ directory

    **Example Request:**
    ```json
    {
        "entity": {"type": "email", "value": "user@example.com"},
        "windowA": {"preset": "retro_14d_6mo_back"},
        "windowB": {"preset": "recent_14d"},
        "risk_threshold": 0.7,
        "options": {
            "include_histograms": true,
            "include_timeseries": true
        }
    }
    ```
    """,
)
async def compare_investigation(request: ComparisonRequest) -> ComparisonResponse:
    """
    Compare fraud metrics across two time windows.

    Constitutional Compliance:
    - Uses existing database provider (Snowflake/PostgreSQL)
    - Window computation uses America/New_York timezone
    - Entity filtering normalizes values (email: lowercase, phone: E164)
    - Metrics calculation guards divide-by-zero
    - Artifacts persisted with deterministic filenames

    Args:
        request: Comparison request with windows, entity, options

    Returns:
        ComparisonResponse with metrics for both windows and deltas

    Raises:
        HTTPException: If validation fails or internal error occurs
    """
    try:
        logger.info(
            f"Comparison request: entity={request.entity}, "
            f"windowA={request.windowA.preset}, windowB={request.windowB.preset}"
        )

        response = await compare_windows(request)

        logger.info(
            f"Comparison completed: {response.A.total_transactions} transactions in A, "
            f"{response.B.total_transactions} transactions in B"
        )

        return response
    except Exception as e:
        logger.error(f"Comparison failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison failed: {str(e)}",
        )


@router.post(
    "/investigation/compare/html",
    response_class=Response,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request - Invalid input"},
        422: {"model": ErrorResponse, "description": "Validation Error"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
    },
    summary="Compare fraud metrics and return HTML report",
    description="""
    Compare fraud detection metrics between two time windows and return
    a comprehensive HTML report with all metrics, charts, and visualizations.
    
    Returns HTML content that can be saved or displayed directly.
    """,
)
async def compare_investigation_html(request: ComparisonRequest) -> Response:
    """
    Compare fraud metrics and return comprehensive HTML report.

    Uses FileOrganizationService to save report to unified structure with source_type="manual".

    Args:
        request: Comparison request with windows, entity, options

    Returns:
        HTML response with complete comparison report
    """
    from datetime import datetime

    from app.config.file_organization_config import FileOrganizationConfig
    from app.service.investigation.file_organization_service import (
        FileOrganizationService,
    )

    try:
        logger.info(
            f"HTML comparison request: entity={request.entity}, "
            f"windowA={request.windowA.preset}, windowB={request.windowB.preset}"
        )

        response = await compare_windows(request)

        # Initialize FileOrganizationService for manual comparison reports
        file_org_config = FileOrganizationConfig()
        file_org_service = FileOrganizationService(file_org_config)

        # Extract entity info for path resolution
        entity_type = request.entity.get("type") if request.entity else "global"
        entity_id = request.entity.get("value") if request.entity else "global"

        # Resolve comparison report path using FileOrganizationService with source_type="manual"
        report_timestamp = datetime.now()
        report_path = file_org_service.resolve_comparison_report_path(
            source_type="manual",
            entity_type=entity_type,
            entity_id=entity_id,
            timestamp=report_timestamp,
        )

        # Create directory structure with validation
        file_org_service.create_directory_structure(report_path.parent)

        # Generate HTML report and save to file
        html_content = generate_html_report(response, report_path)

        # Acquire file lock before writing
        file_handle = None
        try:
            file_handle = file_org_service.lock_file_for_write(
                report_path, create_if_missing=True
            )

            # Write report to file
            with open(report_path, "w", encoding="utf-8") as f:
                f.write(html_content)

            logger.info(
                f"✅ Manual comparison report saved: {report_path} "
                f"(using FileOrganizationService with file locking)"
            )
        finally:
            if file_handle is not None:
                file_org_service.unlock_file(file_handle)

        logger.info("HTML report generated and saved successfully")

        return Response(
            content=html_content,
            media_type="text/html",
            headers={
                "Content-Disposition": f"inline; filename=comparison_report_{entity_type}_{entity_id}.html",
                "X-Report-Path": str(
                    report_path
                ),  # Include report path in headers for UI
            },
        )

    except Exception as e:
        logger.error(f"Error generating HTML comparison report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate HTML report: {str(e)}",
        )


@router.post(
    "/investigation/compare/check-availability",
    status_code=status.HTTP_200_OK,
    summary="Check data availability for comparison",
    description="""
    Check if transaction data exists for the given entity and time windows
    before running a full comparison. Returns availability status for each window.
    """,
)
async def check_comparison_availability(request: ComparisonRequest) -> Dict[str, Any]:
    """
    Check data availability for comparison without running full comparison.

    Args:
        request: Comparison request with windows, entity, options

    Returns:
        Dict with availability status for each window
    """
    try:
        logger.info(
            f"Data availability check: entity={request.entity}, "
            f"windowA={request.windowA.preset}, windowB={request.windowB.preset}"
        )

        window_a_tuple, window_b_tuple = compute_windows_from_specs(
            request.windowA, request.windowB
        )
        window_a_start, window_a_end, window_a_label = window_a_tuple
        window_b_start, window_b_end, window_b_label = window_b_tuple

        availability = await check_data_availability(
            entity_type=request.entity.get("type") if request.entity else None,
            entity_value=request.entity.get("value") if request.entity else None,
            window_a_start=window_a_start,
            window_a_end=window_a_end,
            window_b_start=window_b_start,
            window_b_end=window_b_end,
            merchant_ids=request.merchant_ids,
        )

        return availability

    except Exception as e:
        logger.error(f"Error checking data availability: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check data availability: {str(e)}",
        )


@router.post(
    "/investigation/compare/investigations",
    status_code=status.HTTP_200_OK,
    summary="Compare investigation results (risk scores and LLM insights)",
    description="""
    Compare two investigations for the same entity to validate investigation methodology.
    Compares investigation-level metrics including:
    - Overall risk scores
    - Domain-specific risk scores (device, location, network, logs)
    - LLM insights and thoughts
    
    This validates that investigation methodology is working effectively by comparing
    how investigations performed for the same entity at different times.
    """,
)
async def compare_investigation_results(
    request: InvestigationComparisonRequest,
) -> Dict[str, Any]:
    """
    Compare two investigations by their investigation IDs.

    Args:
        request: Investigation comparison request with two investigation IDs

    Returns:
        Dict with investigation comparison results including metrics, deltas, and summary
    """
    try:
        logger.info(
            f"Investigation comparison request: "
            f"investigation_id_a={request.investigation_id_a}, "
            f"investigation_id_b={request.investigation_id_b}"
        )

        result = await compare_investigations(
            request.investigation_id_a, request.investigation_id_b
        )

        logger.info("Investigation comparison completed successfully")

        return result

    except ValueError as e:
        logger.warning(f"Validation error in investigation comparison: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "ValidationError", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Error comparing investigations: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compare investigations: {str(e)}",
        )

    except ValueError as e:
        logger.warning(f"Validation error in comparison request: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "ValidationError",
                "message": str(e),
                "details": {"request": request.model_dump()},
            },
        )
    except Exception as e:
        logger.error(f"Error in comparison: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "Failed to compare windows",
                "details": {"error_type": type(e).__name__},
            },
        )
