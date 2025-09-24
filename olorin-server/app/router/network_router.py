import logging
from app.service.logging import get_bridge_logger
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from starlette.requests import Request

from app.persistence import ensure_investigation_exists
from app.service.llm_network_risk_service import LLMNetworkRiskService

logger = get_bridge_logger(__name__)
router = APIRouter(prefix="/network")


@router.options("/{entity_id}")
def analyze_network_options():
    """Handle CORS preflight requests for network analysis endpoint."""
    return {}


@router.get("/{entity_id}")
async def analyze_network(
    entity_id: str,
    request: Request,
    investigation_id: str,
    time_range: str = "30d",
    entity_type: str = Query("user_id", pattern="^(user_id|device_id)$"),
    splunk_host: Optional[str] = None,
    raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
    service: LLMNetworkRiskService = Depends(LLMNetworkRiskService),
) -> dict:
    """Analyze network risk for a user or device - uses LLMNetworkRiskService directly."""
    # Only keep HTTP-specific logic here
    ensure_investigation_exists(investigation_id, entity_id, entity_type)
    return await service.analyze_network(
        entity_id=entity_id,
        entity_type=entity_type,
        request=request,
        investigation_id=investigation_id,
        time_range=time_range,
        splunk_host=splunk_host,
        raw_splunk_override=raw_splunk_override,
    )
