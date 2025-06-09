import logging
import re
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, Request

from app.service.agent.ato_agents.splunk_agent.ato_splunk_query_constructor import (
    build_base_search,
)
from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
from app.service.config import get_settings_for_env
from app.service.llm_device_risk_service import LLMDeviceRiskService

logger = logging.getLogger(__name__)


class DeviceAnalysisService:
    def __init__(self):
        self.llm_service = LLMDeviceRiskService()

    async def analyze_device(
        self,
        entity_id: str,
        entity_type: str,
        investigation_id: str,
        time_range: str = "1m",
        raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
        request: Optional[Request] = None,
        chronos_response_dict: Optional[dict] = None,
        di_response: Optional[Any] = None,
    ) -> Dict[str, Any]:
        settings = get_settings_for_env()
        extracted_signals = []
        splunk_warning = None
        if raw_splunk_override is not None:
            raw_splunk_results = raw_splunk_override
            logger.debug(
                f"[DEMO MODE] Device raw_splunk_results for entity {entity_id}: {raw_splunk_results}"
            )
        else:
            raw_splunk_results = await self._fetch_splunk_data(
                entity_id, time_range, entity_type
            )
            if not raw_splunk_results:
                splunk_warning = (
                    "No device data found in Splunk for the specified time range."
                )
        # Process Splunk results for device signals
        device_country_map = {}
        extracted_signals = []
        for event in raw_splunk_results:
            device_id = event.get("fuzzy_device_id")
            country = event.get("true_ip_country")
            city = event.get("true_ip_city")
            region = event.get("true_ip_region")
            latitude = event.get("true_ip_latitude")
            longitude = event.get("true_ip_longitude")
            true_ip = event.get("true_ip")
            tm_smartid = event.get("tm_smartid")
            tm_sessionid = event.get("tm_sessionid")
            intuit_tid = event.get("intuit_tid")
            _time = event.get("_time")
            if country:
                country = country.upper()
            device_id_key = device_id if device_id is not None else "__NO_DEVICE_ID__"
            if country:
                if device_id_key not in device_country_map:
                    device_country_map[device_id_key] = set()
                device_country_map[device_id_key].add(country)
            extracted_signals.append(
                {
                    "fuzzy_device_id": device_id,
                    "true_ip": true_ip,
                    "true_ip_city": city,
                    "true_ip_country": country,
                    "true_ip_region": region,
                    "true_ip_latitude": latitude,
                    "true_ip_longitude": longitude,
                    "tm_smartid": tm_smartid,
                    "tm_sessionid": tm_sessionid,
                    "intuit_tid": intuit_tid,
                    "_time": _time,
                }
            )
        for signal in extracted_signals:
            device_id = signal["fuzzy_device_id"]
            device_id_key = device_id if device_id is not None else "__NO_DEVICE_ID__"
            signal["countries"] = list(
                sorted(device_country_map.get(device_id_key, []))
            )
        # Call LLM service for risk assessment
        device_llm_assessment = None
        if request is not None:
            try:
                device_llm_assessment = await self.llm_service.assess_device_risk(
                    user_id=entity_id,
                    extracted_signals=extracted_signals,
                    request=request,
                    chronos_response_dict=chronos_response_dict,
                    di_response=di_response,
                )

                # Update investigation with device risk score and thoughts
                if investigation_id and device_llm_assessment:
                    from app.persistence import (
                        get_investigation,
                        update_investigation_llm_thoughts,
                    )

                    # Update LLM thoughts
                    llm_thoughts = (
                        device_llm_assessment.thoughts or device_llm_assessment.summary
                    )
                    update_investigation_llm_thoughts(
                        investigation_id, "device", llm_thoughts
                    )

                    # Update device risk score
                    if device_llm_assessment.risk_level is not None:
                        investigation = get_investigation(investigation_id)
                        if investigation:
                            investigation.device_risk_score = (
                                device_llm_assessment.risk_level
                            )
                            # Update in-memory storage
                            from app.persistence import IN_MEMORY_INVESTIGATIONS

                            IN_MEMORY_INVESTIGATIONS[investigation_id] = investigation

            except Exception as e:
                logger.error(f"LLM device risk assessment failed: {e}", exc_info=True)
                raise HTTPException(
                    status_code=500, detail=f"LLM device risk assessment failed: {e}"
                )
        return {
            "entity_id": entity_id,
            "retrieved_signals": extracted_signals,
            "num_device_signals": len(extracted_signals),
            "splunk_warning": splunk_warning,
            "device_llm_assessment": (
                device_llm_assessment.model_dump() if device_llm_assessment else None
            ),
        }

    async def _fetch_splunk_data(
        self, entity_id: str, time_range: str, entity_type: str
    ) -> List[Dict[str, Any]]:
        """Fetch Splunk data for device analysis using SplunkQueryTool."""
        try:
            # Validate time range format
            if not re.match(r"^\d+[dhmy]$", time_range):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid time_range format: {time_range}. Use format like '1y', '30d'.",
                )

            # Use SplunkQueryTool like other domains for consistency
            splunk_tool = SplunkQueryTool()

            # Build the base SPL query using the device-level query builder
            base_query = build_base_search(
                id_value=entity_id,
                id_type="device",
            )
            # Add earliest time constraint using proper SPL syntax
            splunk_query = base_query.replace(
                f"search index={get_settings_for_env().splunk_index}",
                f"search index={get_settings_for_env().splunk_index} earliest=-{time_range}",
            )

            logger.info(f"Executing Splunk query for device data: {splunk_query}")

            splunk_result = await splunk_tool.arun({"query": splunk_query})
            logger.info(f"Retrieved device events from Splunk: {type(splunk_result)}")

            if (
                splunk_result
                and isinstance(splunk_result, dict)
                and splunk_result.get("results")
            ):
                search_results = splunk_result["results"]
                logger.info(
                    f"Retrieved {len(search_results)} device events from Splunk"
                )
                return search_results
            elif isinstance(splunk_result, list):
                # Handle case where SplunkQueryTool returns list directly
                logger.info(f"Retrieved {len(splunk_result)} device events from Splunk")
                return splunk_result
            else:
                logger.warning(
                    f"Unexpected Splunk result format: {type(splunk_result)}"
                )
                return []

        except Exception as e:
            logger.error(f"Error fetching Splunk data: {str(e)}", exc_info=True)
            return []
