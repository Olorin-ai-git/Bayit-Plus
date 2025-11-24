"""
Log Stream Router
Feature: 021-live-merged-logstream

FastAPI router providing SSE streaming and polling endpoints for merged logs.
Integrates aggregator and deduplicator services for real-time log delivery.

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/api-contracts.md
"""

from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException, Header, Depends
from fastapi.responses import StreamingResponse

from app.service.logging import get_bridge_logger
from app.api.sse_generator import generate_sse_stream
from app.service.log_providers.aggregator import LogAggregatorService
from app.service.log_providers.deduplicator import LogDeduplicatorService
from app.service.log_providers.frontend_provider import FrontendLogProvider
from app.service.log_providers.backend_provider import BackendLogProvider
from app.service.log_providers.frontend_log_buffer import FrontendLogBuffer
from app.service.log_providers.backend_log_collector import BackendLogCollector
from app.service.log_providers.base import LogProvider
from app.config.logstream_config import LogStreamConfig

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/api/v1/investigations", tags=["log-stream"])


# Dependency injection for LogStreamConfig
def get_logstream_config() -> LogStreamConfig:
    """Get log stream configuration (dependency injection)."""
    return LogStreamConfig()


# Shared service instances
_frontend_buffer = FrontendLogBuffer()
_backend_collector = BackendLogCollector()


def _create_log_providers(
    investigation_id: str, config: LogStreamConfig
) -> List[LogProvider]:
    """
    Create log providers for investigation.

    Args:
        investigation_id: Investigation ID
        config: Log stream configuration

    Returns:
        List of configured LogProvider instances
    """
    frontend = FrontendLogProvider(
        investigation_id=investigation_id,
        buffer=_frontend_buffer,
        timeout_ms=config.provider.provider_timeout_ms
    )

    backend = BackendLogProvider(
        investigation_id=investigation_id,
        collector=_backend_collector,
        timeout_ms=config.provider.provider_timeout_ms
    )

    return [frontend, backend]


@router.get("/{investigation_id}/logs/stream")
async def stream_logs(
    investigation_id: str,
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    last_event_id: Optional[str] = Header(None, alias="Last-Event-ID"),
    config: LogStreamConfig = Depends(get_logstream_config)
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
        raise HTTPException(
            status_code=503,
            detail="Log streaming is not enabled"
        )

    logger.info(
        f"SSE stream request for investigation {investigation_id}",
        extra={
            "investigation_id": investigation_id,
            "start_time": start_time,
            "end_time": end_time,
            "last_event_id": last_event_id
        }
    )

    # Create providers and services
    providers = _create_log_providers(investigation_id, config)
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
            config
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


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
    providers = _create_log_providers(investigation_id, config)
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


@router.post("/client-logs")
async def ingest_client_logs(
    request: "ClientLogBatchRequest",
    config: LogStreamConfig = Depends(get_logstream_config)
) -> dict:
    """
    Ingest frontend client logs for merged streaming.

    Accepts batches of logs from frontend and adds to buffer for merging.

    Args:
        request: Batch of client log entries
        config: Log stream configuration (injected)

    Returns:
        Success response with count of ingested logs

    Raises:
        HTTPException: If feature disabled or ingestion fails
    """
    if not config.enable_log_stream:
        raise HTTPException(
            status_code=503,
            detail="Log streaming is not enabled"
        )

    from app.models.client_log_request import ClientLogBatchRequest
    from app.models.unified_log import UnifiedLog
    from datetime import datetime
    import hashlib

    try:
        ingested_count = 0

        for log_entry in request.logs:
            # Create UnifiedLog from client log
            unified_log = UnifiedLog(
                investigation_id=log_entry.investigation_id,
                ts=log_entry.timestamp or datetime.utcnow(),
                seq=0,  # Will be assigned by buffer
                source="frontend",
                level=log_entry.level.upper(),
                message=log_entry.message,
                metadata=log_entry.metadata or {},
                event_hash=hashlib.sha1(
                    f"{log_entry.investigation_id}{log_entry.message}{log_entry.timestamp}".encode()
                ).hexdigest()
            )

            # Add to frontend buffer
            await _frontend_buffer.add_log(unified_log)
            ingested_count += 1

        logger.info(
            f"Ingested {ingested_count} client logs",
            extra={"count": ingested_count}
        )

        return {
            "success": True,
            "ingested": ingested_count
        }

    except Exception as e:
        logger.error(
            f"Client log ingestion error: {e}",
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=str(e))
