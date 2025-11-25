"""
SSE Generator for Log Streaming
Feature: 021-live-merged-logstream

Server-Sent Events generator for real-time log streaming with heartbeat support.
Handles SSE formatting, deduplication, Last-Event-ID resume, and error handling.

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/api-contracts.md
"""

import asyncio
import json
from datetime import datetime
from typing import Any, AsyncIterator, Dict, Optional

from app.config.logstream_config import LogStreamConfig
from app.service.log_providers.aggregator import LogAggregatorService
from app.service.log_providers.deduplicator import LogDeduplicatorService
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# SSE event types
EVENT_TYPE_LOG = "log"
EVENT_TYPE_HEARTBEAT = "heartbeat"
EVENT_TYPE_ERROR = "error"


def format_sse_event(
    event_type: str, data: Dict[str, Any], event_id: Optional[str] = None
) -> str:
    """
    Format data as SSE event.

    Args:
        event_type: Event type (log, heartbeat, error)
        data: Event data dictionary
        event_id: Optional event ID for resume support

    Returns:
        SSE-formatted event string
    """
    lines = []
    if event_id:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event_type}")
    lines.append(f"data: {json.dumps(data)}")
    lines.append("")
    return "\n".join(lines) + "\n"


async def generate_sse_stream(
    investigation_id: str,
    aggregator: LogAggregatorService,
    deduplicator: LogDeduplicatorService,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    last_event_id: Optional[str] = None,
    config: Optional[LogStreamConfig] = None,
) -> AsyncIterator[str]:
    """
    Generate SSE stream for investigation logs with heartbeat support.

    Emits log events, heartbeat events (configurable interval), and error events.
    Supports Last-Event-ID resume for automatic reconnection.

    Args:
        investigation_id: Investigation ID to stream logs for
        aggregator: Log aggregator service
        deduplicator: Deduplicator service
        start_time: Optional start timestamp filter
        end_time: Optional end timestamp filter
        last_event_id: Last event ID received (for reconnection)
        config: Log stream configuration (optional, loads default if not provided)

    Yields:
        SSE-formatted event strings

    SSE Event Format:
        id: <event_id>
        event: <event_type>
        data: <json_payload>
        <blank line>
    """
    # Load configuration
    if config is None:
        config = LogStreamConfig()

    heartbeat_interval = config.sse.heartbeat_interval_seconds
    event_counter = 0

    try:
        logger.info(
            f"Starting SSE stream for investigation {investigation_id}",
            extra={
                "investigation_id": investigation_id,
                "last_event_id": last_event_id,
                "heartbeat_interval": heartbeat_interval,
            },
        )

        # Resume from last event if provided
        resume_from = int(last_event_id) if last_event_id else 0
        if resume_from > 0:
            logger.info(
                f"Resuming SSE stream from event {resume_from}",
                extra={"investigation_id": investigation_id},
            )

        # Get log stream from aggregator
        log_stream = aggregator.stream_logs(start_time, end_time)
        deduplicated = deduplicator.deduplicate_stream(log_stream)

        last_heartbeat = asyncio.get_event_loop().time()

        # Stream logs with periodic heartbeats
        async for log in deduplicated:
            # Filter by investigation ID
            if log.investigation_id != investigation_id:
                continue

            # Skip events before resume point
            event_counter += 1
            if event_counter <= resume_from:
                continue

            # Emit log event
            yield format_sse_event(
                EVENT_TYPE_LOG, log.model_dump(), event_id=str(event_counter)
            )

            # Check if heartbeat is needed
            current_time = asyncio.get_event_loop().time()
            if current_time - last_heartbeat >= heartbeat_interval:
                yield format_sse_event(
                    EVENT_TYPE_HEARTBEAT,
                    {
                        "timestamp": datetime.utcnow().isoformat(),
                        "investigation_id": investigation_id,
                    },
                )
                last_heartbeat = current_time

            # Brief sleep to prevent busy loop
            await asyncio.sleep(0.1)

    except asyncio.CancelledError:
        logger.info(
            f"SSE stream cancelled for investigation {investigation_id}",
            extra={"investigation_id": investigation_id},
        )
        raise

    except Exception as e:
        logger.error(
            f"SSE stream error for investigation {investigation_id}: {e}",
            exc_info=True,
            extra={"investigation_id": investigation_id},
        )
        yield format_sse_event(
            EVENT_TYPE_ERROR, {"error": str(e), "investigation_id": investigation_id}
        )
        raise

    finally:
        logger.info(
            f"SSE stream ended for investigation {investigation_id}",
            extra={"investigation_id": investigation_id, "events_sent": event_counter},
        )
