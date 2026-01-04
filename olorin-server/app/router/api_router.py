import asyncio
import json
import logging
import os
import re
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

import httpx
from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.requests import Request

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, OlorinHeader
from app.models.agent_request import AgentRequest
from app.models.agent_response import AgentResponse
from app.models.api_models import (
    InvestigationCreate,
    InvestigationOut,
    InvestigationUpdate,
    LocationRiskAnalysisResponse,
)
from app.models.device_risk import (
    AnalyzeDeviceResponse,
    DeviceSignalDetail,
    DeviceSignalRiskLLMAssessment,
)
from app.models.location_risk import LocationRisk, LocationRiskAssessment
from app.models.network_risk import (
    AnalyzeNetworkResponse,
    DeviceNetworkSignal,
    NetworkRiskLLMAssessment,
)
from app.models.upi_response import Metadata
from app.persistence import (
    create_investigation,
    delete_investigation,
    delete_investigations,
    get_investigation,
    list_investigations,
    update_investigation,
)
from app.router.demo_router import demo_cache, demo_mode_users
from app.security.auth import User, require_read, require_write
from app.service.agent_service import ainvoke_agent
from app.service.config import get_settings_for_env
from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger
from app.utils.auth_utils import get_auth_token
from app.utils.constants import LIST_FIELDS_PRIORITY, MAX_PROMPT_TOKENS
from app.utils.firebase_secrets import get_app_secret
from app.utils.prompt_utils import sanitize_splunk_data, trim_prompt_to_token_limit
from app.utils.prompts import SYSTEM_PROMPT_FOR_LOG_RISK

from .device_router import analyze_device
from .device_router import router as device_router
from .investigations_router import investigations_router

# Configure logging - use bridge logger for consistency
logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/api/v1")

# Load API key from Firebase Secret Manager
config_loader = get_config_loader()
OLORIN_API_KEY = config_loader.load_secret("OLORIN_API_KEY") or ""


def get_default_headers():
    """Get default headers with API key from Firebase Secret Manager."""
    if not OLORIN_API_KEY:
        logger.warning("OLORIN_API_KEY not found in Firebase Secret Manager")

    return {
        "Authorization": f"Olorin_APIKey olorin_apikey={OLORIN_API_KEY},olorin_apikey_version=1.0",
        "Content-Type": "application/json",
        "X-Forwarded-Port": "8090",
        "olorin_experience_id": "d3d28eaa-7ca9-4aa2-8905-69ac11fd8c58",
        "olorin_originating_assetalias": "Olorin.cas.hri.olorin",
    }


@router.post("/demo/{user_id}/off")
async def disable_demo_mode(user_id: str):
    demo_mode_users.discard(user_id)
    return {"message": f"Demo mode disabled for user {user_id}"}


@router.get("/demo/{user_id}/all")
async def get_all_demo_agent_responses(user_id: str) -> Dict[str, Any]:
    """Return all cached agent responses for a user in demo mode."""
    if user_id not in demo_mode_users or user_id not in demo_cache:
        return {
            "error": f"User {user_id} is not in demo mode or demo data is not cached. Please call /demo/{user_id} first."
        }
    # Return all cached agent responses
    return {
        "user_id": user_id,
        "demo_mode": True,
        "network": demo_cache[user_id].get("network"),
        "device": demo_cache[user_id].get("device"),
        "location": demo_cache[user_id].get("location"),
        "logs": demo_cache[user_id].get("logs"),
        "oii": demo_cache[user_id].get("oii"),
    }


from app.api.v1.llm_models import router as llm_models_router

from .comment_router import comment_router
from .composio_router import router as composio_router
from .demo_router import router as demo_router
from .device_signals_router import router as device_signals_router
from .ip_risk_router import router as ip_risk_router
from .location_router import router as location_router
from .logs_router import router as logs_router
from .mcp_http_router import router as mcp_http_router

# --- IMPORT NEW ROUTERS ---
from .network_router import router as network_router
from .rag_router import router as rag_router
from .risk_assessment_router import risk_assessment_router
from .settings_router import router as settings_router
from .soar_playbooks_router import router as soar_playbooks_router
from .tenant_config_router import router as tenant_config_router

