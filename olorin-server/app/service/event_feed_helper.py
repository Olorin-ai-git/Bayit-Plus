"""
Event Feed Helper
Feature: 001-investigation-state-management

Helper functions for event feed service.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

import json
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from fastapi import HTTPException, status

from app.models.investigation_audit_log import InvestigationAuditLog
from app.service.event_feed_models import EventActor, InvestigationEvent


class EventFeedHelper:
    """Helper class for event feed operations."""

    def parse_cursor(self, cursor: str, expiry_days: int) -> Tuple[datetime, int]:
        """
        Parse cursor string into timestamp and sequence.

        Args:
            cursor: Cursor string to parse
            expiry_days: Number of days before cursor expires

        Returns:
            Tuple of (timestamp, sequence)

        Raises:
            HTTPException: If cursor is invalid or expired
        """
        try:
            parts = cursor.split("_")
            if len(parts) != 2:
                raise ValueError("Invalid cursor format")

            timestamp_ms = int(parts[0])
            sequence = int(parts[1])

            # Convert milliseconds to datetime
            timestamp = datetime.fromtimestamp(timestamp_ms / 1000.0)

            # Check if cursor is expired
            if datetime.utcnow() - timestamp > timedelta(days=expiry_days):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cursor expired (older than {expiry_days} days)",
                )

            return timestamp, sequence

        except (ValueError, IndexError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid cursor format: {cursor}",
            )

    def create_cursor(self, entry: InvestigationAuditLog) -> str:
        """
        Create cursor string from audit log entry.

        Args:
            entry: Audit log entry to create cursor from

        Returns:
            Cursor string in format: timestamp_sequence
        """
        # Convert timestamp to milliseconds
        timestamp_ms = int(entry.timestamp.timestamp() * 1000)

        # Extract sequence from entry_id or use 0
        try:
            sequence = (
                int(entry.entry_id.split("_")[-1]) if "_" in entry.entry_id else 0
            )
        except:
            sequence = 0

        return f"{timestamp_ms}_{sequence:06d}"

    def audit_log_to_event(self, entry: InvestigationAuditLog) -> InvestigationEvent:
        """
        Convert audit log entry to event format.

        Args:
            entry: Audit log entry to convert

        Returns:
            InvestigationEvent object
        """
        # Convert timestamp to milliseconds
        timestamp_ms = int(entry.timestamp.timestamp() * 1000)

        # Parse changes JSON if present
        payload = {}
        if entry.changes_json:
            try:
                payload = json.loads(entry.changes_json)
            except json.JSONDecodeError:
                payload = {"raw": entry.changes_json}

        # Map source to actor type
        actor_type_map = {
            "UI": "USER",
            "API": "USER",
            "SYSTEM": "SYSTEM",
            "WEBHOOK": "WEBHOOK",
            "POLLING": "SYSTEM",
        }

        return InvestigationEvent(
            id=self.create_cursor(entry),
            ts=timestamp_ms,
            op=entry.action_type,
            investigation_id=entry.investigation_id,
            actor=EventActor(
                type=actor_type_map.get(entry.source, "SYSTEM"), id=entry.user_id
            ),
            payload=payload,
            version=entry.to_version,
        )

    def generate_etag(self, events: List[InvestigationEvent]) -> str:
        """
        Generate ETag based on events.

        Args:
            events: List of events to generate ETag from

        Returns:
            ETag string in format: W/"hash"
        """
        import hashlib

        if not events:
            return 'W/"empty"'

        # Use last event ID and count for ETag
        last_event = events[-1]
        etag_str = f"{last_event.id}-{len(events)}"
        etag_hash = hashlib.md5(etag_str.encode()).hexdigest()[:8]

        return f'W/"{etag_hash}"'
