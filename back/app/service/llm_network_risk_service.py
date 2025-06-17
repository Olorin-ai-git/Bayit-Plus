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
        return "Olorin.cas.hri.gaia:network-risk-analyzer"

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

        # Create rule-based fallback assessment with enhanced network pattern detection
        fallback_risk_level = 0.0
        if extracted_signals:
            unique_isps = set()
            unique_orgs = set()
            unique_countries = set()
            unique_ips = set()

            for signal in extracted_signals:
                # ISP analysis
                isp = signal.get("isp")
                if isp:
                    unique_isps.add(str(isp).lower())

                # Organization analysis
                org = signal.get("organization")
                if org:
                    unique_orgs.add(str(org).lower())

                # IP analysis
                ip = signal.get("ip_address") or signal.get("true_ip")
                if ip:
                    unique_ips.add(ip)

                # Country extraction from ISP patterns
                if isp:
                    isp_lower = str(isp).lower()
                    if "olorin" in isp_lower:
                        unique_countries.add("US")
                    elif (
                        "bharti" in isp_lower
                        or "airtel" in isp_lower
                        or "jio" in isp_lower
                    ):
                        unique_countries.add("IN")
                    elif "comcast" in isp_lower or "verizon" in isp_lower:
                        unique_countries.add("US")

            # Enhanced risk scoring based on network diversity patterns
            if len(unique_countries) > 1:
                fallback_risk_level = 0.6
                risk_factors.append(
                    f"Network activity across multiple countries: {', '.join(unique_countries)}"
                )

            if len(unique_isps) > 3:
                fallback_risk_level = max(fallback_risk_level, 0.5)
                risk_factors.append(
                    f"Multiple ISPs detected: {len(unique_isps)} different providers"
                )
            elif len(unique_isps) > 1:
                fallback_risk_level = max(fallback_risk_level, 0.3)
                risk_factors.append(
                    f"Multiple ISPs detected: {', '.join(list(unique_isps)[:3])}"
                )

            if len(unique_orgs) > 2:
                fallback_risk_level = max(fallback_risk_level, 0.4)
                risk_factors.append(
                    f"Multiple organizations detected: {len(unique_orgs)} different entities"
                )

            if len(unique_ips) > 5:
                fallback_risk_level = max(fallback_risk_level, 0.4)
                risk_factors.append(
                    f"High IP diversity: {len(unique_ips)} unique IP addresses"
                )

            # Provide baseline risk if we have any network data
            if unique_isps and fallback_risk_level == 0.0:
                fallback_risk_level = 0.3
                risk_factors.append("Network activity detected with provider diversity")

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
