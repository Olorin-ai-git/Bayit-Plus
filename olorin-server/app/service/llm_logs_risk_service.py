import json
import logging
from app.service.logging import get_bridge_logger
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import unquote_plus

from fastapi import Request
from pydantic import BaseModel

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, OlorinHeader
from app.models.upi_response import Metadata
from app.service.agent_service import ainvoke_agent
from app.service.base_llm_risk_service import BaseLLMRiskService
from app.service.config import get_settings_for_env
from app.utils.auth_utils import get_auth_token
from app.utils.constants import LIST_FIELDS_PRIORITY, MAX_PROMPT_TOKENS
from app.utils.prompt_utils import trim_prompt_to_token_limit
from app.utils.prompts import SYSTEM_PROMPT_FOR_LOG_RISK

logger = get_bridge_logger(__name__)


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
        return "Olorin.cas.hri.olorin:fpl-splunk"

    def get_assessment_model_class(self) -> type[LogsRiskAssessment]:
        return LogsRiskAssessment

    def get_system_prompt_template(self) -> str:
        return SYSTEM_PROMPT_FOR_LOG_RISK

    def prepare_prompt_data(
        self,
        user_id: str,
        extracted_signals: List[Dict[str, Any]],
        **kwargs,
    ) -> Dict[str, Any]:
        """Prepare prompt data for logs risk assessment."""
        # Extract chronos_entities from kwargs for backward compatibility
        chronos_entities = kwargs.get("chronos_entities", [])
        parsed_logs = (
            extracted_signals  # For logs, extracted_signals are the parsed logs
        )

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
        extracted_signals: Optional[List[Dict[str, Any]]],
        error_type: str,
        error_message: str,
        **kwargs,
    ) -> LogsRiskAssessment:
        """Create fallback assessment when LLM fails."""
        error_str = error_message

        # Provide more specific error categorization
        if "validation errors for" in error_str:
            risk_factors = ["LLM response schema validation error"]
            summary = "LLM response did not conform to expected schema; using fallback data assessment."
        elif "External service dependency call failed" in error_str:
            risk_factors = ["LLM service temporarily unavailable"]
            summary = "LLM service is experiencing issues. Assessment based on available data patterns."
        elif "400" in error_str and "error_message" in error_str:
            risk_factors = ["LLM service error - invalid request format"]
            summary = "LLM service rejected the request format. Assessment based on data patterns."
        elif "timeout" in error_str.lower() or "connection" in error_str.lower():
            risk_factors = ["LLM invocation/validation error: " + error_str]
            summary = "LLM invocation/validation error: " + error_str
        elif "not valid JSON" in error_str:
            risk_factors = ["LLM invocation/validation error: " + error_str]
            summary = "LLM invocation/validation error: " + error_str
        elif "validation error" in error_str:
            risk_factors = ["LLM invocation/validation error: " + error_str]
            summary = "LLM invocation/validation error: " + error_str
        else:
            risk_factors = ["LLM invocation/validation error: " + error_str]
            summary = "LLM invocation/validation error: " + error_str

        # Create enhanced rule-based fallback assessment with geographic analysis
        fallback_risk_level = 0.0
        if extracted_signals:
            unique_ips = set()
            unique_cities = set()
            unique_countries = set()
            failed_attempts = 0
            total_attempts = 0

            for log in extracted_signals:
                # IP analysis
                if log.get("originating_ips"):
                    unique_ips.update(log["originating_ips"])

                # City analysis
                if log.get("cities"):
                    for city in log["cities"]:
                        unique_cities.add(str(city).lower())

                # Extract countries from known city patterns
                if log.get("cities"):
                    for city in log["cities"]:
                        city_lower = str(city).lower()
                        if city_lower in ["mountain view", "san francisco", "san jose"]:
                            unique_countries.add("US")
                        elif city_lower in [
                            "bengaluru",
                            "bangalore",
                            "mumbai",
                            "delhi",
                        ]:
                            unique_countries.add("IN")
                        elif city_lower in ["london", "manchester"]:
                            unique_countries.add("GB")

                # Transaction analysis
                transactions = log.get("transaction", [])
                if transactions:
                    if isinstance(transactions, list):
                        total_attempts += len(transactions)
                        failed_attempts += sum(
                            1 for t in transactions if "fail" in str(t).lower()
                        )
                    else:
                        total_attempts += 1
                        if "fail" in str(transactions).lower():
                            failed_attempts += 1

            # Enhanced risk scoring based on authentication patterns
            if len(unique_countries) > 1:
                fallback_risk_level = 0.6
                risk_factors.append(
                    f"Authentication from multiple countries: {', '.join(unique_countries)}"
                )

            if len(unique_ips) > 8:
                fallback_risk_level = max(fallback_risk_level, 0.5)
                risk_factors.append(
                    f"High IP diversity in authentication logs: {len(unique_ips)} unique IPs"
                )
            elif len(unique_ips) > 3:
                fallback_risk_level = max(fallback_risk_level, 0.3)
                risk_factors.append(
                    f"Multiple IPs detected in logs: {len(unique_ips)} unique addresses"
                )

            if len(unique_cities) > 4:
                fallback_risk_level = max(fallback_risk_level, 0.4)
                risk_factors.append(
                    f"Authentication from multiple cities: {len(unique_cities)} different locations"
                )

            # Failed authentication analysis
            if total_attempts > 0:
                failure_rate = failed_attempts / total_attempts
                if failure_rate > 0.3:
                    fallback_risk_level = max(fallback_risk_level, 0.6)
                    risk_factors.append(
                        f"High authentication failure rate: {failure_rate:.1%}"
                    )
                elif failure_rate > 0.1:
                    fallback_risk_level = max(fallback_risk_level, 0.4)
                    risk_factors.append(
                        f"Moderate authentication failure rate: {failure_rate:.1%}"
                    )

            # Provide baseline risk if we have any authentication data
            if unique_ips and fallback_risk_level == 0.0:
                fallback_risk_level = 0.3
                risk_factors.append(
                    "Authentication activity detected with geographic indicators"
                )

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
                extracted_signals=parsed_logs,
                request=request,
                chronos_entities=chronos_entities,
                investigation_id=investigation_id,
            )
        except Exception as e:
            logger.error(f"Error in logs risk assessment: {e}", exc_info=True)
            return self.create_fallback_assessment(
                user_id=user_id,
                extracted_signals=parsed_logs,
                error_type="llm_error",
                error_message=str(e),
                chronos_entities=chronos_entities,
                investigation_id=investigation_id,
            )
