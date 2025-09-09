import json
import logging
from app.service.logging import get_bridge_logger
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, Request

from app.persistence import (
    ensure_investigation_exists,
    get_investigation,
    update_investigation_llm_thoughts,
)
from app.router.demo_router import demo_cache, demo_mode_users
from app.service.agent.ato_agents.splunk_agent.ato_splunk_query_constructor import (
    _build_auth_id_query,
    build_base_search,
)
from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
from app.service.agent.tools.sumologic_tool.sumologic_tool import SumoLogicQueryTool
from app.service.config import get_settings_for_env
from app.service.llm_logs_risk_service import LLMLogsRiskService, LogsRiskAssessment
from app.utils.prompt_utils import sanitize_splunk_data

logger = get_bridge_logger(__name__)


class LogsAnalysisService:
    """Service for handling logs risk analysis business logic."""

    def __init__(self):
        self.llm_service = LLMLogsRiskService()
        self.settings = get_settings_for_env()

    async def analyze_logs(
        self,
        entity_id: str,
        request: Request,
        investigation_id: str,
        entity_type: str = "user_id",
        time_range: str = "30d",
        raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
        raw_sumologic_override: Optional[List[Dict[str, Any]]] = None,
        log_sources: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Analyze logs risk for a user or device."""
        # Ensure investigation exists before proceeding
        ensure_investigation_exists(investigation_id, entity_id, entity_type)

        # Set user_id to entity_id since both are essentially the same
        user_id = entity_id

        try:
            settings = get_settings_for_env()

            logger.debug(
                f"[DEMO CHECK] entity_id={entity_id} in demo_mode_users={entity_id in demo_mode_users}, "
                f"in demo_cache={entity_id in demo_cache}, cache keys={list(demo_cache.get(entity_id, {}).keys()) if entity_id in demo_cache else None}"
            )

            # Check demo mode
            if (
                entity_id in demo_mode_users
                and entity_id in demo_cache
                and "logs" in demo_cache[entity_id]
                and raw_splunk_override is None
            ):
                return demo_cache[entity_id]["logs"]

            # Determine log sources to use
            sources_to_use = log_sources or self.settings.enabled_log_sources
            
            # Fetch data from multiple log sources
            all_log_data = await self._fetch_multi_source_data(
                entity_id,
                entity_type,
                time_range,
                settings,
                sources_to_use,
                raw_splunk_override,
                raw_sumologic_override,
            )
            
            # Legacy variable name for backward compatibility
            splunk_data = all_log_data

            sanitized_data = sanitize_splunk_data(splunk_data)

            # Parse logs for analysis
            parsed_logs = self._parse_logs(splunk_data)

            # Chronos integration removed
            chronos_entities = []

            # Early fallback when there are no authentication logs
            if not parsed_logs:
                entity_label = "user" if entity_type == "user_id" else "device"
                error_str = f"No authentication logs found for this {entity_label}."
                fallback_assessment = self.llm_service.create_fallback_assessment(
                    user_id=user_id,
                    extracted_signals=parsed_logs,
                    error_type="llm_error",
                    error_message=f"LLM invocation/validation error: {error_str}",
                    chronos_entities=chronos_entities,
                    investigation_id=investigation_id,
                )
                return self._build_response(
                    entity_id,
                    entity_type,
                    investigation_id,
                    fallback_assessment,
                    sanitized_data,
                    parsed_logs,
                    chronos_entities,
                )

            # Process LLM assessment
            logs_llm_assessment = await self._process_llm_assessment(
                user_id,
                request,
                parsed_logs,
                chronos_entities,
                investigation_id,
            )

            # Build and return response
            return self._build_response(
                entity_id,
                entity_type,
                investigation_id,
                logs_llm_assessment,
                sanitized_data,
                parsed_logs,
                chronos_entities,
            )

        except Exception as e:
            logger.error(
                f"Error in log risk assessment for {entity_type} {entity_id}: {e}",
                exc_info=True,
            )
            return self._build_error_response(
                entity_id, entity_type, investigation_id, e
            )

    async def _fetch_splunk_data(
        self,
        entity_id: str,
        entity_type: str,
        time_range: str,
        settings: Any,
        raw_splunk_override: Optional[List[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        """Fetch Splunk data for logs analysis."""
        if raw_splunk_override is not None:
            return raw_splunk_override

        splunk_data = []
        try:
            # Use SplunkQueryTool for consistency with other domains
            splunk_tool = SplunkQueryTool()

            # Use the auth_id query constructor which is designed for authentication logs
            base_query = _build_auth_id_query(id_value=entity_id, id_type=entity_type)

            # Add time range constraint
            spl_query = base_query.replace(
                f"search index={settings.splunk_index}",
                f"search index={settings.splunk_index} earliest=-{time_range}",
            )

            logger.warning("=== SPLUNK QUERY (UNFORMATTED) === %s", spl_query)
            logger.warning(
                "=== SPLUNK QUERY (FORMATTED) ===\n%s", spl_query.replace(" ", "\n")
            )

            splunk_result = await splunk_tool.arun({"query": spl_query})
            logger.warning("=== SPLUNK RESULT === %s", splunk_result)

            if splunk_result and isinstance(splunk_result, list):
                # Handle case where SplunkQueryTool returns list directly
                splunk_data = splunk_result
            elif (
                splunk_result
                and isinstance(splunk_result, dict)
                and splunk_result.get("results")
            ):
                splunk_data = splunk_result["results"]

        except Exception as splunk_err:
            logger.error(
                f"Splunk operation failed for logs analysis (user {entity_id}): {str(splunk_err)}",
                exc_info=True,
            )
            splunk_data = []

        return splunk_data

    async def _fetch_multi_source_data(
        self,
        entity_id: str,
        entity_type: str,
        time_range: str,
        settings: Any,
        log_sources: List[str],
        raw_splunk_override: Optional[List[Dict[str, Any]]],
        raw_sumologic_override: Optional[List[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        """Fetch data from multiple log sources and harmonize."""
        all_data = []
        
        # Fetch from each enabled source
        for source in log_sources:
            if source == "splunk":
                splunk_data = await self._fetch_splunk_data(
                    entity_id, entity_type, time_range, settings, raw_splunk_override
                )
                # Add source attribution
                for record in splunk_data:
                    record["_log_source"] = "splunk"
                all_data.extend(splunk_data)
                
            elif source == "sumo_logic":
                sumologic_data = await self._fetch_sumologic_data(
                    entity_id, entity_type, time_range, settings, raw_sumologic_override
                )
                # Add source attribution
                for record in sumologic_data:
                    record["_log_source"] = "sumo_logic"
                all_data.extend(sumologic_data)
                
        # Deduplicate and harmonize data
        harmonized_data = self._harmonize_log_data(all_data)
        
        logger.info(f"Multi-source fetch returned {len(harmonized_data)} total records from {len(log_sources)} sources")
        return harmonized_data

    async def _fetch_sumologic_data(
        self,
        entity_id: str,
        entity_type: str,
        time_range: str,
        settings: Any,
        raw_sumologic_override: Optional[List[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        """Fetch SumoLogic data for logs analysis."""
        if raw_sumologic_override is not None:
            return raw_sumologic_override

        sumologic_data = []
        try:
            # Use SumoLogicQueryTool for consistency
            sumologic_tool = SumoLogicQueryTool()

            # Build SumoLogic query - adapt from Splunk patterns
            query = self._build_sumologic_query(entity_id, entity_type)
            from_time = f"-{time_range}"
            to_time = "now"

            logger.info(f"=== SUMOLOGIC QUERY === {query}")
            logger.info(f"=== TIME RANGE === {from_time} to {to_time}")

            sumologic_result = await sumologic_tool._arun(query, from_time, to_time)
            logger.info(f"=== SUMOLOGIC RESULT === {sumologic_result}")

            if sumologic_result and isinstance(sumologic_result, dict):
                if "results" in sumologic_result:
                    sumologic_data = sumologic_result["results"]
                elif isinstance(sumologic_result.get("records"), list):
                    sumologic_data = sumologic_result["records"]
            elif isinstance(sumologic_result, list):
                sumologic_data = sumologic_result

        except Exception as sumologic_err:
            logger.error(
                f"SumoLogic operation failed for logs analysis (user {entity_id}): {str(sumologic_err)}",
                exc_info=True,
            )
            sumologic_data = []

        return sumologic_data

    def _build_sumologic_query(self, entity_id: str, entity_type: str) -> str:
        """Build SumoLogic query for authentication logs."""
        # Adapt from Splunk auth_id query patterns
        if entity_type == "user_id":
            query = f'_sourceCategory="authentication" AND (user_id="{entity_id}" OR email_address="{entity_id}")'
        else:
            query = f'_sourceCategory="authentication" AND device_id="{entity_id}"'
        
        return query

    def _harmonize_log_data(self, all_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Harmonize data from different log sources."""
        harmonized_data = []
        seen_records = set()
        
        for record in all_data:
            # Create a deduplication key
            dedup_key = self._create_dedup_key(record)
            
            if dedup_key not in seen_records:
                seen_records.add(dedup_key)
                # Harmonize field names across sources
                harmonized_record = self._harmonize_record_fields(record)
                harmonized_data.append(harmonized_record)
        
        return harmonized_data

    def _create_dedup_key(self, record: Dict[str, Any]) -> str:
        """Create a deduplication key for log records."""
        # Use timestamp and key identifiers for deduplication
        time_val = record.get("_time") or record.get("timestamp") or ""
        user_val = record.get("email_address") or record.get("user_id") or ""
        ip_val = record.get("olorin_originatingip") or record.get("source_ip") or ""
        
        return f"{time_val}:{user_val}:{ip_val}"

    def _harmonize_record_fields(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Harmonize field names between different log sources."""
        harmonized = record.copy()
        
        # Map common SumoLogic fields to Splunk equivalents for compatibility
        field_mapping = {
            "timestamp": "_time",
            "source_ip": "olorin_originatingip",
            "user_email": "email_address",
            "session_id": "tm_sessionid",
            "device_fingerprint": "fuzzy_device_id",
        }
        
        for sumo_field, splunk_field in field_mapping.items():
            if sumo_field in harmonized and splunk_field not in harmonized:
                harmonized[splunk_field] = harmonized[sumo_field]
        
        return harmonized

    def _parse_logs(self, splunk_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parse logs for analysis."""
        parsed_logs = []
        for event in splunk_data:
            # Handle both direct fields and values() fields from Splunk
            # For values() fields, take the first value if it's a list
            email_address = event.get("email_address") or (
                event.get("values(email_address)")[0]
                if event.get("values(email_address)")
                and len(event.get("values(email_address)")) > 0
                else None
            )
            username = event.get("olorin_username") or (
                event.get("values(olorin_username)")[0]
                if event.get("values(olorin_username)")
                and len(event.get("values(olorin_username)")) > 0
                else None
            )
            offering_id = event.get("olorin_offeringId") or (
                event.get("values(olorin_offeringId)")[0]
                if event.get("values(olorin_offeringId)")
                and len(event.get("values(olorin_offeringId)")) > 0
                else None
            )
            # For transaction and originating_ip, keep them as lists since they can have multiple values
            transaction = event.get("transaction") or event.get("values(transaction)")
            originating_ip = event.get("olorin_originatingip") or event.get(
                "values(olorin_originatingip)"
            )
            isp = event.get("input_ip_isp") or (
                event.get("values(input_ip_isp)")[0]
                if event.get("values(input_ip_isp)")
                and len(event.get("values(input_ip_isp)")) > 0
                else None
            )
            city = event.get("true_ip_city") or (
                event.get("values(true_ip_city)")[0]
                if event.get("values(true_ip_city)")
                and len(event.get("values(true_ip_city)")) > 0
                else None
            )
            region = event.get("input_ip_region") or (
                event.get("values(input_ip_region)")[0]
                if event.get("values(input_ip_region)")
                and len(event.get("values(input_ip_region)")) > 0
                else None
            )
            device_id = event.get("fuzzy_device_id") or (
                event.get("values(fuzzy_device_id)")[0]
                if event.get("values(fuzzy_device_id)")
                and len(event.get("values(fuzzy_device_id)")) > 0
                else None
            )
            device_first_seen = event.get("fuzzy_device_first_seen") or (
                event.get("values(fuzzy_device_first_seen)")[0]
                if event.get("values(fuzzy_device_first_seen)")
                and len(event.get("values(fuzzy_device_first_seen)")) > 0
                else None
            )
            session_id = event.get("tm_sessionid") or (
                event.get("values(tm_sessionid)")[0]
                if event.get("values(tm_sessionid)")
                and len(event.get("values(tm_sessionid)")) > 0
                else None
            )

            parsed_logs.append(
                {
                    "email_address": email_address,
                    "username": username,
                    "offering_id": offering_id,
                    "transaction": transaction,
                    "originating_ip": originating_ip,
                    "isp": isp,
                    "city": city,
                    "region": region,
                    "device_id": device_id,
                    "device_first_seen": device_first_seen,
                    "session_id": session_id,
                    "_time": event.get("_time"),
                }
            )
        return parsed_logs

    async def _process_llm_assessment(
        self,
        user_id: str,
        request: Request,
        parsed_logs: List[Dict[str, Any]],
        chronos_entities: List[Dict[str, Any]],
        investigation_id: str,
    ) -> LogsRiskAssessment:
        """Process LLM risk assessment."""
        try:
            logs_llm_assessment = await self.llm_service.assess_logs_risk(
                user_id=user_id,
                request=request,
                parsed_logs=parsed_logs,
                chronos_entities=chronos_entities,
                investigation_id=investigation_id,
            )

            # Update investigation with LLM thoughts and risk score
            if investigation_id and logs_llm_assessment:
                self._update_investigation(investigation_id, logs_llm_assessment)

            return logs_llm_assessment

        except Exception as e:
            logger.error(
                f"LLM assessment failed for user {user_id}: {e}", exc_info=True
            )
            # Return fallback assessment with new signature
            return self.llm_service.create_fallback_assessment(
                user_id=user_id,
                extracted_signals=parsed_logs,
                error_type="llm_error",
                error_message=str(e),
                chronos_entities=chronos_entities,
                investigation_id=investigation_id,
            )

    def _update_investigation(
        self, investigation_id: str, logs_llm_assessment: LogsRiskAssessment
    ) -> None:
        """Update investigation with logs analysis results."""
        try:
            from app.persistence import update_investigation_llm_thoughts

            # Update LLM thoughts
            llm_thoughts = logs_llm_assessment.summary
            update_investigation_llm_thoughts(
                None, investigation_id, "logs", llm_thoughts
            )

            # Update risk score
            risk_level = logs_llm_assessment.risk_level
            if risk_level is not None:
                investigation = get_investigation(investigation_id)
                if investigation:
                    investigation.logs_risk_score = risk_level
                    # Update in-memory storage
                    from app.persistence import IN_MEMORY_INVESTIGATIONS

                    IN_MEMORY_INVESTIGATIONS[investigation_id] = investigation

        except Exception as e:
            logger.error(f"Failed to update investigation {investigation_id}: {e}")

    def _build_response(
        self,
        entity_id: str,
        entity_type: str,
        investigation_id: str,
        logs_llm_assessment: LogsRiskAssessment,
        sanitized_data: List[Dict[str, Any]],
        parsed_logs: List[Dict[str, Any]],
        chronos_entities: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Build the response dictionary."""
        risk_assessment_data = {
            "risk_level": logs_llm_assessment.risk_level,
            "risk_factors": logs_llm_assessment.risk_factors,
            "confidence": logs_llm_assessment.confidence,
            "summary": logs_llm_assessment.summary,
            "timestamp": logs_llm_assessment.timestamp,
        }

        # Choose the correct ID key based on entity_type
        id_key = "userId" if entity_type == "user_id" else "deviceId"

        return {
            "risk_assessment": risk_assessment_data,
            "splunk_data": sanitized_data,
            "parsed_logs": parsed_logs,
            "chronosEntities": chronos_entities,
            "investigationId": investigation_id,
            id_key: entity_id,
        }

    def _build_error_response(
        self,
        entity_id: str,
        entity_type: str,
        investigation_id: str,
        error: Exception,
    ) -> Dict[str, Any]:
        """Build error response."""
        # Choose the correct ID key based on entity_type
        id_key = "userId" if entity_type == "user_id" else "deviceId"
        error_str = str(error)

        # Create a fallback assessment with error details
        fallback_assessment = LogsRiskAssessment(
            risk_level=0.0,
            risk_factors=[f"LLM invocation/validation error: {error_str}"],
            confidence=0.0,
            summary=f"LLM invocation/validation error: {error_str}",
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

        return {
            "risk_assessment": fallback_assessment.model_dump(),
            "splunk_data": [],
            "parsed_logs": [],
            "chronosEntities": [],
            "investigationId": investigation_id,
            id_key: entity_id,
            "llm_error_details": {
                "error_type": type(error).__name__,
                "error_message": error_str,
            },
        }
