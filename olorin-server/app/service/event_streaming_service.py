"""
Event Streaming Service (SSE)
Feature: Phase 7 (T055-T057) - SSE Real-Time with Fallback

Provides Server-Sent Events (SSE) streaming for real-time investigation updates.
Polling endpoint remains available as fallback for clients that don't support SSE.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import Any, AsyncGenerator, Dict, Optional

from sqlalchemy.orm import Session

from app.models.investigation_audit_log import InvestigationAuditLog
from app.models.investigation_state import InvestigationState
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class EventStreamingService:
    """Service for streaming investigation events via SSE."""

    # Configuration from environment
    STREAM_HEARTBEAT_INTERVAL = int(os.getenv("SSE_HEARTBEAT_INTERVAL_SECONDS", "30"))
    STREAM_MAX_DURATION = int(os.getenv("SSE_MAX_DURATION_SECONDS", "300"))  # 5 minutes
    STREAM_BATCH_SIZE = int(os.getenv("SSE_BATCH_SIZE", "10"))
    STREAM_POLL_INTERVAL = float(os.getenv("SSE_POLL_INTERVAL_SECONDS", "0.5"))

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    async def stream_investigation_events(
        self,
        investigation_id: str,
        user_id: str,
        run_id: Optional[str] = None,
        last_event_id: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream investigation events as Server-Sent Events.

        T055: Streams tool_complete, tool_error, and phase_change events in real-time.
        Verifies user has read access before streaming.

        Args:
            investigation_id: Investigation to stream events for
            user_id: User ID for authorization check
            run_id: Optional run ID to filter events
            last_event_id: Last event ID received by client (for reconnection)

        Yields:
            SSE formatted event strings

        Raises:
            403: User not authorized
            404: Investigation not found
        """
        # Verify authorization
        state = self._verify_access(investigation_id, user_id)

        # Track streaming session
        start_time = datetime.utcnow()
        last_heartbeat = datetime.utcnow()
        last_event_timestamp = self._parse_last_event_timestamp(last_event_id)

        logger.info(
            f"Starting SSE stream for investigation {investigation_id}, "
            f"user {user_id}, run {run_id}"
        )

        try:
            while True:
                # Check if we've exceeded max streaming duration
                if (
                    datetime.utcnow() - start_time
                ).total_seconds() > self.STREAM_MAX_DURATION:
                    # Send reconnect instruction
                    yield self._format_sse_message(
                        event_type="reconnect",
                        data={
                            "message": "Stream duration limit reached, please reconnect"
                        },
                    )
                    break

                # T056: Query recent events from audit_log
                events = await self._fetch_recent_events(
                    investigation_id, run_id, last_event_timestamp
                )

                if events:
                    # Stream events to client
                    for event in events:
                        yield self._format_sse_event(event)
                        last_event_timestamp = event.timestamp

                    last_heartbeat = datetime.utcnow()

                # Send heartbeat if no events for a while
                elif (
                    datetime.utcnow() - last_heartbeat
                ).total_seconds() > self.STREAM_HEARTBEAT_INTERVAL:
                    yield self._format_sse_message(
                        event_type="heartbeat",
                        data={"timestamp": datetime.utcnow().isoformat()},
                    )
                    last_heartbeat = datetime.utcnow()

                # Small delay before next poll
                await asyncio.sleep(self.STREAM_POLL_INTERVAL)

        except asyncio.CancelledError:
            logger.info(f"SSE stream cancelled for investigation {investigation_id}")
            raise
        except Exception as e:
            logger.error(f"Error in SSE stream for {investigation_id}: {e}")
            yield self._format_sse_message(event_type="error", data={"error": str(e)})

    async def _fetch_recent_events(
        self,
        investigation_id: str,
        run_id: Optional[str],
        since_timestamp: Optional[datetime],
    ) -> list[InvestigationAuditLog]:
        """
        Fetch recent events from audit log.

        T056: Queries audit_log for events to stream.

        Args:
            investigation_id: Investigation ID
            run_id: Optional run ID filter
            since_timestamp: Only get events after this timestamp

        Returns:
            List of recent audit log entries
        """
        query = self.db.query(InvestigationAuditLog).filter(
            InvestigationAuditLog.investigation_id == investigation_id
        )

        if since_timestamp:
            query = query.filter(InvestigationAuditLog.timestamp > since_timestamp)

        # T055: Filter for specific event types we want to stream
        query = query.filter(
            InvestigationAuditLog.action_type.in_(
                [
                    "STATE_CHANGE",  # Phase changes
                    "UPDATED",  # Tool completions/errors
                    "SETTINGS_CHANGE",  # Configuration updates
                ]
            )
        )

        # Order by timestamp and limit batch size
        query = query.order_by(InvestigationAuditLog.timestamp.asc()).limit(
            self.STREAM_BATCH_SIZE
        )

        return query.all()

    def _format_sse_event(self, audit_entry: InvestigationAuditLog) -> str:
        """
        Format audit log entry as SSE event.

        T055: Formats events for SSE protocol with proper event types.

        Args:
            audit_entry: Audit log entry to format

        Returns:
            SSE formatted string
        """
        # Determine event type based on audit entry
        event_type = self._determine_event_type(audit_entry)

        # Parse changes for event data
        changes = {}
        if audit_entry.changes_json:
            try:
                changes = json.loads(audit_entry.changes_json)
            except json.JSONDecodeError:
                pass

        event_data = {
            "id": audit_entry.entry_id,
            "investigation_id": audit_entry.investigation_id,
            "timestamp": audit_entry.timestamp.isoformat(),
            "type": event_type,
            "user_id": audit_entry.user_id,
            "source": audit_entry.source,
            "changes": changes,
            "from_version": audit_entry.from_version,
            "to_version": audit_entry.to_version,
        }

        return self._format_sse_message(
            event_type=event_type, data=event_data, event_id=audit_entry.entry_id
        )

    def _determine_event_type(self, audit_entry: InvestigationAuditLog) -> str:
        """
        Determine SSE event type from audit entry.

        T055: Maps audit actions to SSE event types.
        """
        # Parse changes to determine specific event type
        if audit_entry.changes_json:
            try:
                changes = json.loads(audit_entry.changes_json)

                # Check for phase change
                if "lifecycle_stage" in changes or "current_phase" in changes:
                    return "phase_change"

                # Check for tool completion/error
                if "status" in changes:
                    status_change = changes.get("status", {})
                    new_status = status_change.get("new", "")
                    if "ERROR" in new_status:
                        return "tool_error"
                    elif "COMPLETED" in new_status:
                        return "tool_complete"

            except json.JSONDecodeError:
                pass

        # Default mapping
        action_to_event = {
            "STATE_CHANGE": "phase_change",
            "UPDATED": "state_update",
            "SETTINGS_CHANGE": "settings_update",
            "CREATED": "investigation_created",
            "DELETED": "investigation_deleted",
        }

        return action_to_event.get(audit_entry.action_type, "update")

    def _format_sse_message(
        self, event_type: str, data: Dict[str, Any], event_id: Optional[str] = None
    ) -> str:
        """
        Format data as SSE message.

        Args:
            event_type: Type of event
            data: Event data
            event_id: Optional event ID for reconnection

        Returns:
            SSE formatted message string
        """
        lines = []

        if event_id:
            lines.append(f"id: {event_id}")

        lines.append(f"event: {event_type}")
        lines.append(f"data: {json.dumps(data)}")
        lines.append("")  # Empty line to end message

        return "\n".join(lines) + "\n"

    def _verify_access(self, investigation_id: str, user_id: str) -> InvestigationState:
        """
        Verify user has access to investigation.

        T055: Verifies user has read access before streaming.

        Args:
            investigation_id: Investigation to check
            user_id: User to verify

        Returns:
            Investigation state if authorized

        Raises:
            403: Not authorized
            404: Not found
        """
        from fastapi import HTTPException, status

        state = (
            self.db.query(InvestigationState)
            .filter(InvestigationState.investigation_id == investigation_id)
            .first()
        )

        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Investigation {investigation_id} not found",
            )

        # Check if user owns the investigation
        if state.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this investigation",
            )

        return state

    def _parse_last_event_timestamp(
        self, last_event_id: Optional[str]
    ) -> Optional[datetime]:
        """
        Parse timestamp from last event ID for reconnection.

        Args:
            last_event_id: Last event ID from client

        Returns:
            Timestamp if parseable, None otherwise
        """
        if not last_event_id:
            return None

        # Try to get timestamp from audit log entry
        entry = (
            self.db.query(InvestigationAuditLog)
            .filter(InvestigationAuditLog.entry_id == last_event_id)
            .first()
        )

        if entry:
            return entry.timestamp

        return None
