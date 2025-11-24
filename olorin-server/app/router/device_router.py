import json
import logging
from app.service.logging import get_bridge_logger
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import unquote_plus

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from starlette.requests import Request

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, OlorinHeader
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
from app.security.auth import User, require_read
from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
from app.service.agent_service import ainvoke_agent
from app.service.config import get_settings_for_env
from app.service.llm_device_risk_service import LLMDeviceRiskService
from app.utils.auth_utils import get_auth_token
from app.utils.constants import LIST_FIELDS_PRIORITY, MAX_PROMPT_TOKENS
from app.utils.firebase_secrets import get_app_secret
from app.utils.prompt_utils import sanitize_splunk_data, trim_prompt_to_token_limit
from app.utils.prompts import SYSTEM_PROMPT_FOR_DEVICE_RISK
from app.service.config_loader import get_config_loader

logger = get_bridge_logger(__name__)
router = APIRouter(prefix="/device")


async def get_identity_authorization_header(
    profile_id: str, olorin_tid: str = "demo-6790ae9b-553a-4312-9f5e-55964d21c380"
):
    # Load app secret from Firebase Secret Manager
    config_loader = get_config_loader()
    olorin_app_secret = config_loader.load_secret("OLORIN_APP_SECRET") or ""
    
    url = "https://identityinternal-e2e.api.olorin.com/v1/graphql"
    headers = {
        "olorin_tid": olorin_tid,
        "olorin_assetalias": "Olorin.shared.fraudlistclient",
        "Authorization": f"Olorin_IAM_Authentication olorin_appid=Olorin.shared.fraudlistclient, olorin_app_secret={olorin_app_secret}",
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
    time_range: str = "30d",
    splunk_host: str = None,
    raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
    entity_type: str = Query(..., pattern="^(user_id|device_id)$"),
    profile_id: str = "9341450868951246",
    service: LLMDeviceRiskService = Depends(LLMDeviceRiskService),
    current_user: User = Depends(require_read),
) -> dict:
    # Only keep HTTP-specific logic here
    ensure_investigation_exists(investigation_id, entity_id, entity_type)
    return await service.analyze_device(
        entity_id=entity_id,
        entity_type=entity_type,
        investigation_id=investigation_id,
        time_range=time_range,
        raw_splunk_override=raw_splunk_override,
        request=request,
    )
