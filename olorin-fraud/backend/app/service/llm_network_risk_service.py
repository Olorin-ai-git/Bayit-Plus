import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import Request

from app.models.network_risk import NetworkRiskLLMAssessment
from app.service.base_llm_risk_service import BaseLLMRiskService
from app.service.logging import get_bridge_logger
from app.utils.prompts import SYSTEM_PROMPT_FOR_NETWORK_RISK

logger = get_bridge_logger(__name__)


class LLMNetworkRiskService(BaseLLMRiskService[NetworkRiskLLMAssessment]):
    """Service for LLM-based network risk assessment."""

    def get_agent_name(self) -> str:
        """Return the agent name for network risk assessment."""
        return "Olorin.cas.hri.olorin:network-risk-analyzer"

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
                ip = signal.get("ip") or signal.get("true_ip")
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

    async def analyze_network(
        self,
        entity_id: str,
        entity_type: str,
        request: Request,
        investigation_id: str,
        time_range: str = "30d",
        splunk_host: Optional[str] = None,
        raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
    ) -> dict:
        """
        Analyze network risk for a user or device - full orchestration method.

        This method coordinates the full network analysis workflow including
        data extraction, signal processing, and risk assessment.
        """
        from app.service.agent.tools.splunk_tool.ato_splunk_query_constructor import (
            build_base_search,
        )
        from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
        from app.service.config import get_settings_for_env

        try:
            settings = get_settings_for_env()
            logger.info(f"=== NETWORK ANALYSIS START (service) ===")
            logger.info(f"Network risk analysis for {entity_type}: {entity_id}")

            # Use raw Splunk override if provided
            if raw_splunk_override:
                logger.info("Using raw Splunk override data")
                raw_splunk_results = raw_splunk_override
                raw_splunk_results_count = len(raw_splunk_override)
            else:
                # Build and execute Splunk query
                base_query = build_base_search(
                    id_value=entity_id, id_type=entity_type.replace("_id", "")
                )
                splunk_query = base_query.replace(
                    f"search index={settings.splunk_index}",
                    f"search index={settings.splunk_index} earliest=-{time_range}",
                )

                logger.debug(f"Executing Splunk query: {splunk_query}")

                splunk_tool = SplunkQueryTool()
                splunk_result = await splunk_tool.arun({"query": splunk_query})

                if isinstance(splunk_result, dict) and "results" in splunk_result:
                    raw_splunk_results = splunk_result["results"]
                    raw_splunk_results_count = len(raw_splunk_results)
                else:
                    logger.warning(
                        f"Unexpected Splunk result format: {type(splunk_result)}"
                    )
                    raw_splunk_results = []
                    raw_splunk_results_count = 0

            logger.info(f"Retrieved {raw_splunk_results_count} Splunk records")

            # Extract network signals from raw Splunk data
            extracted_network_signals = []
            for record in raw_splunk_results:
                signal = {
                    "user_id": record.get("user_id"),
                    "device_id": record.get("device_id"),
                    "ip": record.get("ip_address") or record.get("true_ip"),
                    "true_ip": record.get("true_ip"),
                    "isp": record.get("isp"),
                    "organization": record.get("organization"),
                    "country": record.get("country"),
                    "city": record.get("city"),
                    "timezone": record.get("timezone"),
                    "timestamp": record.get("timestamp"),
                    "user_agent": record.get("user_agent"),
                }
                # Remove None values
                signal = {k: v for k, v in signal.items() if v is not None}
                if signal:  # Only add if we have some data
                    extracted_network_signals.append(signal)

            logger.info(f"Extracted {len(extracted_network_signals)} network signals")

            # Assess network risk using LLM
            if extracted_network_signals:
                network_risk_assessment = await self.assess_network_risk(
                    user_id=entity_id,
                    extracted_signals=extracted_network_signals,
                    request=request,
                )
            else:
                # Create fallback assessment for no data
                network_risk_assessment = self.create_fallback_assessment(
                    user_id=entity_id,
                    extracted_signals=[],
                    error_type="no_data",
                    error_message="No network signals found in Splunk data",
                )

            # Choose the correct ID key based on entity_type
            id_key = "userId" if entity_type == "user_id" else "deviceId"

            return {
                id_key: entity_id,
                "raw_splunk_results_count": raw_splunk_results_count,
                "extracted_network_signals": extracted_network_signals,
                "network_risk_assessment": {
                    "risk_level": network_risk_assessment.risk_level,
                    "risk_factors": network_risk_assessment.risk_factors,
                    "anomaly_details": network_risk_assessment.anomaly_details,
                    "confidence": network_risk_assessment.confidence,
                    "summary": network_risk_assessment.summary,
                    "thoughts": network_risk_assessment.thoughts,
                },
            }

        except Exception as e:
            logger.error(
                f"Error in network analysis for {entity_type} {entity_id}: {e}",
                exc_info=True,
            )
            # Return a fallback response
            fallback_assessment = {
                "risk_level": 0.0,
                "risk_factors": [f"Error: {str(e)}"],
                "anomaly_details": [],
                "confidence": 0.0,
                "summary": "Error during network risk assessment.",
                "thoughts": "No LLM assessment due to error.",
            }

            # Choose the correct ID key based on entity_type
            id_key = "userId" if entity_type == "user_id" else "deviceId"

            return {
                id_key: entity_id,
                "raw_splunk_results_count": 0,
                "extracted_network_signals": [],
                "network_risk_assessment": fallback_assessment,
            }
