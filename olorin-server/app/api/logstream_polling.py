"""
Log Stream Polling Endpoint
Feature: 021-live-merged-logstream

Polling endpoint for log fetching (fallback when SSE unavailable).
Returns paginated logs with cursor for next request.

Author: Gil Klainert
Date: 2025-11-13
Spec: /specs/021-live-merged-logstream/api-contracts.md
"""

from typing import Optional
from datetime import datetime
from fastapi import Query, HTTPException, Depends, APIRouter

from app.service.logging import get_bridge_logger
from app.service.log_providers.aggregator import LogAggregatorService
from app.config.logstream_config import LogStreamConfig
from app.api.logstream_dependencies import (
    get_logstream_config,
    create_log_providers
)

logger = get_bridge_logger(__name__)

router = APIRouter()


@router.get("/{investigation_id}/logs")
async def poll_logs(
    investigation_id: str,
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    cursor: Optional[str] = Query(None),
    config: LogStreamConfig = Depends(get_logstream_config)
) -> dict:
    """
    Polling endpoint for log fetching (fallback when SSE unavailable).

    Returns paginated logs with cursor for next request.

    Args:
        investigation_id: Investigation ID to fetch logs for
        start_time: Optional start timestamp
        end_time: Optional end timestamp
        limit: Maximum number of logs to return (1-1000)
        cursor: Pagination cursor from previous response
        config: Log stream configuration (injected)

    Returns:
        Dictionary with logs array, cursor, and has_more flag

    Raises:
        HTTPException: If feature is disabled or configuration invalid
    """
    if not config.enable_log_stream:
        raise HTTPException(
            status_code=503,
            detail="Log streaming is not enabled"
        )

    logger.info(
        f"Polling request for investigation {investigation_id}",
        extra={
            "investigation_id": investigation_id,
            "limit": limit,
            "cursor": cursor
        }
    )

    # Create providers and aggregator service
    providers = create_log_providers(investigation_id, config)
    aggregator = LogAggregatorService(providers, config.aggregator)

    try:
        logs = await aggregator.fetch_logs(start_time, end_time, limit + 1)

        filtered_logs = [
            log for log in logs
            if log.investigation_id == investigation_id
        ]

        has_more = len(filtered_logs) > limit
        result_logs = filtered_logs[:limit]

        next_cursor = None
        if has_more and result_logs:
            last_log = result_logs[-1]
            next_cursor = f"{last_log.ts.isoformat()}:{last_log.seq}"

        return {
            "logs": [log.model_dump() for log in result_logs],
            "cursor": next_cursor,
            "has_more": has_more,
            "investigation_id": investigation_id
        }

    except Exception as e:
        logger.error(
            f"Polling error for investigation {investigation_id}: {e}",
            exc_info=True,
            extra={"investigation_id": investigation_id}
        )
        raise HTTPException(status_code=500, detail=str(e))
