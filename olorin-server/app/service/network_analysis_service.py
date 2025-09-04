import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import unquote_plus

from fastapi import HTTPException
from starlette.requests import Request

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, OlorinHeader
from app.models.network_risk import NetworkRiskLLMAssessment
from app.models.upi_response import Metadata
from app.persistence import (
from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

    get_investigation,
    update_investigation_llm_thoughts,
)
from app.router.demo_router import demo_cache, demo_mode_users
from app.service.agent.ato_agents.clients.splunk_client import SplunkClient
from app.service.agent.ato_agents.splunk_agent.ato_splunk_query_constructor import (
    build_base_search,
)
from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
from app.service.agent_service import ainvoke_agent
from app.service.config import get_settings_for_env
from app.service.llm_network_risk_service import LLMNetworkRiskService
from app.utils.auth_utils import get_auth_token
from app.utils.constants import LIST_FIELDS_PRIORITY, MAX_PROMPT_TOKENS
from app.utils.prompt_utils import trim_prompt_to_token_limit
from app.utils.prompts import SYSTEM_PROMPT_FOR_NETWORK_RISK

logger = logging.getLogger(__name__)


class NetworkAnalysisService:
    """Service for handling network risk analysis business logic."""

    def __init__(self):
        self.llm_service = LLMNetworkRiskService()

    async def analyze_network(
        self,
        entity_id: str,
        request: Request,
        investigation_id: str,
        time_range: str = "30d",
        splunk_host: Optional[str] = None,
        raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
        entity_type: str = "user_id",
    ) -> dict:
        """Analyze network risk for a user or device."""
        try:
            logger.info(f"=== NETWORK ENDPOINT HIT (service) ===")
            logger.info(f"Processing network request for {entity_type} {entity_id}")

            network_llm_assessment = None  # Always define at start
            settings = get_settings_for_env()

            logger.debug(
                f"[DEMO CHECK] entity_id={entity_id} in demo_mode_users={entity_id in demo_mode_users}, in demo_cache={entity_id in demo_cache}, cache keys={list(demo_cache.get(entity_id, {}).keys()) if entity_id in demo_cache else None}"
            )

            # Check demo mode (using entity_id for backward compatibility)
            if (
                entity_id in demo_mode_users
                and entity_id in demo_cache
                and "network" in demo_cache[entity_id]
                and raw_splunk_override is None
            ):
                return demo_cache[entity_id]["network"]

            auth_header = request.headers.get("authorization")
            logger.info(f"Authorization header for /network/{entity_id}: {auth_header}")
            splunk_warning = None
            llm_error_details = None

            # --- Fetch Splunk results ---
            self._splunk_error = None  # Reset error state
            splunk_results = await self._fetch_splunk_data(
                entity_id, time_range, splunk_host, raw_splunk_override, entity_type
            )
            # Check if there was a Splunk error
            if hasattr(self, "_splunk_error") and self._splunk_error:
                splunk_warning = self._splunk_error

            logger.warning(
                f"[DEBUG] Full network splunk_results for {entity_type} {entity_id}: {splunk_results}"
            )

            # --- Process Splunk results for network signals ---
            extracted_signals = self._process_splunk_results(splunk_results)

            # --- Extract OII country ---
            oii_country = self._extract_oii_country()

            logger.info(
                f"Extracted {len(extracted_signals)} network signals for {entity_type} {entity_id}"
            )

            # Process LLM assessment using dedicated service
            if network_llm_assessment is None:
                network_llm_assessment, llm_error_details = (
                    await self._process_llm_assessment(
                        entity_id,
                        request,
                        extracted_signals,
                        oii_country,
                        investigation_id,
                    )
                )

            if not network_llm_assessment:
                logger.info(
                    f"No network signals extracted or Splunk error occurred for {entity_type} {entity_id}. Creating default network assessment."
                )
                network_llm_assessment = NetworkRiskLLMAssessment(
                    risk_level=0.0,
                    risk_factors=["No network data available or Splunk error"],
                    anomaly_details=[],
                    confidence=0.0,
                    summary="No network signals were available or an error occurred during Splunk retrieval for network analysis.",
                    thoughts="No LLM assessment due to missing network data or Splunk error.",
                )

            # Build response
            response_dict = self._build_response(
                entity_id,
                entity_type,
                investigation_id,
                splunk_results,
                extracted_signals,
                network_llm_assessment,
                splunk_warning,
                llm_error_details,
            )

            return response_dict

        except Exception as e:
            logger.error(
                f"Error in NetworkAnalysisService.analyze_network: {str(e)}",
                exc_info=True,
            )
            return {"error": f"Network analysis failed: {str(e)}"}

    async def _fetch_splunk_data(
        self,
        entity_id: str,
        time_range: str,
        splunk_host: Optional[str],
        raw_splunk_override: Optional[List[Dict[str, Any]]],
        entity_type: str = "user_id",
    ) -> List[Dict[str, Any]]:
        """Fetch Splunk data for network analysis."""
        if raw_splunk_override is not None:
            logger.info("Using raw_splunk_override data")
            return raw_splunk_override

        try:
            # Use SplunkQueryTool like logs domain for better performance
            splunk_tool = SplunkQueryTool()

            # Build the base SPL query using the network query builder
            # Call the network query builder directly with correct entity_type
            from app.service.agent.ato_agents.splunk_agent.ato_splunk_query_constructor import (
                _build_network_query,
            )

            base_query = _build_network_query(entity_id, entity_type)
            # Add earliest time constraint using proper SPL syntax
            splunk_query = base_query.replace(
                f"search index={get_settings_for_env().splunk_index}",
                f"search index={get_settings_for_env().splunk_index} earliest=-{time_range}",
            )

            logger.info(f"Executing Splunk query for network data: {splunk_query}")

            splunk_result = await splunk_tool.arun({"query": splunk_query})
            logger.info(f"Retrieved network events from Splunk: {type(splunk_result)}")

            if (
                splunk_result
                and isinstance(splunk_result, dict)
                and splunk_result.get("results")
            ):
                search_results = splunk_result["results"]
                logger.info(
                    f"Retrieved {len(search_results)} network events from Splunk"
                )
                return search_results
            elif isinstance(splunk_result, list):
                # Handle case where SplunkQueryTool returns list directly
                logger.info(
                    f"Retrieved {len(splunk_result)} network events from Splunk"
                )
                return splunk_result
            else:
                logger.warning(
                    f"Unexpected Splunk result format: {type(splunk_result)}"
                )
                return []

        except Exception as e:
            logger.error(f"Error fetching Splunk data: {str(e)}", exc_info=True)
            # Store the error for the caller
            self._splunk_error = f"Splunk query failed: {str(e)}"
            return []

    def _process_splunk_results(
        self, splunk_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Process Splunk results to extract network signals."""
        extracted_signals = []

        for event in splunk_results:
            # Extract network-related fields
            signal = {
                "entity_id": event.get("user_id")
                or event.get("device_id"),  # Support both
                "timestamp": event.get("_time"),
                "ip_address": event.get("ip_address"),
                "country": event.get("country"),
                "city": event.get("city"),
                "region": event.get("region"),
                "isp": event.get("isp"),
                "organization": event.get("organization"),
                "latitude": event.get("latitude"),
                "longitude": event.get("longitude"),
                "timezone": event.get("timezone"),
                "proxy": event.get("proxy"),
                "vpn": event.get("vpn"),
                "tor": event.get("tor"),
                "threat_type": event.get("threat_type"),
                "asn": event.get("asn"),
            }

            # Only include signals with meaningful data
            if any(signal.values()):
                extracted_signals.append(signal)

        return extracted_signals

    def _extract_oii_country(self) -> Optional[str]:
        """Extract OII country information."""
        # This would integrate with OII service to get official address country
        # For now, returning None as placeholder
        return None

    async def _process_llm_assessment(
        self,
        entity_id: str,
        request: Request,
        extracted_signals: List[Dict[str, Any]],
        oii_country: Optional[str],
        investigation_id: str,
    ) -> tuple[Optional[NetworkRiskLLMAssessment], Optional[Dict[str, Any]]]:
        """Process LLM assessment for network risk using dedicated service."""
        try:
            # Use the dedicated LLM service
            network_llm_assessment = await self.llm_service.assess_network_risk(
                user_id=entity_id,  # LLM service still expects user_id parameter
                extracted_signals=extracted_signals,
                request=request,
                oii_country=oii_country,
            )

            # After LLM assessment, update investigation with network_llm_thoughts if investigation_id is provided
            if investigation_id and network_llm_assessment:
                llm_thoughts = getattr(
                    network_llm_assessment, "thoughts", None
                ) or getattr(network_llm_assessment, "summary", "")
                update_investigation_llm_thoughts(
                    investigation_id, "network", llm_thoughts
                )
                # Persist network risk score
                risk_level = getattr(network_llm_assessment, "risk_level", None)
                if risk_level is not None:
                    investigation = get_investigation(investigation_id)
                    if investigation:
                        investigation.network_risk_score = risk_level
                        # Update in-memory storage
                        from app.persistence import IN_MEMORY_INVESTIGATIONS

                        IN_MEMORY_INVESTIGATIONS[investigation_id] = investigation

            return network_llm_assessment, None

        except Exception as e:
            logger.error(f"LLM assessment failed: {e}", exc_info=True)
            # Create error details for response
            llm_error_details = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "fallback_used": True,
            }

            # Create fallback assessment
            fallback_assessment = NetworkRiskLLMAssessment(
                risk_level=0.0,
                risk_factors=[f"LLM service error: {str(e)}"],
                anomaly_details=[],
                confidence=0.0,
                summary=f"Error during LLM network risk assessment: {str(e)}",
                thoughts="No LLM assessment due to service error.",
            )

            return fallback_assessment, llm_error_details

    def _build_response(
        self,
        entity_id: str,
        entity_type: str,
        investigation_id: str,
        splunk_results: List[Dict[str, Any]],
        extracted_signals: List[Dict[str, Any]],
        network_llm_assessment: Optional[NetworkRiskLLMAssessment],
        splunk_warning: Optional[str],
        llm_error_details: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Build the final response dictionary."""
        # Choose the correct ID key based on entity_type
        id_key = "userId" if entity_type == "user_id" else "deviceId"

        response_dict = {
            id_key: entity_id,
            "raw_splunk_results_count": len(splunk_results),
            "extracted_network_signals": [
                {k: v for k, v in signal.items() if v is not None}
                for signal in extracted_signals
            ],
            "network_risk_assessment": (
                network_llm_assessment.model_dump() if network_llm_assessment else None
            ),
        }

        if splunk_warning:
            response_dict["splunk_warning"] = splunk_warning
        if llm_error_details:
            response_dict["llm_error_details"] = llm_error_details
        if network_llm_assessment and hasattr(network_llm_assessment, "thoughts"):
            response_dict["llm_thoughts"] = network_llm_assessment.thoughts

        # Add investigationId to the response
        response_dict["investigationId"] = investigation_id

        # Remove None values
        response_dict = {k: v for k, v in response_dict.items() if v is not None}

        return response_dict