# --- INCLUDE NEW ROUTERS ---
router.include_router(network_router)
router.include_router(device_router)
router.include_router(location_router)
router.include_router(demo_router)
router.include_router(comment_router)
router.include_router(logs_router)
router.include_router(mcp_http_router)
router.include_router(settings_router)
router.include_router(risk_assessment_router)
router.include_router(investigations_router)
router.include_router(llm_models_router)
router.include_router(rag_router)
router.include_router(composio_router)
router.include_router(tenant_config_router)
router.include_router(device_signals_router)
router.include_router(ip_risk_router)
router.include_router(soar_playbooks_router)

# Include analytics router (works with both PostgreSQL and Snowflake)
try:
    # Use print as fallback since logger might not be initialized at module import time
    import sys

    print("[API_ROUTER] Attempting to import analytics router...", file=sys.stderr)
    logger.info("Attempting to import analytics router...")
    from app.api.routes.analytics import router as analytics_router

    print(
        f"[API_ROUTER] Analytics router imported: prefix={analytics_router.prefix}, routes={len(analytics_router.routes)}",
        file=sys.stderr,
    )
    logger.info(
        f"Analytics router imported successfully, prefix: {analytics_router.prefix}, routes: {len(analytics_router.routes)}"
    )
    router.include_router(analytics_router)
    print(f"[API_ROUTER] ✅ Analytics router included successfully", file=sys.stderr)
    logger.info(
        f"✅ Analytics router included successfully with prefix: {analytics_router.prefix}"
    )
except ImportError as e:
    print(f"[API_ROUTER] ❌ Analytics router import failed: {e}", file=sys.stderr)
    logger.error(f"❌ Analytics router import failed: {e}", exc_info=True)
except Exception as e:
    print(f"[API_ROUTER] ❌ Analytics router error: {e}", file=sys.stderr)
    import traceback

    traceback.print_exc(file=sys.stderr)
    logger.error(f"❌ Analytics router not available: {e}", exc_info=True)


@router.get("/oii/{user_id}")
async def get_online_identity_info(user_id: str, request: Request) -> Dict[str, Any]:
    if (
        user_id in demo_mode_users
        and user_id in demo_cache
        and "oii" in demo_cache[user_id]
    ):
        return demo_cache[user_id]["oii"]
    auth_header = request.headers.get("authorization")
    logger.info(f"Authorization header: {auth_header}")
    """Retrieve online identity information using intelligence tools."""
    try:
        # Use the people search and social media profiling tools as OII replacement
        from app.service.agent.tools.intelligence_tools.people_search import (
            PeopleSearchTool,
        )
        from app.service.agent.tools.intelligence_tools.social_media_profiling import (
            SocialMediaProfilingTool,
        )

        # Initialize tools
        people_tool = PeopleSearchTool()
        social_tool = SocialMediaProfilingTool()

        # Search for identity information
        people_result = people_tool._run(user_id)
        social_result = social_tool._run(user_id)

        # Combine results into OII-like format
        oii_result = {
            "user_id": user_id,
            "identity_verification": people_result.get("identity_verification", {}),
            "background_records": people_result.get("background_records", {}),
            "social_media_presence": social_result.get("profiles", {}),
            "risk_indicators": people_result.get("risk_indicators", []),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data_sources": ["people_search", "social_media_profiling"],
        }

        return oii_result

    except Exception as e:
        logger.error(f"Online identity information lookup failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Identity lookup failed: {str(e)}")


