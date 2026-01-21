import logging

from fastapi import APIRouter, Request

from app.service.logging import get_bridge_logger
from app.service.risk_assessment_analysis_service import RiskAssessmentAnalysisService

logger = get_bridge_logger(__name__)

risk_assessment_router = APIRouter()


@risk_assessment_router.get("/risk-assessment/{user_id}")
async def assess_risk(user_id: str, request: Request, investigation_id: str) -> dict:
    """Assess overall risk for a user - delegates to RiskAssessmentAnalysisService."""
    risk_service = RiskAssessmentAnalysisService()
    return await risk_service.assess_risk(
        user_id=user_id,
        request=request,
        investigation_id=investigation_id,
    )
