import json
import logging
from app.service.logging import get_bridge_logger
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, TYPE_CHECKING

from fastapi import Request

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, OlorinHeader
from app.models.upi_response import Metadata
# Moved imports to inside methods to avoid circular import
# Use TYPE_CHECKING for type hints only
if TYPE_CHECKING:
    from app.service.agent.ato_agents.location_data_agent.client import LocationDataClient
    
from app.service.agent.tools.vector_search_tool.vector_search_tool import (
    VectorSearchTool,
)
from app.service.agent_service import ainvoke_agent
from app.service.config import get_settings_for_env
from app.service.llm_location_risk_service import LLMLocationRiskService
from app.utils.auth_utils import get_auth_token
from app.utils.constants import LIST_FIELDS_PRIORITY, MAX_PROMPT_TOKENS
from app.utils.prompt_utils import trim_prompt_to_token_limit
from app.utils.prompts import SYSTEM_PROMPT_FOR_LOCATION_RISK

logger = get_bridge_logger(__name__)


class LocationAnalysisService:
    """Service for handling location risk analysis business logic."""

    def __init__(
        self,
        location_data_client: "LocationDataClient",
        vector_search_tool: VectorSearchTool,
    ):
        self.location_data_client = location_data_client
        self.vector_search_tool = vector_search_tool
        self.llm_service = LLMLocationRiskService()

    async def analyze_location(
        self,
        entity_id: str,
        entity_type: str,
        request: Request,
        investigation_id: str,
        time_range: str = "30d",
        splunk_host: str = None,
        raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
    ) -> dict:
        """Analyze location risk for a user."""

        try:
            logger.info(f"Processing location request for entity {entity_id}")
            locations_list = []
            device_locations = []
            device_risk_assessment_dict = None
            prompt_data = None
            llm_error_details = None
            vector_search_results = None

            # Demo mode fallback
            # Import here to avoid circular dependency
            from app.router.demo_router import demo_cache, demo_mode_users
            
            if (
                entity_id in demo_mode_users
                and entity_id in demo_cache
                and "location" in demo_cache[entity_id]
                and raw_splunk_override is None
            ):
                logger.info(
                    f"[DEMO MODE] Returning cached location data for entity {entity_id}"
                )
                return demo_cache[entity_id]["location"]

            # Raw override for Splunk data (local demo/test mode)
            if raw_splunk_override is not None:
                logger.info(
                    f"[DEMO OVERRIDE] Using raw_splunk_override for location data for entity {entity_id}"
                )
                splunk_results = raw_splunk_override
                oii_results = []
            else:
                # Only real-data logic remains; include requested time_range
                location_data = await self.location_data_client.get_location_data(
                    entity_id,
                    entity_type,
                    time_range,
                )
                splunk_results = location_data.get("splunk_results", [])
                oii_results = location_data.get("oii_results", [])

            device_locations = []
            device_country_map = {}

            for event in splunk_results:
                device_id = event.get("fuzzy_device_id")
                country = event.get("country")
                city = event.get("city")
                tm_sessionid = event.get("tm_sessionid")
                _time = event.get("_time")

                if country:
                    country = country.upper()

                device_id_key = (
                    device_id if device_id is not None else "__NO_DEVICE_ID__"
                )
                if country:
                    if device_id_key not in device_country_map:
                        device_country_map[device_id_key] = set()
                    device_country_map[device_id_key].add(country)

                device_locations.append(
                    {
                        "fuzzy_device_id": device_id,
                        "city": city,
                        "country": country,
                        "tm_sessionid": tm_sessionid,
                        "_time": _time,
                    }
                )

            for loc in device_locations:
                device_id = loc["fuzzy_device_id"]
                device_id_key = (
                    device_id if device_id is not None else "__NO_DEVICE_ID__"
                )
                loc["countries"] = list(
                    sorted(device_country_map.get(device_id_key, []))
                )

            # Vector search - use EXACTLY the same implementation as master branch
            vector_analysis = None
            try:
                vector_analysis = (
                    await self.location_data_client.analyze_transaction_patterns(
                        splunk_results, entity_id
                    )
                )
                logger.info(
                    f"Vector analysis completed for entity {entity_id}: {vector_analysis.get('analysis_status', 'unknown')}"
                )
            except Exception as vs_err:
                logger.warning(
                    f"Vector search analysis failed for entity {entity_id}: {str(vs_err)}"
                )
                vector_analysis = {
                    "analysis_status": "error",
                    "error": str(vs_err),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }

            # Use dedicated LLM service for risk assessment
            try:
                location_risk_assessment = await self.llm_service.assess_location_risk(
                    user_id=entity_id,
                    device_locations=device_locations,
                    request=request,
                    vector_search_results=vector_analysis,  # Pass vector_analysis from master branch approach
                    oii_results=oii_results,  # Add OII results for enhanced LLM analysis
                )
                location_risk_assessment_data = location_risk_assessment.to_dict()

                # Update investigation with location risk score and thoughts
                if investigation_id and location_risk_assessment:
                    from app.persistence import (
                        get_investigation,
                        update_investigation_llm_thoughts,
                    )

                    # Update LLM thoughts
                    llm_thoughts = (
                        location_risk_assessment.thoughts
                        or location_risk_assessment.summary
                    )
                    update_investigation_llm_thoughts(
                        investigation_id, "location", llm_thoughts
                    )

                    # Update location risk score
                    if location_risk_assessment.risk_level is not None:
                        investigation = get_investigation(investigation_id)
                        if investigation:
                            investigation.location_risk_score = (
                                location_risk_assessment.risk_level
                            )
                            # Update in-memory storage
                            from app.persistence import IN_MEMORY_INVESTIGATIONS

                            IN_MEMORY_INVESTIGATIONS[investigation_id] = investigation

            except Exception as llm_err:
                logger.error(
                    f"LLM location risk assessment failed: {llm_err}", exc_info=True
                )
                # Create fallback assessment
                location_risk_assessment_data = {
                    "risk_level": 0.0,
                    "risk_factors": [f"LLM service error: {str(llm_err)}"],
                    "confidence": 0.0,
                    "summary": f"Error during LLM location risk assessment: {str(llm_err)}",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "thoughts": "No LLM assessment due to service error.",
                }

            return {
                "location_risk_assessment": location_risk_assessment_data,
                "device_locations": device_locations,
                "vector_search_results": vector_analysis,
            }

        except Exception as e:
            logger.error(
                f"Error in LocationAnalysisService.analyze_location: {str(e)}",
                exc_info=True,
            )
            return {"error": f"Location analysis failed: {str(e)}"}