@router.get("/logs/{user_id}")
async def analyze_logs(
    user_id: str,
    request: Request,
    investigation_id: str,
    time_range: str = "1m",
    raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    try:
        settings = get_settings_for_env()
        logger.debug(
            f"[DEMO CHECK] user_id={user_id} in demo_mode_users={user_id in demo_mode_users}, in demo_cache={user_id in demo_cache}, cache keys={list(demo_cache.get(user_id, {}).keys()) if user_id in demo_cache else None}"
        )
        if (
            user_id in demo_mode_users
            and user_id in demo_cache
            and "logs" in demo_cache[user_id]
            and raw_splunk_override is None
        ):
            return demo_cache[user_id]["logs"]
        auth_header = request.headers.get("authorization")
        logger.info(f"Authorization header: {auth_header}")
        if raw_splunk_override is not None:
            splunk_data = raw_splunk_override
        else:
            splunk_data = []
            try:
                # First, verify the agent graph exists
                if (
                    not hasattr(request.app.state, "graph")
                    or request.app.state.graph is None
                ):
                    raise HTTPException(
                        status_code=503,
                        detail="Agent service is not available. The server is still initializing or encountered an error.",
                    )
                from app.service.agent.tools.splunk_tool.splunk_tool import (
                    SplunkQueryTool,
                )

                # Build the SPL query directly (no mocks)
                splunk_query = f'search index={settings.splunk_index} earliest=-{time_range} | where auth_id="{user_id}"'

                logger.info(f"Executing Splunk query for logs: {splunk_query}")

                # Use SplunkQueryTool instead of direct client
                splunk_tool = SplunkQueryTool()
                splunk_result = await splunk_tool.arun({"query": splunk_query})

                if (
                    splunk_result
                    and isinstance(splunk_result, dict)
                    and splunk_result.get("results")
                ):
                    splunk_data = splunk_result["results"]
                elif isinstance(splunk_result, list):
                    splunk_data = splunk_result
                else:
                    logger.warning(
                        f"Unexpected Splunk result format: {type(splunk_result)}"
                    )
                    splunk_data = []
            except Exception as splunk_err:
                logger.error(
                    f"Splunk operation failed for logs analysis (user {user_id}): {str(splunk_err)}",
                    exc_info=True,
                )
                splunk_data = []

        sanitized_data = sanitize_splunk_data(splunk_data)

        # --- LLM Prompt Construction ---
        prompt_data = {
            "user_id": user_id,
            "splunk_data": sanitized_data,
        }
        chat_history_for_prompt = []
        system_prompt_for_log_risk = SYSTEM_PROMPT_FOR_LOG_RISK
        prompt_data, llm_input_prompt, was_trimmed = trim_prompt_to_token_limit(
            prompt_data,
            system_prompt_for_log_risk,
            MAX_PROMPT_TOKENS,
            LIST_FIELDS_PRIORITY,
        )
        # Use llm_input_prompt for the LLM call
        if was_trimmed:
            logger.warning(f"Prompt was trimmed for user {user_id}")

        metadata = Metadata(
            interaction_group_id="fraud_flow",
            additional_metadata={"userId": user_id},
        )
        agent_name = "Olorin.cas.hri.olorin:fpl-splunk"
        olorin_userid, olorin_token, olorin_realmid = get_auth_token()
        agent_context = AgentContext(
            input=llm_input_prompt,
            agent_name=agent_name,
            metadata=metadata,
            olorin_header=OlorinHeader(
                olorin_tid="test",
                olorin_originating_assetalias="Olorin.cas.hri.olorin",
                olorin_experience_id=settings.olorin_experience_id,
                auth_context=AuthContext(
                    olorin_user_id=olorin_userid,
                    olorin_user_token=olorin_token,
                    olorin_realmid=olorin_realmid,
                ),
            ),
        )

        # Invoke the agent graph (this will allow the LLM to analyze the Splunk data)
        response_str, trace_id = await ainvoke_agent(request, agent_context)

        # Parse and validate the response as with other agents
        try:
            parsed_llm_risk_response = json.loads(response_str)
            risk_assessment_data = parsed_llm_risk_response.get("risk_assessment")
            if risk_assessment_data:
                risk_assessment_data["timestamp"] = datetime.now(
                    timezone.utc
                ).isoformat()
            else:
                logger.warning(
                    f"LLM did not return 'risk_assessment' key for user {user_id}. Response: {response_str}"
                )
                risk_assessment_data = {
                    "risk_level": 0.0,
                    "risk_factors": ["LLM assessment failed or malformed"],
                    "confidence": 0.0,
                    "summary": "Could not obtain LLM risk assessment.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            if was_trimmed:
                return {
                    "risk_assessment": risk_assessment_data,
                    "splunk_data": sanitized_data,
                    "warning": "The LLM prompt was trimmed to fit the token limit. The result may not be fully accurate.",
                }
            return {
                "risk_assessment": risk_assessment_data,
                "splunk_data": sanitized_data,
            }
        except json.JSONDecodeError as json_err:
            logger.error(
                f"Failed to parse LLM JSON response for log risk: {json_err}. Response: {response_str}"
            )
            return {
                "risk_assessment": {
                    "risk_level": 0.0,
                    "risk_factors": ["LLM response not valid JSON"],
                    "confidence": 0.0,
                    "summary": "LLM response was not valid JSON.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                "splunk_data": sanitized_data,
            }
    except Exception as e:
        logger.error(
            f"Error in log risk assessment for user {user_id}: {e}", exc_info=True
        )
        return {
            "risk_assessment": {
                "risk_level": 0.0,
                "risk_factors": [f"LLM invocation/validation error: {str(e)}"],
                "confidence": 0.0,
                "summary": f"Error during LLM log risk assessment: {str(e)}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "splunk_data": [],
        }


# Location source endpoints removed - no real implementation available
# These endpoints relied on mock LocationDataClient which has been removed per SYSTEM MANDATE


# --- Consolidated Location Risk Analysis Endpoint ---
@router.get(
    "/location/risk-analysis/{user_id}", response_model=LocationRiskAnalysisResponse
)
async def get_location_risk_analysis(
    user_id: str,
    request: Request,  # Needed for analyze_device and ainvoke_agent
    investigation_id: str,
    time_range: str = "30d",  # Changed default from "1y" to "2m"
    splunk_host: Optional[str] = None,  # For analyze_device
) -> LocationRiskAnalysisResponse:
    try:
        logger.info(f"Starting location risk analysis for user {user_id}")

        # Location data client removed - no real implementation available
        # Setting location data to None until proper implementation is added
        oii_location_info = None
        business_location_info = None
        phone_location_info = None

        # Get device analysis results
        device_task_obj: Optional[AnalyzeDeviceResponse] = await analyze_device(
            user_id,
            request,
            investigation_id,
            time_range,
            splunk_host,
            raw_splunk_override=None,
        )
        device_data_raw = device_task_obj

        # Helper to process results or log errors
        def process_result(result, source_name):
            if isinstance(result, Exception):
                logger.error(
                    f"Error fetching {source_name} data for user {user_id}: {result}",
                    exc_info=result,
                )
                return None
            return result

        # device_analysis_results will be AnalyzeDeviceResponse or None if an exception occurred
        # process_result will pass through device_data_raw (which is AnalyzeDeviceResponse or Exception)
        # or return None if it was an exception.
        processed_device_data: Optional[AnalyzeDeviceResponse] = process_result(
            device_data_raw, "Device Analysis"
        )

        # For LocationRiskAnalysisResponse model, convert AnalyzeDeviceResponse to dict
        device_analysis_results_dict: Optional[Dict[str, Any]] = None
        if isinstance(processed_device_data, AnalyzeDeviceResponse):
            device_analysis_results_dict = processed_device_data.model_dump(
                exclude_none=True
            )
        elif (
            processed_device_data is None
        ):  # If process_result returned None due to an exception
            device_analysis_results_dict = (
                None  # Or some error dict: {"error": "Failed to get device data"}
            )

        # Prepare data for LLM prompt
        # Convert LocationInfo objects to dicts for the prompt if they are not None
        prompt_data_sources = {}
        if oii_location_info:
            prompt_data_sources["oii_location"] = (
                asdict(oii_location_info)
                if hasattr(oii_location_info, "__dataclass_fields__")
                else (
                    oii_location_info.model_dump()
                    if hasattr(oii_location_info, "model_dump")
                    else oii_location_info
                )
            )
        # Salesforce and Ekata location data removed

        # Business and Phone location are now Optional[LocationInfo]
        if business_location_info:
            prompt_data_sources["business_location"] = (
                asdict(business_location_info)
                if hasattr(business_location_info, "__dataclass_fields__")
                else (
                    business_location_info.model_dump()
                    if hasattr(business_location_info, "model_dump")
                    else business_location_info
                )
            )
        if phone_location_info:
            prompt_data_sources["phone_location"] = (
                asdict(phone_location_info)
                if hasattr(phone_location_info, "__dataclass_fields__")
                else (
                    phone_location_info.model_dump()
                    if hasattr(phone_location_info, "model_dump")
                    else phone_location_info
                )
            )

        # Extract relevant device data for prompt (e.g., list of IPs, cities, countries)
        device_summary_for_prompt = []
        if (
            processed_device_data  # Check if we have the AnalyzeDeviceResponse object
            and processed_device_data.raw_splunk_results  # Access its raw_splunk_results
        ):
            for device_event in processed_device_data.raw_splunk_results[
                :5
            ]:  # Limit for prompt
                # Handle country potentially being a list or string
                country_val = device_event.get("values(true_ip_geo)")
                country_str: Optional[str] = None
                if isinstance(country_val, list) and country_val:
                    country_str = str(country_val[0])
                elif isinstance(country_val, str):
                    country_str = country_val

                device_summary_for_prompt.append(
                    {
                        "country": country_str,  # Use processed country string
                        "isp": device_event.get("values(TRUE_ISP)"),
                    }
                )
        if device_summary_for_prompt:
            prompt_data_sources["device_locations_summary"] = device_summary_for_prompt

        llm_risk_assessment: Optional[LocationRiskAssessment] = None
        if prompt_data_sources:  # Only call LLM if we have some data
            data_for_llm_prompt_str = json.dumps(
                {"user_id": user_id, "location_sources": prompt_data_sources}, indent=2
            )

            system_prompt_for_location_risk = """
You are a fraud risk assessment expert specializing in location-based risk.
Based on the provided location data for a user from various sources, analyze all available information.
The data includes OII, Business, and Phone location info, plus a summary of device locations.
Your response MUST be a JSON object with the following structure:
{
  "risk_assessment": {
    "risk_level": float, // A score between 0.0 (low risk) and 1.0 (high risk)
    "risk_factors": [str], // A list of specific factors contributing to the risk. Be concise.
    "confidence": float, // Your confidence in this assessment (0.0 to 1.0)
    "summary": str, // A brief textual summary of the assessment (1-2 sentences).
    "thoughts": str // Detailed analysis and insights about the risk assessment, including potential implications and patterns observed.
  }
}
Ensure all fields are populated. The input data is as follows:
"""
            prompt_data, llm_input_prompt, was_trimmed = trim_prompt_to_token_limit(
                prompt_data,
                system_prompt_for_location_risk,
                MAX_PROMPT_TOKENS,
                LIST_FIELDS_PRIORITY,
            )
            # Use llm_input_prompt for the LLM call
            if was_trimmed:
                logger.warning(f"Prompt was trimmed for user {user_id}")

            settings = get_settings_for_env()
            app_olorin_userid, app_olorin_token, app_olorin_realmid = get_auth_token()
            agent_context_for_risk = AgentContext(
                input=llm_input_prompt,
                agent_name="Olorin.cas.hri.olorin:location-risk-analyzer",  # Dedicated agent name
                metadata=Metadata(
                    interaction_group_id=f"loc-risk-analysis-{user_id}",
                    additional_metadata={"userId": user_id},
                ),
                olorin_header=OlorinHeader(
                    olorin_tid=request.headers.get(
                        "olorin-tid", f"olorin-loc-risk-analysis-{user_id}"
                    ),
                    olorin_originating_assetalias=request.headers.get(
                        "olorin_originating_assetalias",
                        settings.olorin_originating_assetalias,
                    ),
                    olorin_experience_id=request.headers.get(
                        "olorin_experience_id", settings.olorin_experience_id
                    ),
                    auth_context=AuthContext(
                        olorin_user_id=app_olorin_userid,
                        olorin_user_token=app_olorin_token,
                        olorin_realmid=app_olorin_realmid,
                    ),
                ),
            )

            try:
                raw_llm_response_str, _ = await ainvoke_agent(
                    request, agent_context_for_risk
                )
                # The LLM is asked to return the structure for LocationRiskAssessment directly
                llm_risk_assessment = LocationRiskAssessment.model_validate_json(
                    raw_llm_response_str
                )
                if llm_risk_assessment.risk_assessment:
                    llm_risk_assessment.risk_assessment.timestamp = datetime.now(
                        timezone.utc
                    ).isoformat()

            except json.JSONDecodeError as json_err:
                logger.error(
                    f"LLM JSON parsing error for {user_id}: {json_err}. Response: {raw_llm_response_str}",
                    exc_info=True,
                )
            except Exception as llm_err:  # Includes Pydantic validation errors
                logger.error(
                    f"LLM invocation or validation error for {user_id}: {llm_err}",
                    exc_info=True,
                )

        return LocationRiskAnalysisResponse(
            user_id=user_id,
            oii_location_info=oii_location_info,
            business_location_info=business_location_info,
            phone_location_info=phone_location_info,
            device_analysis_results=device_analysis_results_dict,  # Store the dict version
            overall_location_risk_assessment=llm_risk_assessment,
        )

    except Exception as e:
        logger.error(
            f"Error in get_location_risk_analysis for user {user_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to perform location risk analysis: {str(e)}",
        )


@router.post("/splunk/job/cancel/{job_id}")
async def cancel_splunk_job(job_id: str) -> Dict[str, Any]:
    """Cancel a Splunk job by its SID using the same credentials as the SplunkTool."""
    settings = get_settings_for_env()
    splunk_host = settings.splunk_host

    # Use environment variables if available, otherwise fall back to IDPS secrets
    if settings.splunk_username and settings.splunk_password:
        username = settings.splunk_username
        password = settings.splunk_password
    else:
        # Fallback to IDPS secrets and hardcoded username
        username = "ged_temp_credentials"
        password = get_app_secret("SPLUNK_PASSWORD")
    url = f"https://{splunk_host}:443/services/search/v2/jobs/{job_id}/control"
    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.post(
                url, data={"action": "cancel"}, auth=(username, password)
            )
            if response.status_code == 200:
                return {
                    "success": True,
                    "message": "Job cancelled.",
                    "splunk_response": response.text,
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to cancel job. Status: {response.status_code}",
                    "splunk_response": response.text,
                }
    except Exception as e:
        return {"success": False, "message": f"Exception occurred: {str(e)}"}


@router.get("/admin/verification/stats")
async def verification_stats():
    settings = get_settings_for_env()
    from app.service.llm.verification.log_store import verification_log_store

    snapshot = await verification_log_store.snapshot()
    return JSONResponse(
        content={
            "enabled": bool(getattr(settings, "verification_enabled", False)),
            "mode": getattr(settings, "verification_mode", "shadow"),
            "sample_percent": float(
                getattr(settings, "verification_sample_percent", 1.0) or 0.0
            ),
            "verification_model_name": "DEPRECATED - use LLM_VERIFICATION_MODEL environment variable",
            "threshold_default": float(
                getattr(settings, "verification_threshold_default", 0.85)
            ),
            "max_retries_default": int(
                getattr(settings, "verification_max_retries_default", 1)
            ),
            "task_policies": {
                "risk_analysis": {
                    "threshold": float(
                        getattr(
                            settings,
                            "verification_task_policy_risk_analysis_threshold",
                            0.9,
                        )
                    ),
                    "max_retries": int(
                        getattr(
                            settings,
                            "verification_task_policy_risk_analysis_max_retries",
                            2,
                        )
                    ),
                }
            },
            "metrics": snapshot,
        }
    )


@router.get("/api/health")
async def api_health():
    """
    API health check endpoint that includes verification settings.
    Used by the frontend to fetch system status and configuration.
    """
    from app.service.config import get_settings_for_env

    settings = get_settings_for_env()

    # Get verification configuration
    verification_config = {
        "enabled": bool(getattr(settings, "verification_enabled", False)),
        "mode": getattr(settings, "verification_mode", "shadow"),
        "sample_percent": float(
            getattr(settings, "verification_sample_percent", 1.0) or 0.0
        ),
        "threshold_default": float(
            getattr(settings, "verification_threshold_default", 0.85)
        ),
    }

    # Get model configuration
    from app.service.llm_manager import get_llm_manager

    llm_manager = get_llm_manager()

    return JSONResponse(
        content={
            "status": "healthy",
            "service": "olorin-backend",
            "timestamp": datetime.now().isoformat(),
            "verification": verification_config,
            "models": {
                "selected": llm_manager.selected_model_id,
                "verification_model": llm_manager.verification_model_id,
            },
        }
    )


@router.post("/api/v1/verification/settings")
async def update_verification_settings(request: Request):
    """
    Update verification settings dynamically.
    Note: These changes are runtime-only and don't persist to .env file.
    """
    try:
        body = await request.json()
        settings = get_settings_for_env()

        # Update settings dynamically (runtime only)
        if "enabled" in body:
            settings.verification_enabled = bool(body["enabled"])
        if "mode" in body:
            settings.verification_mode = str(body["mode"])
        if "sample_percent" in body:
            # Convert from decimal (0.0-1.0) if needed
            val = float(body["sample_percent"])
            settings.verification_sample_percent = val if val <= 1.0 else val / 100.0
        if "threshold_default" in body:
            # Convert from decimal (0.0-1.0) if needed
            val = float(body["threshold_default"])
            settings.verification_threshold_default = val if val <= 1.0 else val / 100.0

        # Log the changes
        logger.info(
            f"Verification settings updated: enabled={settings.verification_enabled}, "
            f"mode={settings.verification_mode}, "
            f"sample_percent={settings.verification_sample_percent}, "
            f"threshold={settings.verification_threshold_default}"
        )

        return JSONResponse(
            content={
                "success": True,
                "message": "Verification settings updated successfully",
                "settings": {
                    "enabled": settings.verification_enabled,
                    "mode": settings.verification_mode,
                    "sample_percent": settings.verification_sample_percent,
                    "threshold_default": settings.verification_threshold_default,
                },
            }
        )
    except Exception as e:
        logger.error(f"Error updating verification settings: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Failed to update verification settings: {str(e)}",
            },
        )
