import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from starlette.requests import Request

from app.service.logs_analysis_service import LogsAnalysisService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


def get_chronos_range(time_range: str):
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    if time_range.endswith("d"):
        days = int(time_range[:-1])
        start = now - timedelta(days=days)
    elif time_range.endswith("m"):
        months = int(time_range[:-1])
        start = now - timedelta(days=30 * months)
    else:
        start = now - timedelta(days=1)
    return {"from": start.isoformat(), "to": now.isoformat()}


@router.get("/logs/{user_id}")
async def analyze_logs(
    user_id: str,
    request: Request,
    investigation_id: str,
    time_range: str = "1m",
    raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Analyze logs for a user - delegates to LogsAnalysisService."""
    logs_service = LogsAnalysisService()
    return await logs_service.analyze_logs(
        user_id=user_id,
        request=request,
        investigation_id=investigation_id,
        time_range=time_range,
        raw_splunk_override=raw_splunk_override,
    )
