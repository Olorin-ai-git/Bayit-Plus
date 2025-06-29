import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import Request
from pydantic import BaseModel

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, OlorinHeader
from app.models.upi_response import Metadata
from app.service.agent_service import ainvoke_agent
from app.service.base_llm_risk_service import BaseLLMRiskService
from app.service.config import get_settings_for_env
from app.utils.auth_utils import get_auth_token

logger = logging.getLogger(__name__)


class OverallRiskAssessment(BaseModel):
    """Model for overall risk assessment response."""

    overall_risk_score: float
    accumulated_llm_thoughts: str
    timestamp: str


class LLMRiskAssessmentService(BaseLLMRiskService[OverallRiskAssessment]):
    """Service for LLM-based overall risk assessment across all domains."""

    def get_agent_name(self) -> str:
        return "Olorin.cas.hri.olorin:overall-risk-aggregator"

    def get_assessment_model_class(self) -> type[OverallRiskAssessment]:
        return OverallRiskAssessment

    def get_system_prompt_template(self) -> str:
        return """
You are a risk aggregation expert. Given the LLM thoughts and risk scores from each domain (device, location, network, etc.), produce an overall risk score (0.0-1.0) and an accumulated LLM thoughts summary. Respond as JSON:
{
  "overall_risk_score": float, // 0.0-1.0
  "accumulated_llm_thoughts": str, // summary
  "timestamp": str // ISO8601 timestamp
}
IMPORTANT: In your summary (accumulated_llm_thoughts), ALWAYS refer to the computed overall_risk_score as the risk score for the user. Do NOT refer to or mention the individual domain risk scores as the user's risk score. If you discuss risk scores, only use the overall_risk_score you computed.

Your accumulated_llm_thoughts MUST be a comprehensive, multi-paragraph explanation that:
- Clearly explains the reasoning behind the overall risk score, referencing evidence and anomalies from all domains.
- Synthesizes the domain LLM thoughts and scores into a single, human-readable narrative (do NOT just list or concatenate them).
- Explicitly calls out any major risk factors, patterns, or anomalies that contributed to the score.
- Provides clear recommendations for next steps, mitigations, or further investigation, if warranted.
- Is written in a professional, readable style suitable for a risk analyst or investigator.

Input:
"""

    def prepare_prompt_data(
        self,
        user_id: str,
        extracted_signals: List[Dict[str, Any]],
        device_llm_thoughts: Optional[str] = None,
        location_llm_thoughts: Optional[str] = None,
        network_llm_thoughts: Optional[str] = None,
        logs_llm_thoughts: Optional[str] = None,
        device_risk_score: Optional[float] = None,
        location_risk_score: Optional[float] = None,
        network_risk_score: Optional[float] = None,
        logs_risk_score: Optional[float] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Prepare prompt data for overall risk assessment."""
        llm_input = {
            "user_id": user_id,
            "device_llm_thoughts": device_llm_thoughts,
            "location_llm_thoughts": location_llm_thoughts,
            "network_llm_thoughts": network_llm_thoughts,
            "logs_llm_thoughts": logs_llm_thoughts,
            "device_risk_score": device_risk_score,
            "location_risk_score": location_risk_score,
            "network_risk_score": network_risk_score,
            "logs_risk_score": logs_risk_score,
        }

        llm_input_str = json.dumps(llm_input, indent=2)
        system_prompt = self.get_system_prompt_template() + llm_input_str

        return {
            "prompt_data": llm_input,
            "llm_input_prompt": system_prompt,
            "was_trimmed": False,  # Risk assessment prompts are typically small
        }

    def create_fallback_assessment(
        self,
        user_id: str,
        extracted_signals: List[Dict[str, Any]],
        error_type: str,
        error_message: str,
        device_risk_score: Optional[float] = None,
        location_risk_score: Optional[float] = None,
        network_risk_score: Optional[float] = None,
        logs_risk_score: Optional[float] = None,
        **kwargs,
    ) -> OverallRiskAssessment:
        """Create fallback assessment when LLM fails."""
        # Default values for missing scores
        device_score = device_risk_score or 0.0
        location_score = location_risk_score or 0.0
        network_score = network_risk_score or 0.0
        logs_score = logs_risk_score or 0.0

        # Provide more specific error categorization and fallback behavior
        if "External service dependency call failed" in error_message:
            # LLM service is down, calculate fallback risk score
            fallback_risk_score = (
                device_score + location_score + network_score + logs_score
            ) / 4
            fallback_thoughts = f"LLM service temporarily unavailable. Calculated average risk score ({fallback_risk_score:.2f}) from domain scores: Device={device_score}, Location={location_score}, Network={network_score}, Logs={logs_score}."
        elif "400" in error_message and "error_message" in error_message:
            # LLM service rejected request format
            fallback_risk_score = max(
                device_score, location_score, network_score, logs_score
            )
            fallback_thoughts = f"LLM service error - using highest domain risk score ({fallback_risk_score:.2f}). Domain scores: Device={device_score}, Location={location_score}, Network={network_score}, Logs={logs_score}."
        else:
            # Other errors - use average as fallback
            fallback_risk_score = (
                device_score + location_score + network_score + logs_score
            ) / 4
            fallback_thoughts = f"Risk assessment error - using average fallback score ({fallback_risk_score:.2f}). Domain scores: Device={device_score}, Location={location_score}, Network={network_score}, Logs={logs_score}."

        return OverallRiskAssessment(
            overall_risk_score=fallback_risk_score,
            accumulated_llm_thoughts=fallback_thoughts,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    async def assess_overall_risk(
        self,
        user_id: str,
        request: Request,
        device_llm_thoughts: Optional[str] = None,
        location_llm_thoughts: Optional[str] = None,
        network_llm_thoughts: Optional[str] = None,
        logs_llm_thoughts: Optional[str] = None,
        device_risk_score: Optional[float] = None,
        location_risk_score: Optional[float] = None,
        network_risk_score: Optional[float] = None,
        logs_risk_score: Optional[float] = None,
        investigation_id: Optional[str] = None,
    ) -> OverallRiskAssessment:
        """Assess overall risk using LLM."""
        try:
            return await self.assess_risk(
                user_id=user_id,
                extracted_signals=[],  # Overall risk assessment doesn't use extracted signals
                request=request,
                device_llm_thoughts=device_llm_thoughts,
                location_llm_thoughts=location_llm_thoughts,
                network_llm_thoughts=network_llm_thoughts,
                logs_llm_thoughts=logs_llm_thoughts,
                device_risk_score=device_risk_score,
                location_risk_score=location_risk_score,
                network_risk_score=network_risk_score,
                logs_risk_score=logs_risk_score,
                investigation_id=investigation_id,
            )
        except Exception as e:
            logger.error(f"Error in overall risk assessment: {e}", exc_info=True)
            return self.create_fallback_assessment(
                user_id=user_id,
                extracted_signals=[],
                error_type="exception",
                error_message=str(e),
                device_risk_score=device_risk_score,
                location_risk_score=location_risk_score,
                network_risk_score=network_risk_score,
                logs_risk_score=logs_risk_score,
            )
