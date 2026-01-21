import logging
from typing import Dict, Optional

from fastapi import HTTPException, Request

from app.persistence import get_investigation
from app.service.llm_risk_assessment_service import (
    LLMRiskAssessmentService,
    OverallRiskAssessment,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RiskAssessmentAnalysisService:
    """Service for handling overall risk assessment business logic."""

    def __init__(self):
        self.llm_service = LLMRiskAssessmentService()

    async def assess_risk(
        self,
        user_id: str,
        request: Request,
        investigation_id: str,
    ) -> Dict[str, any]:
        """Assess overall risk for a user across all domains."""
        try:
            # Load the investigation and use real domain scores/thoughts
            investigation = get_investigation(investigation_id)
            if not investigation:
                raise HTTPException(status_code=404, detail="Investigation not found")

            # Extract domain data from investigation
            domain_data = self._extract_domain_data(investigation)

            # Process LLM assessment
            llm_assessment = await self._process_llm_assessment(
                user_id, request, investigation_id, domain_data
            )

            # Build and return response
            return self._build_response(
                user_id, investigation_id, llm_assessment, domain_data
            )

        except HTTPException:
            # Re-raise HTTP exceptions (like 404) as-is
            raise
        except Exception as e:
            logger.error(
                f"Error in overall risk assessment for user {user_id}: {e}",
                exc_info=True,
            )
            return self._build_error_response(user_id, investigation_id, e)

    def _extract_domain_data(self, investigation) -> Dict[str, Optional[float]]:
        """Extract domain scores and thoughts from investigation."""
        return {
            "device_llm_thoughts": investigation.device_llm_thoughts,
            "location_llm_thoughts": investigation.location_llm_thoughts,
            "network_llm_thoughts": investigation.network_llm_thoughts,
            "logs_llm_thoughts": investigation.logs_llm_thoughts,
            "device_risk_score": investigation.device_risk_score,
            "location_risk_score": investigation.location_risk_score,
            "network_risk_score": investigation.network_risk_score,
            "logs_risk_score": investigation.logs_risk_score,
        }

    async def _process_llm_assessment(
        self,
        user_id: str,
        request: Request,
        investigation_id: str,
        domain_data: Dict[str, any],
    ) -> OverallRiskAssessment:
        """Process LLM overall risk assessment."""
        try:
            llm_assessment = await self.llm_service.assess_overall_risk(
                user_id=user_id,
                request=request,
                investigation_id=investigation_id,
                **domain_data,
            )
            return llm_assessment

        except Exception as e:
            logger.error(
                f"LLM overall risk assessment failed for user {user_id}: {e}",
                exc_info=True,
            )
            # Return fallback assessment
            return self.llm_service.create_fallback_assessment(
                user_id=user_id,
                extracted_signals=[],
                error_type="exception",
                error_message=str(e),
                **domain_data,
            )

    def _build_response(
        self,
        user_id: str,
        investigation_id: str,
        llm_assessment: OverallRiskAssessment,
        domain_data: Dict[str, any],
    ) -> Dict[str, any]:
        """Build the response dictionary."""
        return {
            "userId": user_id,
            "overallRiskScore": llm_assessment.overall_risk_score,
            "accumulatedLLMThoughts": llm_assessment.accumulated_llm_thoughts,
            "remediationActions": llm_assessment.remediation_actions,
            "investigationId": investigation_id,
        }

    def _build_error_response(
        self, user_id: str, investigation_id: str, error: Exception
    ) -> Dict[str, any]:
        """Build error response."""
        error_str = str(error)

        # For critical errors, still try to provide some fallback
        return {
            "userId": user_id,
            "overallRiskScore": 0.0,
            "accumulatedLLMThoughts": f"Risk assessment error: {error_str}",
            "remediationActions": [
                "Review error logs",
                "Contact support if issue persists",
            ],
            "investigationId": investigation_id,
            "error": True,
            "llm_error_details": {
                "error_type": type(error).__name__,
                "error_message": str(error),
                "fallback_used": True,
            },
        }
