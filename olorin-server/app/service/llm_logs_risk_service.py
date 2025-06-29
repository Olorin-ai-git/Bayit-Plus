import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import unquote_plus

from fastapi import Request
from pydantic import BaseModel

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, IntuitHeader
from app.models.upi_response import Metadata
from app.service.agent_service import ainvoke_agent
from app.service.base_llm_risk_service import BaseLLMRiskService
from app.service.config import get_settings_for_env
from app.utils.auth_utils import get_auth_token
from app.utils.constants import LIST_FIELDS_PRIORITY, MAX_PROMPT_TOKENS
from app.utils.prompt_utils import trim_prompt_to_token_limit
from app.utils.prompts import SYSTEM_PROMPT_FOR_LOG_RISK

logger = logging.getLogger(__name__)


class LogsRiskAssessment(BaseModel):
    """Model for logs risk assessment response."""

    risk_level: float
    risk_factors: List[str]
    confidence: float
    summary: str
    timestamp: str


class LLMLogsRiskService(BaseLLMRiskService[LogsRiskAssessment]):
    """Service for LLM-based logs risk assessment."""

    def get_agent_name(self) -> str:
        return "Intuit.cas.hri.olorin:fpl-splunk"

    def get_assessment_model_class(self) -> type[LogsRiskAssessment]:
        return LogsRiskAssessment

    def get_system_prompt_template(self) -> str:
        return SYSTEM_PROMPT_FOR_LOG_RISK

    def prepare_prompt_data(
        self,
        user_id: str,
        parsed_logs: List[Dict[str, Any]],
        chronos_entities: List[Dict[str, Any]],
        **kwargs,
    ) -> Dict[str, Any]:
        """Prepare prompt data for logs risk assessment."""
        prompt_data = {
            "user_id": user_id,
            "splunk_data": parsed_logs,  # Use parsed logs as splunk_data
            "chronosEntities": chronos_entities,
        }

        # Apply token trimming
        prompt_data, llm_input_prompt, was_trimmed = trim_prompt_to_token_limit(
            prompt_data,
            self.get_system_prompt_template(),
            MAX_PROMPT_TOKENS,
            LIST_FIELDS_PRIORITY,
        )

        if was_trimmed:
            logger.warning(f"Prompt was trimmed for user {user_id}")

        return {
            "prompt_data": prompt_data,
            "llm_input_prompt": llm_input_prompt,
            "was_trimmed": was_trimmed,
        }

    def create_fallback_assessment(
        self,
        user_id: str,
        error: Exception,
        parsed_logs: Optional[List[Dict[str, Any]]] = None,
        **kwargs,
    ) -> LogsRiskAssessment:
        """Create fallback assessment when LLM fails."""
        error_str = str(error)

        # Provide more specific error categorization
        if "External service dependency call failed" in error_str:
            risk_factors = ["LLM service temporarily unavailable"]
            summary = "LLM service is experiencing issues. Assessment based on available data patterns."
        elif "400" in error_str and "error_message" in error_str:
            risk_factors = ["LLM service error - invalid request format"]
            summary = "LLM service rejected the request format. Assessment based on data patterns."
        elif "timeout" in error_str.lower() or "connection" in error_str.lower():
            risk_factors = ["LLM service timeout or connection error"]
            summary = (
                "LLM service connection timeout. Assessment based on available data."
            )
        else:
            risk_factors = [f"LLM invocation/validation error: {str(error)}"]
            summary = "Error during LLM logs risk assessment."

        # Create a more intelligent fallback assessment based on available data
        fallback_risk_level = 0.0
        if parsed_logs:
            # Simple rule-based risk assessment as fallback
            unique_ips = set()
            unique_cities = set()
            for log in parsed_logs:
                if log.get("originating_ips"):
                    unique_ips.update(log["originating_ips"])
                if log.get("cities"):
                    unique_cities.update(log["cities"])

            # Basic risk scoring based on patterns
            if len(unique_ips) > 10:
                fallback_risk_level = 0.5
                risk_factors.append("High number of unique IPs in logs")
            elif len(unique_ips) > 5:
                fallback_risk_level = 0.3
                risk_factors.append("Multiple IPs detected in logs")

            if len(unique_cities) > 5:
                fallback_risk_level = max(fallback_risk_level, 0.4)
                risk_factors.append("Multiple cities detected in logs")

        return LogsRiskAssessment(
            risk_level=fallback_risk_level,
            risk_factors=risk_factors,
            confidence=0.2,  # Low confidence since this is a fallback
            summary=summary,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    async def assess_logs_risk(
        self,
        user_id: str,
        request: Request,
        parsed_logs: List[Dict[str, Any]],
        chronos_entities: List[Dict[str, Any]],
        investigation_id: Optional[str] = None,
    ) -> LogsRiskAssessment:
        """Assess logs risk using LLM."""
        try:
            return await self.assess_risk(
                user_id=user_id,
                request=request,
                parsed_logs=parsed_logs,
                chronos_entities=chronos_entities,
                investigation_id=investigation_id,
            )
        except Exception as e:
            logger.error(f"Error in logs risk assessment: {e}", exc_info=True)
            return self.create_fallback_assessment(
                user_id=user_id,
                error=e,
                parsed_logs=parsed_logs,
            )
