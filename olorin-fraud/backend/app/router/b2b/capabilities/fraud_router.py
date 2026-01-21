"""
B2B Fraud Detection Capabilities Router.

Proxy endpoints for B2B partners to access Olorin fraud detection capabilities.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.b2b.partner import ServiceCategory
from app.security.b2b_auth import (
    B2BPartnerContext,
    get_b2b_partner_context,
)
from app.service.b2b.partner_service import get_b2b_partner_service
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/capabilities/fraud", tags=["B2B Fraud Detection"])


# ==================== Request/Response Models ====================


class RiskAssessmentRequest(BaseModel):
    """Risk assessment request."""

    entity_type: str = Field(..., description="user, transaction, device, ip")
    entity_value: str = Field(..., description="The entity identifier")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")
    time_range_days: int = Field(default=30, ge=1, le=365)


class RiskAssessmentResponse(BaseModel):
    """Risk assessment response."""

    entity_type: str
    entity_value: str
    risk_score: float = Field(..., ge=0.0, le=1.0)
    risk_level: str
    risk_factors: List[Dict[str, Any]]
    recommendations: List[str]
    assessment_id: str


class AnomalyDetectionRequest(BaseModel):
    """Anomaly detection request."""

    data_source: str = Field(..., description="Source of data to analyze")
    time_range_hours: int = Field(default=24, ge=1, le=720)
    sensitivity: str = Field(default="medium", pattern="^(low|medium|high)$")
    entity_filter: Optional[Dict[str, str]] = None


class AnomalyDetectionResponse(BaseModel):
    """Anomaly detection response."""

    anomalies_found: int
    anomalies: List[Dict[str, Any]]
    summary: str
    detection_id: str


class InvestigationRequest(BaseModel):
    """Start investigation request."""

    entity_type: str = Field(...)
    entity_value: str = Field(...)
    investigation_type: str = Field(default="standard", pattern="^(quick|standard|deep)$")
    agents_to_run: Optional[List[str]] = None
    data_sources: Optional[List[str]] = None


class InvestigationResponse(BaseModel):
    """Investigation response."""

    investigation_id: str
    status: str
    estimated_completion_seconds: int
    message: str


class InvestigationStatusResponse(BaseModel):
    """Investigation status response."""

    investigation_id: str
    status: str
    progress_percentage: float
    current_phase: str
    findings: Optional[List[Dict[str, Any]]]
    recommendations: Optional[List[str]]
    completed_at: Optional[str]


# ==================== Dependency: Require Fraud Detection Capability ====================


async def require_fraud_capability(
    context: B2BPartnerContext = Depends(get_b2b_partner_context),
) -> B2BPartnerContext:
    """Verify the partner has fraud detection capability enabled."""
    partner_service = get_b2b_partner_service()

    org = await partner_service.get_organization(context.org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    if not org.has_category(ServiceCategory.FRAUD_DETECTION):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Fraud detection capability not enabled for this organization",
        )

    if not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization is suspended",
        )

    return context


# ==================== Endpoints ====================


@router.post("/risk-assessment", response_model=RiskAssessmentResponse)
async def assess_risk(
    request: RiskAssessmentRequest,
    context: B2BPartnerContext = Depends(require_fraud_capability),
) -> RiskAssessmentResponse:
    """
    Perform risk assessment on an entity.

    Analyzes the entity and returns a risk score with contributing factors.
    """
    import secrets

    # Generate assessment ID
    assessment_id = f"risk_{secrets.token_urlsafe(12)}"

    # TODO: Integrate with actual risk assessment service
    # For now, return a structured response
    # This would call: app/service/agent/risk_analyzer.py

    logger.info(
        f"Risk assessment requested: {request.entity_type}={request.entity_value} by org={context.org_id}"
    )

    # Record usage
    await _record_usage(context.org_id, "risk_assessment", 1)

    # Proxy to actual risk assessment service
    try:
        # Import the risk analyzer service
        from app.service.agent.risk_analyzer import RiskAnalyzer

        analyzer = RiskAnalyzer()
        result = await analyzer.analyze_entity(
            entity_type=request.entity_type,
            entity_value=request.entity_value,
            context=request.context,
            time_range_days=request.time_range_days,
        )

        return RiskAssessmentResponse(
            entity_type=request.entity_type,
            entity_value=request.entity_value,
            risk_score=result.get("risk_score", 0.0),
            risk_level=result.get("risk_level", "unknown"),
            risk_factors=result.get("risk_factors", []),
            recommendations=result.get("recommendations", []),
            assessment_id=assessment_id,
        )
    except ImportError:
        # Service not available - return placeholder
        logger.warning("Risk analyzer service not available")
        return RiskAssessmentResponse(
            entity_type=request.entity_type,
            entity_value=request.entity_value,
            risk_score=0.0,
            risk_level="unknown",
            risk_factors=[],
            recommendations=["Risk assessment service temporarily unavailable"],
            assessment_id=assessment_id,
        )
    except Exception as e:
        logger.error(f"Risk assessment failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Risk assessment failed",
        )


@router.post("/anomaly-detection", response_model=AnomalyDetectionResponse)
async def detect_anomalies(
    request: AnomalyDetectionRequest,
    context: B2BPartnerContext = Depends(require_fraud_capability),
) -> AnomalyDetectionResponse:
    """
    Detect anomalies in data.

    Analyzes the specified data source for anomalous patterns.
    """
    import secrets

    detection_id = f"anom_{secrets.token_urlsafe(12)}"

    logger.info(
        f"Anomaly detection requested: source={request.data_source} by org={context.org_id}"
    )

    # Record usage
    await _record_usage(context.org_id, "anomaly_detection", 1)

    try:
        # Import anomaly detection service
        from app.service.analytics.anomaly_detector import AnomalyDetector

        detector = AnomalyDetector()
        result = await detector.detect(
            data_source=request.data_source,
            time_range_hours=request.time_range_hours,
            sensitivity=request.sensitivity,
            entity_filter=request.entity_filter,
        )

        return AnomalyDetectionResponse(
            anomalies_found=result.get("count", 0),
            anomalies=result.get("anomalies", []),
            summary=result.get("summary", ""),
            detection_id=detection_id,
        )
    except ImportError:
        logger.warning("Anomaly detector service not available")
        return AnomalyDetectionResponse(
            anomalies_found=0,
            anomalies=[],
            summary="Anomaly detection service temporarily unavailable",
            detection_id=detection_id,
        )
    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Anomaly detection failed",
        )


@router.post("/investigate", response_model=InvestigationResponse)
async def start_investigation(
    request: InvestigationRequest,
    context: B2BPartnerContext = Depends(require_fraud_capability),
) -> InvestigationResponse:
    """
    Start a fraud investigation.

    Initiates an investigation workflow that runs multiple analysis agents.
    """
    import secrets

    investigation_id = f"inv_{secrets.token_urlsafe(12)}"

    logger.info(
        f"Investigation started: {request.entity_type}={request.entity_value} by org={context.org_id}"
    )

    # Record usage
    await _record_usage(context.org_id, "investigation_api", 1)

    try:
        # Import investigation service
        from app.service.investigation.investigation_service import InvestigationService

        service = InvestigationService()
        result = await service.start_investigation(
            investigation_id=investigation_id,
            entity_type=request.entity_type,
            entity_value=request.entity_value,
            investigation_type=request.investigation_type,
            agents=request.agents_to_run,
            data_sources=request.data_sources,
            tenant_id=context.org_id,
        )

        # Estimate completion time based on investigation type
        time_estimates = {
            "quick": 30,
            "standard": 120,
            "deep": 300,
        }

        return InvestigationResponse(
            investigation_id=investigation_id,
            status="started",
            estimated_completion_seconds=time_estimates.get(request.investigation_type, 120),
            message="Investigation started successfully",
        )
    except ImportError:
        logger.warning("Investigation service not available")
        return InvestigationResponse(
            investigation_id=investigation_id,
            status="pending",
            estimated_completion_seconds=0,
            message="Investigation service temporarily unavailable",
        )
    except Exception as e:
        logger.error(f"Failed to start investigation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start investigation",
        )


@router.get("/investigation/{investigation_id}", response_model=InvestigationStatusResponse)
async def get_investigation_status(
    investigation_id: str,
    context: B2BPartnerContext = Depends(require_fraud_capability),
) -> InvestigationStatusResponse:
    """
    Get the status of an investigation.

    Returns progress and results if completed.
    """
    try:
        # Import investigation service
        from app.persistence.repositories.investigation_repository import InvestigationRepository

        repo = InvestigationRepository()
        investigation = await repo.get_by_id(investigation_id)

        if not investigation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Investigation not found",
            )

        # Verify ownership (tenant_id should match org_id)
        if investigation.tenant_id != context.org_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this investigation",
            )

        return InvestigationStatusResponse(
            investigation_id=investigation.investigation_id,
            status=investigation.status.value,
            progress_percentage=investigation.get_progress_percentage(),
            current_phase=investigation.get_current_phase(),
            findings=investigation.results.findings if investigation.results else None,
            recommendations=investigation.results.recommendations if investigation.results else None,
            completed_at=(
                investigation.updated_at.isoformat()
                if investigation.status.value == "COMPLETED"
                else None
            ),
        )
    except HTTPException:
        raise
    except ImportError:
        logger.warning("Investigation repository not available")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Investigation service temporarily unavailable",
        )
    except Exception as e:
        logger.error(f"Failed to get investigation status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get investigation status",
        )


# ==================== Usage Tracking ====================


async def _record_usage(org_id: str, capability: str, request_count: int) -> None:
    """Record API usage for billing."""
    try:
        from datetime import datetime, timezone

        from app.persistence.mongodb import get_mongodb_client

        client = await get_mongodb_client()
        db = client.get_default_database()
        collection = db["usage_records"]

        # Get or create hourly usage record
        now = datetime.now(timezone.utc)
        period_start = now.replace(minute=0, second=0, microsecond=0)
        period_end = period_start.replace(hour=period_start.hour + 1)

        await collection.update_one(
            {
                "partner_id": org_id,
                "capability": capability,
                "period_start": period_start,
                "granularity": "hourly",
            },
            {
                "$inc": {"request_count": request_count},
                "$setOnInsert": {
                    "period_end": period_end,
                    "tokens_consumed": 0,
                    "audio_seconds_processed": 0,
                    "characters_processed": 0,
                    "estimated_cost_usd": 0,
                    "created_at": now,
                },
            },
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"Failed to record usage: {e}")
