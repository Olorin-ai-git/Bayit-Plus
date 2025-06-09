import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, Request

from app.mock import demo_splunk_data
from app.persistence import (
    ensure_investigation_exists,
    get_investigation,
    update_investigation_llm_thoughts,
)
from app.router.demo_router import demo_cache, demo_mode_users
from app.service.agent.tools.chronos_tool.chronos_tool import ChronosTool
from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
from app.service.config import get_settings_for_env
from app.service.llm_logs_risk_service import LLMLogsRiskService, LogsRiskAssessment
from app.utils.prompt_utils import sanitize_splunk_data

logger = logging.getLogger(__name__)


class LogsAnalysisService:
    """Service for handling logs risk analysis business logic."""

    def __init__(self):
        self.llm_service = LLMLogsRiskService()

    async def analyze_logs(
        self,
        user_id: str,
        request: Request,
        investigation_id: str,
        time_range: str = "1m",
        raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Analyze logs risk for a user."""
        ensure_investigation_exists(investigation_id, user_id)

        try:
            settings = get_settings_for_env()

            logger.debug(
                f"[DEMO CHECK] user_id={user_id} in demo_mode_users={user_id in demo_mode_users}, in demo_cache={user_id in demo_cache}, cache keys={list(demo_cache.get(user_id, {}).keys()) if user_id in demo_cache else None}"
            )

            # Check demo mode
            if (
                user_id in demo_mode_users
                and user_id in demo_cache
                and "logs" in demo_cache[user_id]
                and raw_splunk_override is None
            ):
                return demo_cache[user_id]["logs"]

            # Fetch Splunk data
            splunk_data = await self._fetch_splunk_data(
                user_id, time_range, settings, raw_splunk_override
            )

            sanitized_data = sanitize_splunk_data(splunk_data)

            # Parse logs for analysis
            parsed_logs = self._parse_logs(splunk_data)

            # Fetch Chronos data
            chronos_entities = await self._fetch_chronos_data(user_id, time_range)

            # Process LLM assessment
            logs_llm_assessment = await self._process_llm_assessment(
                user_id, request, parsed_logs, chronos_entities, investigation_id
            )

            # Build and return response
            return self._build_response(
                user_id,
                investigation_id,
                logs_llm_assessment,
                sanitized_data,
                parsed_logs,
                chronos_entities,
            )

        except Exception as e:
            logger.error(
                f"Error in log risk assessment for user {user_id}: {e}", exc_info=True
            )
            return self._build_error_response(user_id, investigation_id, e)

    async def _fetch_splunk_data(
        self,
        user_id: str,
        time_range: str,
        settings: Any,
        raw_splunk_override: Optional[List[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        """Fetch Splunk data for logs analysis."""
        if raw_splunk_override is not None:
            return raw_splunk_override

        splunk_data = []
        try:
            # Use SplunkQueryTool for consistency with location agent
            index = settings.splunk_index
            splunk_tool = SplunkQueryTool()

            # Construct SPL query to extract log fields
            spl_query = (
                f"index={index} intuit_userid={user_id} "
                '| rex field=email_address "(email_address=(?<email_address>.+))" '
                '| rex field=username "(username=(?<username>.+))" '
                '| rex field=offering_ids "(offering_ids=(?<offering_ids>.+))" '
                '| rex field=transactions "(transactions=(?<transactions>.+))" '
                '| rex field=originating_ips "(originating_ips=(?<originating_ips>.+))" '
                '| rex field=isp "(isp=(?<isp>.+))" '
                '| rex field=cities "(cities=(?<cities>.+))" '
                '| rex field=region "(region=(?<region>.+))" '
                '| rex field=device_ids "(device_ids=(?<device_ids>.+))" '
                '| rex field=device_first_seen "(device_first_seen=(?<device_first_seen>.+))" '
                "| eval email_address=urldecode(email_address) "
                "| eval username=urldecode(username) "
                "| eval offering_ids=urldecode(offering_ids) "
                "| eval transactions=urldecode(transactions) "
                "| eval originating_ips=urldecode(originating_ips) "
                "| eval isp=urldecode(isp) "
                "| eval cities=urldecode(cities) "
                "| eval region=urldecode(region) "
                "| eval device_ids=urldecode(device_ids) "
                "| eval device_first_seen=urldecode(device_first_seen) "
                "| table email_address, username, offering_ids, transactions, originating_ips, isp, cities, region, device_ids, device_first_seen, _time"
            )

            logger.warning("=== SPLUNK QUERY (UNFORMATTED) === %s", spl_query)
            logger.warning(
                "=== SPLUNK QUERY (FORMATTED) ===\n%s", spl_query.replace(" ", "\n")
            )

            splunk_result = await splunk_tool.arun({"query": spl_query})
            logger.warning("=== SPLUNK RESULT === %s", splunk_result)

            if (
                splunk_result
                and isinstance(splunk_result, dict)
                and splunk_result.get("results")
            ):
                splunk_data = splunk_result["results"]

        except Exception as splunk_err:
            logger.error(
                f"Splunk operation failed for logs analysis (user {user_id}): {str(splunk_err)}",
                exc_info=True,
            )
            splunk_data = []

        return splunk_data

    def _parse_logs(self, splunk_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parse logs for analysis."""
        parsed_logs = []
        for event in splunk_data:
            parsed_logs.append(
                {
                    "email_address": event.get("email_address"),
                    "username": event.get("username"),
                    "offering_ids": event.get("offering_ids"),
                    "transactions": event.get("transactions"),
                    "originating_ips": event.get("originating_ips"),
                    "isp": event.get("isp"),
                    "cities": event.get("cities"),
                    "region": event.get("region"),
                    "device_ids": event.get("device_ids"),
                    "device_first_seen": event.get("device_first_seen"),
                    "tm_sessionid": event.get("tm_sessionid"),
                    "_time": event.get("_time"),
                }
            )
        return parsed_logs

    async def _fetch_chronos_data(
        self, user_id: str, time_range: str
    ) -> List[Dict[str, Any]]:
        """Fetch Chronos data for logs analysis."""
        chronos_fields = [
            "os",
            "osVersion",
            "trueIpCity",
            "trueIpGeo",
            "ts",
            "kdid",
            "smartId",
            "offeringId",
            "trueIpFirstSeen",
            "trueIpRegion",
            "trueIpLatitude",
            "trueIpLongitude",
            "agentType",
            "browserString",
            "fuzzyDeviceFirstSeen",
            "timezone",
            "tmResponse.tmxReasonCodes",
        ]

        chronos_tool = ChronosTool()
        chronos_response_str = None
        chronos_response = None

        try:
            chronos_response_str = await chronos_tool._arun(
                user_id=user_id, select=chronos_fields
            )
            chronos_response = json.loads(chronos_response_str)
        except Exception as e:
            logger.warning(f"Chronos tool error: {str(e)}")
            chronos_response = {"entities": []}

        if chronos_response is None:
            chronos_response = {"entities": []}

        return chronos_response.get("entities", [])

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
            # Return fallback assessment
            return self.llm_service.create_fallback_assessment(
                user_id=user_id,
                error=e,
                parsed_logs=parsed_logs,
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
        user_id: str,
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

        return {
            "risk_assessment": risk_assessment_data,
            "splunk_data": sanitized_data,
            "parsed_logs": parsed_logs,
            "chronosEntities": chronos_entities,
            "investigationId": investigation_id,
            "userId": user_id,
        }

    def _build_error_response(
        self, user_id: str, investigation_id: str, error: Exception
    ) -> Dict[str, Any]:
        """Build error response."""
        return {
            "risk_assessment": {
                "risk_level": 0.0,
                "risk_factors": [f"LLM invocation/validation error: {str(error)}"],
                "confidence": 0.0,
                "summary": f"Error during LLM log risk assessment: {str(error)}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "splunk_data": [],
            "parsed_logs": [],
            "chronosEntities": [],
            "llm_error_details": {
                "error_type": type(error).__name__,
                "error_message": str(error),
                "fallback_used": True,
            },
            "investigationId": investigation_id,
            "userId": user_id,
        }
