"""
Log Stream Ingestion Endpoint
Feature: 021-live-merged-logstream

Client log ingestion endpoint for frontend logs.
Accepts batches of logs from frontend and adds to buffer for merging.

Author: Gil Klainert
Date: 2025-11-13
Spec: /specs/021-live-merged-logstream/api-contracts.md
"""

from datetime import datetime
import hashlib
from fastapi import HTTPException, Depends, APIRouter

from app.service.logging import get_bridge_logger
from app.models.client_log_request import ClientLogBatchRequest
from app.models.unified_log import UnifiedLog
from app.config.logstream_config import LogStreamConfig
from app.api.logstream_dependencies import (
    get_logstream_config,
    get_frontend_buffer
)

logger = get_bridge_logger(__name__)

router = APIRouter()


@router.post("/client-logs")
async def ingest_client_logs(
    request: ClientLogBatchRequest,
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

    try:
        ingested_count = 0
        frontend_buffer = get_frontend_buffer()

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
            await frontend_buffer.add_log(unified_log)
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
