import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import unquote_plus

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from starlette.requests import Request
from fastapi.responses import JSONResponse
import aiohttp

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, IntuitHeader
from app.models.api_models import InvestigationCreate
from app.models.device_risk import (
    AnalyzeDeviceResponse,
    DeviceSignalDetail,
    DeviceSignalRiskLLMAssessment,
)
from app.persistence import (
    create_investigation,
    ensure_investigation_exists,
    get_investigation,
    update_investigation_llm_thoughts,
)
from app.service.agent.tools.chronos_tool.chronos_tool import ChronosTool
from app.service.agent.tools.di_tool.di_tool import DITool
from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
from app.service.agent_service import ainvoke_agent
from app.service.config import get_settings_for_env
from app.service.device_analysis_service import DeviceAnalysisService
from app.utils.auth_utils import get_auth_token
from app.utils.constants import LIST_FIELDS_PRIORITY, MAX_PROMPT_TOKENS
from app.utils.prompt_utils import sanitize_splunk_data, trim_prompt_to_token_limit
from app.utils.prompts import SYSTEM_PROMPT_FOR_DEVICE_RISK
from app.service.error_handling import AuthorizationError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/device")


async def get_identity_authorization_header(
    profile_id: str, intuit_tid: str = "demo-6790ae9b-553a-4312-9f5e-55964d21c380"
):
    url = "https://identityinternal-e2e.api.intuit.com/v1/graphql"
    headers = {
        "intuit_tid": intuit_tid,
        "intuit_assetalias": "Intuit.shared.fraudlistclient",
        "Authorization": "Intuit_IAM_Authentication intuit_appid=Intuit.shared.fraudlistclient, intuit_app_secret=preprdf5KZ20app3oib0XW4TugiHhk6id1mCKmUp",
        "Content-Type": "application/json",
    }
    body = {
        "query": """mutation Identity_SignInApplicationWithPrivateAuthInput($input: Identity_SignInApplicationWithPrivateAuthInput!) { identitySignInInternalApplicationWithPrivateAuth(input: $input) { authorizationHeader } }""",
        "variables": {"input": {"profileId": profile_id}},
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
            try:
                return data["data"]["identitySignInInternalApplicationWithPrivateAuth"][
                    "authorizationHeader"
                ]
            except Exception as extract_err:
                logger.error(
                    f"Failed to extract authorizationHeader from identity response: {extract_err}"
                )
                return None
    except Exception as e:
        logger.error(f"Failed to get identity authorization header: {e}")
        return None


@router.get("/{entity_id}")
async def analyze_device(
    entity_id: str,
    request: Request,
    investigation_id: str,
    time_range: str = "1m",
    splunk_host: str = None,
    raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
    entity_type: str = Query(..., pattern="^(user_id|device_id)$"),
    profile_id: str = "9341450868951246",
    service: DeviceAnalysisService = Depends(DeviceAnalysisService),
) -> dict:
    # Only keep HTTP-specific logic here
    ensure_investigation_exists(investigation_id, entity_id)
    return await service.analyze_device(
        entity_id=entity_id,
        entity_type=entity_type,
        investigation_id=investigation_id,
        time_range=time_range,
        raw_splunk_override=raw_splunk_override,
        request=request,
    )


def get_chronos_range(time_range: str):
    now = datetime.now(timezone.utc)
    if time_range.endswith("d"):
        days = int(time_range[:-1])
        start = now - timedelta(days=days)
    elif time_range.endswith("m"):
        months = int(time_range[:-1])
        start = now - timedelta(days=30 * months)
    else:
        start = now - timedelta(days=1)

    # Use the same format as ChronosTool expects
    formatter = "%Y-%m-%dT%H:%M:%S+00:00"
    return {"from": start.strftime(formatter), "to": now.strftime(formatter)}


@router.get("/device/chronos")
async def get_chronos_data(
    request: Request,
    time_range: str = "30d",
    user_id: Optional[str] = None,
    fields: Optional[List[str]] = None
) -> JSONResponse:
    """
    Call the Chronos tool for a given AuthId (user_id) and return the raw Chronos response.
    
    Example:
    curl -X POST "http://localhost:8000/device/chronos?time_range=30d" -H "Content-Type: application/json" -d '{"user_id": "AUTHID", "fields": ["sessionId", "os", "osVersion"]}'
    """
    try:
        # Get request body
        body = await request.json()
        user_id = body.get("user_id", user_id)
        fields = body.get("fields", fields or [])

        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        # Initialize ChronosTool
        chronos_tool = ChronosTool()
        
        # Prepare headers
        headers = {}
        for header in ["authorization", "intuit_tid", "accept", "content-type"]:
            if header in request.headers:
                headers[header] = request.headers[header]

        # Get data from Chronos
        response = await chronos_tool.get_data(
            user_id=user_id,
            time_range=time_range,
            fields=fields,
            headers=headers
        )

        return JSONResponse(content=response)

    except Exception as e:
        logger.error(f"Error in get_chronos_data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
