import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import Request

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, IntuitHeader
from app.models.device_risk import DeviceSignalRiskLLMAssessment
from app.models.upi_response import Metadata
from app.service.agent_service import ainvoke_agent
from app.service.base_llm_risk_service import BaseLLMRiskService
from app.service.config import get_settings_for_env
from app.utils.auth_utils import get_auth_token
from app.utils.constants import LIST_FIELDS_PRIORITY, MAX_PROMPT_TOKENS
from app.utils.prompt_utils import trim_prompt_to_token_limit
from app.utils.prompts import SYSTEM_PROMPT_FOR_DEVICE_RISK

logger = logging.getLogger(__name__)


class LLMDeviceRiskService(BaseLLMRiskService[DeviceSignalRiskLLMAssessment]):
    """Service for LLM-based device risk assessment."""

    def get_agent_name(self) -> str:
        """Return the agent name for device risk assessment."""
        return "Intuit.cas.hri.olorin:device-risk-analyzer"

    def get_assessment_model_class(self):
        """Return the Pydantic model class for device risk assessment."""
        return DeviceSignalRiskLLMAssessment

    def get_system_prompt_template(self) -> str:
        """Return the system prompt template for device risk assessment."""
        return SYSTEM_PROMPT_FOR_DEVICE_RISK

    def prepare_prompt_data(
        self, user_id: str, extracted_signals: List[Dict[str, Any]], **kwargs
    ) -> Dict[str, Any]:
        """Prepare the data to be included in the device risk LLM prompt."""
        # Group signals by device ID
        device_signals_map = {}
        for signal in extracted_signals:
            fuzzy_id = signal.get("fuzzy_device_id")
            if fuzzy_id:
                if fuzzy_id not in device_signals_map:
                    device_signals_map[fuzzy_id] = []
                device_signals_map[fuzzy_id].append(signal)

        prompt_data = {
            "user_id": user_id,
            "device_signals": device_signals_map,
            "total_signals": len(extracted_signals),
            "unique_devices": len(device_signals_map),
        }

        # Add optional context data
        chronos_response_dict = kwargs.get("chronos_response_dict")
        if chronos_response_dict and isinstance(chronos_response_dict, dict):
            prompt_data["chronos_data"] = chronos_response_dict

        di_response = kwargs.get("di_response")
        if di_response is not None:
            try:
                prompt_data["di_bb_data"] = di_response.model_dump()
            except Exception:
                prompt_data["di_bb_data"] = str(di_response)

        return prompt_data

    def create_fallback_assessment(
        self,
        user_id: str,
        extracted_signals: List[Dict[str, Any]],
        error_type: str,
        error_message: str,
        **kwargs,
    ) -> DeviceSignalRiskLLMAssessment:
        """Create a fallback device risk assessment when LLM fails."""
        if error_type == "json_parse_error":
            return DeviceSignalRiskLLMAssessment(
                risk_level=0.0,
                risk_factors=["LLM response not valid JSON"],
                anomaly_details=[],
                confidence=0.0,
                summary=f"LLM response was not valid JSON. Error: {error_message}",
                thoughts="No LLM assessment due to LLM JSON error.",
            )

        # For LLM errors, categorize and create intelligent fallback
        risk_factors, summary, thoughts = self.categorize_error(error_message)

        # Create rule-based fallback assessment
        fallback_risk_level = 0.0
        if extracted_signals:
            unique_countries = set()
            unique_devices = set()
            for signal in extracted_signals:
                if signal.get("true_ip_country"):
                    unique_countries.add(signal["true_ip_country"])
                if signal.get("fuzzy_device_id"):
                    unique_devices.add(signal["fuzzy_device_id"])

            if len(unique_countries) > 3:
                fallback_risk_level = 0.6
                risk_factors.append("Multiple countries detected in device signals")
            elif len(unique_countries) > 1:
                fallback_risk_level = 0.3
                risk_factors.append("Multiple countries detected")

            if len(unique_devices) > 5:
                fallback_risk_level = max(fallback_risk_level, 0.4)
                risk_factors.append("High number of unique devices")

        return DeviceSignalRiskLLMAssessment(
            risk_level=fallback_risk_level,
            risk_factors=risk_factors,
            anomaly_details=[],
            confidence=0.2,  # Low confidence since this is a fallback
            summary=summary,
            thoughts=thoughts,
        )

    async def assess_device_risk(
        self,
        user_id: str,
        extracted_signals: List[Dict[str, Any]],
        request: Request,
        chronos_response_dict: Optional[dict] = None,
        di_response: Optional[Any] = None,
    ) -> DeviceSignalRiskLLMAssessment:
        """
        Assess device risk using LLM.

        This is the main public interface for device risk assessment.
        """
        return await self.assess_risk(
            user_id=user_id,
            extracted_signals=extracted_signals,
            request=request,
            chronos_response_dict=chronos_response_dict,
            di_response=di_response,
        )
