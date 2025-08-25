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
from pydantic import BaseModel, Field
from starlette.requests import Request

from app.mock import demo_splunk_data
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
from app.models.oii_response import OIIResponse
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
from app.service.agent.ato_agents.location_data_agent.client import (
    LocationDataClient,
    LocationInfo,
)
from app.service.agent.ato_agents.splunk_agent.fraud_response import FraudResponse
from app.service.agent.ato_agents.splunk_agent.user_analysis_query_constructor import (
    get_direct_auth_query,
)
from app.service.agent.tools.oii_tool.oii_tool import OIITool
from app.service.agent_service import ainvoke_agent
from app.service.config import get_settings_for_env
from app.utils.auth_utils import get_auth_token
from app.utils.constants import LIST_FIELDS_PRIORITY, MAX_PROMPT_TOKENS
from app.utils.firebase_secrets import get_app_secret
from app.utils.prompt_utils import sanitize_splunk_data, trim_prompt_to_token_limit
from app.utils.prompts import SYSTEM_PROMPT_FOR_LOG_RISK

from .device_router import analyze_device
from .device_router import router as device_router
from .investigations_router import investigations_router

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

# Load API key from environment variable
OLORIN_API_KEY = os.getenv("OLORIN_API_KEY", "")


def get_default_headers():
    """Get default headers with API key from environment."""
    if not OLORIN_API_KEY:
        logger.warning("OLORIN_API_KEY not set in environment variables")

    return {
        "Authorization": f"Olorin_APIKey olorin_apikey={OLORIN_API_KEY},olorin_apikey_version=1.0",
        "Content-Type": "application/json",
        "X-Forwarded-Port": "8090",
        "olorin_experience_id": "d3d28eaa-7ca9-4aa2-8905-69ac11fd8c58",
        "olorin_originating_assetalias": "Olorin.cas.hri.olorin",
    }


location_data_client = LocationDataClient()


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


from .comment_router import comment_router
from .demo_router import router as demo_router
from .location_router import router as location_router
from .logs_router import router as logs_router
from .mcp_http_router import router as mcp_http_router

# --- IMPORT NEW ROUTERS ---
from .network_router import router as network_router
from .risk_assessment_router import risk_assessment_router
from .settings_router import router as settings_router

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


@router.get("/oii/{user_id}")
async def get_online_identity_info(user_id: str, request: Request) -> Dict[str, Any]:
    if (
        user_id in demo_mode_users
        and user_id in demo_cache
        and "oii" in demo_cache[user_id]
    ):
        return demo_cache[user_id]["oii"]
    auth_header = request.headers.get("authorization")
    print(f"Authorization header: {auth_header}")
    """Retrieve online identity information directly from the OII Tool."""
    try:
        # Create OIITool instance
        oii_tool = OIITool()

        # Call the tool directly with the user_id
        response_str = oii_tool._run(user_id=user_id)

        # Parse the response
        try:
            oii_resp = OIIResponse.model_validate_json(response_str)
            return oii_resp.model_dump()
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Tool returned invalid format: {str(e)}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        print(f"Authorization header: {auth_header}")
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
                # Use SplunkQueryTool for consistency with other domains
                from app.service.agent.ato_agents.splunk_agent.ato_splunk_query_constructor import (
                    build_base_search,
                )
                from app.service.agent.tools.splunk_tool.splunk_tool import (
                    SplunkQueryTool,
                )

                # Build the raw SPL query
                base_query = build_base_search(
                    id_value=user_id,
                    id_type="auth_id",
                )
                # Add earliest time constraint
                splunk_query = base_query.replace(
                    f"search index={settings.splunk_index}",
                    f"search index={settings.splunk_index} earliest=-{time_range}",
                )

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


# --- Individual Location Source Endpoints ---
@router.get("/location/source/oii/{user_id}", response_model=Optional[LocationInfo])
async def get_oii_source_location(user_id: str) -> Optional[LocationInfo]:
    try:
        logger.info(f"Fetching OII location source for user {user_id}")
        return await location_data_client.get_oii_location_info(user_id)
    except Exception as e:
        logger.error(f"Error fetching OII location for {user_id}: {e}", exc_info=True)
        # Return None or a custom error model, or re-raise as HTTPException
        # For now, let client return None/LocationInfo with "unavailable"
        raise HTTPException(
            status_code=500, detail=f"Failed to get OII location data: {str(e)}"
        )


# Salesforce and Ekata location endpoints removed


@router.get(
    "/location/source/business/{user_id}", response_model=Optional[List[LocationInfo]]
)
async def get_business_source_location(user_id: str) -> Optional[List[LocationInfo]]:
    try:
        logger.info(f"Fetching Business location source for user {user_id}")
        return await location_data_client.get_business_location(user_id)
    except Exception as e:
        logger.error(
            f"Error fetching Business location for {user_id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to get Business location data: {str(e)}"
        )


@router.get(
    "/location/source/phone/{user_id}", response_model=Optional[List[LocationInfo]]
)
async def get_phone_source_location(user_id: str) -> Optional[List[LocationInfo]]:
    try:
        logger.info(f"Fetching Phone location source for user {user_id}")
        return await location_data_client.get_phone_location(user_id)
    except Exception as e:
        logger.error(f"Error fetching Phone location for {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to get Phone location data: {str(e)}"
        )


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

        # Gather all location data concurrently
        oii_task = location_data_client.get_oii_location_info(user_id)
        business_task = location_data_client.get_business_location_info(user_id)
        phone_task = location_data_client.get_phone_location_info(user_id)
        device_task_obj: Optional[AnalyzeDeviceResponse] = await analyze_device(
            user_id,
            request,
            investigation_id,
            time_range,
            splunk_host,
            raw_splunk_override=None,
        )

        (
            oii_loc,
            business_loc,
            phone_loc,
        ) = await asyncio.gather(
            oii_task,
            business_task,
            phone_task,
            return_exceptions=True,  # Allow individual tasks to fail without stopping others
        )

        # device_data_raw will be an AnalyzeDeviceResponse object or an Exception
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

        oii_location_info = process_result(oii_loc, "OII")
        business_location_info = process_result(business_loc, "Business")
        phone_location_info = process_result(phone_loc, "Phone")

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
                        "city": device_event.get("values(TRUE_IP_CITY)"),
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
        password = get_app_secret("olorin/splunk_password")
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
