import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import Request

from app.models.network_risk import NetworkRiskLLMAssessment
from app.service.base_llm_risk_service import BaseLLMRiskService
from app.utils.prompts import SYSTEM_PROMPT_FOR_NETWORK_RISK

logger = logging.getLogger(__name__)


class LLMNetworkRiskService(BaseLLMRiskService[NetworkRiskLLMAssessment]):
    """Service for LLM-based network risk assessment."""

    def get_agent_name(self) -> str:
        """Return the agent name for network risk assessment."""
        return "Intuit.cas.hri.gaia:network-risk-analyzer"

    def get_assessment_model_class(self):
        """Return the Pydantic model class for network risk assessment."""
        return NetworkRiskLLMAssessment

    def get_system_prompt_template(self) -> str:
        """Return the system prompt template for network risk assessment."""
        # Add OII country comparison guidance to the base prompt
        enhanced_prompt = (
            SYSTEM_PROMPT_FOR_NETWORK_RISK
            + " Compare the official address country (oii_country) to the network locations. "
            "If any network activity is seen in a country different from the official address, "
            "flag it as a potential anomaly."
        )
        return enhanced_prompt

    def prepare_prompt_data(
        self, user_id: str, extracted_signals: List[Dict[str, Any]], **kwargs
    ) -> Dict[str, Any]:
        """Prepare the data to be included in the network risk LLM prompt."""
        # Limit signals for LLM processing and remove None values
        signals_for_llm = [
            {k: v for k, v in signal.items() if v is not None}
            for signal in extracted_signals[:10]
        ]

        prompt_data = {
            "user_id": user_id,
            "network_signals": signals_for_llm,
        }

        # Add optional OII country data
        oii_country = kwargs.get("oii_country")
        if oii_country:
            prompt_data["oii_country"] = oii_country

        return prompt_data

    def create_fallback_assessment(
        self,
        user_id: str,
        extracted_signals: List[Dict[str, Any]],
        error_type: str,
        error_message: str,
        **kwargs,
    ) -> NetworkRiskLLMAssessment:
        """Create a fallback network risk assessment when LLM fails."""
        if error_type == "json_parse_error":
            return NetworkRiskLLMAssessment(
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
            # Simple rule-based risk assessment as fallback
            unique_isps = set()
            unique_orgs = set()
            for signal in extracted_signals:
                if signal.get("isp"):
                    unique_isps.add(signal["isp"])
                if signal.get("organization"):
                    unique_orgs.add(signal["organization"])

            # Basic risk scoring based on patterns
            if len(unique_isps) > 5:
                fallback_risk_level = 0.5
                risk_factors.append("Multiple ISPs detected in network signals")
            elif len(unique_isps) > 2:
                fallback_risk_level = 0.3
                risk_factors.append("Multiple ISPs detected")

            if len(unique_orgs) > 3:
                fallback_risk_level = max(fallback_risk_level, 0.4)
                risk_factors.append("Multiple organizations detected")

        return NetworkRiskLLMAssessment(
            risk_level=fallback_risk_level,
            risk_factors=risk_factors,
            anomaly_details=[],
            confidence=0.2,  # Low confidence since this is a fallback
            summary=summary,
            thoughts=thoughts,
        )

    async def assess_network_risk(
        self,
        user_id: str,
        extracted_signals: List[Dict[str, Any]],
        request: Request,
        oii_country: Optional[str] = None,
    ) -> NetworkRiskLLMAssessment:
        """
        Assess network risk using LLM.

        This is the main public interface for network risk assessment.
        """
        return await self.assess_risk(
            user_id=user_id,
            extracted_signals=extracted_signals,
            request=request,
            oii_country=oii_country,
        )
