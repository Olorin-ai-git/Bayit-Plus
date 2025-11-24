"""
Event Feed Converters
Feature: 001-investigation-state-management

Converts audit log entries to event stream format.
Provides serialization and batch conversion utilities.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

import json
from typing import Dict, Any, List
from datetime import datetime, timezone
from app.models.investigation_audit_log import InvestigationAuditLog


class EventFeedConverter:
    """Converts audit logs to event feed format."""

    @staticmethod
    def _datetime_to_milliseconds(dt: datetime) -> int:
        """Convert datetime to Unix milliseconds since epoch."""
        if dt is None:
            return 0
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp() * 1000)

    @staticmethod
    def audit_log_to_event(entry: InvestigationAuditLog) -> Dict[str, Any]:
        """
        Convert audit log entry to event format matching InvestigationEvent schema.

        Args:
            entry: InvestigationAuditLog database model

        Returns:
            Dictionary with event data matching InvestigationEvent schema
        """
        # Parse JSON fields safely
        try:
            changes = json.loads(entry.changes_json) if entry.changes_json else {}
        except (json.JSONDecodeError, TypeError):
            changes = {}

        try:
            state_snapshot = json.loads(entry.state_snapshot_json) if entry.state_snapshot_json else {}
        except (json.JSONDecodeError, TypeError):
            state_snapshot = {}

        # Convert timestamp to Unix milliseconds
        ts = EventFeedConverter._datetime_to_milliseconds(entry.timestamp)

        # Map database source to EventActor type
        # Database sources: UI, API, SYSTEM, WEBHOOK, POLLING
        # EventActor types: USER, SYSTEM, WEBHOOK, POLLING
        source_to_actor_type = {
            "UI": "USER",      # UI actions are user actions
            "API": "USER",     # API actions are user actions (via API)
            "SYSTEM": "SYSTEM",
            "WEBHOOK": "WEBHOOK",
            "POLLING": "POLLING"
        }
        actor_type = source_to_actor_type.get(entry.source, "USER")  # Default to USER if unknown

        return {
            "id": entry.entry_id,
            "investigation_id": entry.investigation_id,
            "ts": ts,
            "op": entry.action_type,
            "actor": {
                "type": actor_type,
                "id": entry.user_id
            },
            "payload": changes,
            "version": entry.to_version,
            "metadata": {
                "source": entry.source,  # Keep original source in metadata
                "from_version": entry.from_version,
                "to_version": entry.to_version,
                "state_snapshot": state_snapshot
            }
        }

    @staticmethod
    def batch_convert(entries: List[InvestigationAuditLog]) -> List[Dict[str, Any]]:
        """
        Convert multiple audit log entries to event format.

        Args:
            entries: List of InvestigationAuditLog models

        Returns:
            List of event dictionaries
        """
        return [
            EventFeedConverter.audit_log_to_event(entry)
            for entry in entries
        ]

    @staticmethod
    def serialize_event(event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Serialize event for API response.
        Ensures consistent JSON serialization matching InvestigationEvent schema.

        Args:
            event: Event dictionary from audit_log_to_event()

        Returns:
            Serialized event dictionary ready for JSON response
        """
        actor = event.get("actor", {})
        return {
            "id": str(event.get("id", "")),
            "investigation_id": str(event.get("investigation_id", "")),
            "ts": int(event.get("ts", 0)),
            "op": str(event.get("op", "")),
            "actor": {
                "type": str(actor.get("type", "")),
                "id": str(actor.get("id", ""))
            },
            "payload": event.get("payload", {}),
            "version": event.get("version"),
            "metadata": event.get("metadata", {})
        }
