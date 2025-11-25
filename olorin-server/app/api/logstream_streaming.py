"""
Log Stream Streaming Endpoint
Feature: 021-live-merged-logstream

SSE streaming endpoint for real-time log delivery.
Supports automatic reconnection via Last-Event-ID header.

Author: Gil Klainert
Date: 2025-11-13
Spec: /specs/021-live-merged-logstream/api-contracts.md
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.api.logstream_dependencies import create_log_providers, get_logstream_config
from app.api.sse_generator import generate_sse_stream
from app.config.logstream_config import LogStreamConfig
from app.service.log_providers.aggregator import LogAggregatorService
from app.service.log_providers.deduplicator import LogDeduplicatorService
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter()


@router.get("/{investigation_id}/logs/stream")
async def stream_logs(
    investigation_id: str,
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    last_event_id: Optional[str] = Header(None, alias="Last-Event-ID"),
    config: LogStreamConfig = Depends(get_logstream_config),
):
    """
    SSE endpoint for real-time log streaming.

    Streams merged and deduplicated logs from all providers.
    Supports automatic reconnection via Last-Event-ID header.

    Args:
        investigation_id: Investigation ID to stream logs for
        start_time: Optional start timestamp for log filtering
        end_time: Optional end timestamp for log filtering
        last_event_id: Last event ID received (for reconnection)
        config: Log stream configuration (injected)

    Returns:
        StreamingResponse with text/event-stream content type

    Raises:
        HTTPException: If feature is disabled or configuration invalid
    """
    if not config.enable_log_stream:
        raise HTTPException(status_code=503, detail="Log streaming is not enabled")

    logger.info(
        f"SSE stream request for investigation {investigation_id}",
        extra={
            "investigation_id": investigation_id,
            "start_time": start_time,
            "end_time": end_time,
            "last_event_id": last_event_id,
        },
    )

    # Create providers and services
    providers = create_log_providers(investigation_id, config)
    aggregator = LogAggregatorService(providers, config.aggregator)
    deduplicator = LogDeduplicatorService(config.aggregator)

    return StreamingResponse(
        generate_sse_stream(
            investigation_id,
            aggregator,
            deduplicator,
            start_time,
            end_time,
            last_event_id,
            config,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
