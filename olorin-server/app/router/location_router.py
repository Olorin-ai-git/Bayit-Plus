import json
import logging
from app.service.logging import get_bridge_logger
import re
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import unquote_plus

from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.requests import Request

from app.mock import demo_splunk_data
from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, OlorinHeader
from app.models.api_models import InvestigationCreate
from app.models.upi_response import Metadata
from app.persistence import (
    create_investigation,
    ensure_investigation_exists,
    get_investigation,
    update_investigation_llm_thoughts,
)
from app.service.agent.ato_agents.location_data_agent.client import LocationDataClient
from app.service.agent.tools.vector_search_tool.vector_search_tool import (
    VectorSearchTool,
)
from app.service.agent_service import ainvoke_agent
from app.service.config import get_settings_for_env
from app.service.location_analysis_service import LocationAnalysisService
from app.utils.auth_utils import get_auth_token
from app.utils.constants import LIST_FIELDS_PRIORITY, MAX_PROMPT_TOKENS
from app.utils.prompt_utils import sanitize_splunk_data, trim_prompt_to_token_limit
from app.utils.prompts import SYSTEM_PROMPT_FOR_LOCATION_RISK

logger = get_bridge_logger(__name__)
router = APIRouter(prefix="/location")


# Helper to convert LocationInfo or similar objects to dict
def to_dict(obj):
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    elif hasattr(obj, "__dict__"):
        return dict(obj.__dict__)
    else:
        return obj


@router.get("/{entity_id}")
async def analyze_location(
    entity_id: str,
    request: Request,
    investigation_id: str,
    time_range: str = "30d",
    splunk_host: str = None,
    raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
    entity_type: str = Query(..., pattern="^(user_id|device_id)$"),
) -> dict:
    """
    Location risk analysis endpoint. All business logic is now delegated to LocationAnalysisService.
    """
    # Initialize required dependencies
    location_data_client = LocationDataClient()
    vector_search_tool = VectorSearchTool()

    service = LocationAnalysisService(location_data_client, vector_search_tool)
    return await service.analyze_location(
        entity_id=entity_id,
        entity_type=entity_type,
        request=request,
        investigation_id=investigation_id,
        time_range=time_range,
        splunk_host=splunk_host,
        raw_splunk_override=raw_splunk_override,
    )
