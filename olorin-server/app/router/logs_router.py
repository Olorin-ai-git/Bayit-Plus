import logging
from app.service.logging import get_bridge_logger
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.requests import Request

from app.service.llm_logs_risk_service import LLMLogsRiskService

logger = get_bridge_logger(__name__)
router = APIRouter(prefix="/logs")


@router.options("/{entity_id}")
def analyze_logs_options():
    """Handle CORS preflight requests for logs analysis endpoint."""
    return {}


@router.get("/{entity_id}")
async def analyze_logs(
    entity_id: str,
    request: Request,
    investigation_id: str,
    time_range: str = "30d",
    raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
    entity_type: str = Query("user_id", pattern="^(user_id|device_id)$"),
) -> Dict[str, Any]:
    """Analyze logs for a user or device - uses LLMLogsRiskService directly."""
    logs_service = LLMLogsRiskService()
    return await logs_service.analyze_logs(
        entity_id=entity_id,
        entity_type=entity_type,
        request=request,
        investigation_id=investigation_id,
        time_range=time_range,
        raw_splunk_override=raw_splunk_override,
    )
