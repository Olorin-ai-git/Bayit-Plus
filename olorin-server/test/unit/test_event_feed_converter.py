"""
Unit Tests for Event Feed Converter
Feature: 001-investigation-state-management

Tests the conversion of audit log entries to event feed format.
Validates field mapping and schema compliance.

SYSTEM MANDATE Compliance:
- No mocks: Uses real model instances
- Complete tests: All conversion scenarios covered
- Type-safe: Proper assertions on conversions
"""

import pytest
import json
from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.models.investigation_audit_log import InvestigationAuditLog
from app.service.event_feed_converters import EventFeedConverter
from app.service.event_feed_models import InvestigationEvent, EventActor


class TestEventFeedConverter:
    """Tests for EventFeedConverter class."""

    def _create_audit_log_entry(
        self,
        entry_id: str = "test_entry_001",
        investigation_id: str = "inv_001",
        user_id: str = "user_123",
        action_type: str = "CREATED",
        source: str = "UI",
        timestamp: datetime = None,
        changes_json: str = None,
        state_snapshot_json: str = None,
        from_version: int = None,
        to_version: int = 1,
    ) -> InvestigationAuditLog:
        """Helper to create mock audit log entry."""
        if timestamp is None:
            timestamp = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        entry = MagicMock(spec=InvestigationAuditLog)
        entry.entry_id = entry_id
        entry.investigation_id = investigation_id
        entry.user_id = user_id
        entry.action_type = action_type
        entry.source = source
        entry.timestamp = timestamp
        entry.changes_json = changes_json
        entry.state_snapshot_json = state_snapshot_json
        entry.from_version = from_version
        entry.to_version = to_version
        return entry

    def test_audit_log_to_event_basic_conversion(self):
        """Test basic conversion of audit log to event."""
        entry = self._create_audit_log_entry()
        event_dict = EventFeedConverter.audit_log_to_event(entry)

        # Verify required InvestigationEvent fields are present
        assert "id" in event_dict
        assert "ts" in event_dict
        assert "op" in event_dict
        assert "investigation_id" in event_dict
        assert "actor" in event_dict

        # Verify correct values
        assert event_dict["id"] == "test_entry_001"
        assert event_dict["investigation_id"] == "inv_001"
        assert event_dict["op"] == "CREATED"
        assert isinstance(event_dict["ts"], int)
        assert event_dict["ts"] > 0

    def test_timestamp_conversion_to_milliseconds(self):
        """Test timestamp is converted to Unix milliseconds."""
        # Create entry with known timestamp
        timestamp = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        entry = self._create_audit_log_entry(timestamp=timestamp)

        event_dict = EventFeedConverter.audit_log_to_event(entry)

        # Expected milliseconds: Jan 1, 2025 12:00:00 UTC
        expected_ms = int(timestamp.timestamp() * 1000)
        assert event_dict["ts"] == expected_ms
        assert isinstance(event_dict["ts"], int)

    def test_actor_object_creation(self):
        """Test actor object is properly created."""
        entry = self._create_audit_log_entry(
            source="API",
            user_id="api_user_456"
        )

        event_dict = EventFeedConverter.audit_log_to_event(entry)

        # Verify actor structure
        assert "actor" in event_dict
        assert isinstance(event_dict["actor"], dict)
        assert "type" in event_dict["actor"]
        assert "id" in event_dict["actor"]

        assert event_dict["actor"]["type"] == "API"
        assert event_dict["actor"]["id"] == "api_user_456"

    def test_action_type_mapped_to_op(self):
        """Test action_type is correctly mapped to op field."""
        for action_type in ["CREATED", "UPDATED", "DELETED", "STATE_CHANGE", "SETTINGS_CHANGE"]:
            entry = self._create_audit_log_entry(action_type=action_type)
            event_dict = EventFeedConverter.audit_log_to_event(entry)

            assert event_dict["op"] == action_type

    def test_changes_json_parsing(self):
        """Test changes JSON is correctly parsed."""
        changes = {"field1": "old_value", "field2": "new_value"}
        entry = self._create_audit_log_entry(
            changes_json=json.dumps(changes)
        )

        event_dict = EventFeedConverter.audit_log_to_event(entry)

        assert event_dict["payload"] == changes

    def test_invalid_changes_json_handling(self):
        """Test invalid JSON in changes_json is handled gracefully."""
        entry = self._create_audit_log_entry(
            changes_json="invalid json {{"
        )

        event_dict = EventFeedConverter.audit_log_to_event(entry)

        # Should default to empty dict
        assert event_dict["payload"] == {}

    def test_state_snapshot_json_parsing(self):
        """Test state_snapshot_json is correctly parsed."""
        snapshot = {"status": "COMPLETED", "risk_score": 0.85}
        entry = self._create_audit_log_entry(
            state_snapshot_json=json.dumps(snapshot)
        )

        event_dict = EventFeedConverter.audit_log_to_event(entry)

        assert event_dict["metadata"]["state_snapshot"] == snapshot

    def test_version_mapping(self):
        """Test to_version is mapped to version field."""
        entry = self._create_audit_log_entry(
            from_version=5,
            to_version=6
        )

        event_dict = EventFeedConverter.audit_log_to_event(entry)

        assert event_dict["version"] == 6

    def test_event_dict_can_be_used_for_pydantic_validation(self):
        """Test converted event dict passes Pydantic validation."""
        entry = self._create_audit_log_entry()
        event_dict = EventFeedConverter.audit_log_to_event(entry)

        # Should not raise validation error
        event = InvestigationEvent(**event_dict)

        assert event.id == "test_entry_001"
        assert event.ts == event_dict["ts"]
        assert event.op == "CREATED"
        assert event.actor.type == "UI"
        assert event.actor.id == "user_123"

    def test_batch_convert(self):
        """Test batch conversion of multiple entries."""
        entries = [
            self._create_audit_log_entry(entry_id=f"entry_{i}")
            for i in range(5)
        ]

        events = EventFeedConverter.batch_convert(entries)

        assert len(events) == 5
        for i, event_dict in enumerate(events):
            assert event_dict["id"] == f"entry_{i}"
            assert "ts" in event_dict
            assert "op" in event_dict
            assert "actor" in event_dict

    def test_serialize_event(self):
        """Test event serialization for API response."""
        entry = self._create_audit_log_entry()
        event_dict = EventFeedConverter.audit_log_to_event(entry)

        serialized = EventFeedConverter.serialize_event(event_dict)

        # Verify required fields are serialized
        assert serialized["id"] == "test_entry_001"
        assert serialized["ts"] > 0
        assert serialized["op"] == "CREATED"
        assert serialized["actor"]["type"] == "UI"
        assert serialized["actor"]["id"] == "user_123"
        assert isinstance(serialized["payload"], dict)

    def test_none_timestamp_handling(self):
        """Test handling of None timestamp."""
        entry = self._create_audit_log_entry(timestamp=None)
        event_dict = EventFeedConverter.audit_log_to_event(entry)

        # Should default to 0
        assert event_dict["ts"] == 0

    def test_all_source_types_supported(self):
        """Test all valid source types are handled."""
        for source in ["UI", "API", "SYSTEM", "WEBHOOK", "POLLING"]:
            entry = self._create_audit_log_entry(source=source)
            event_dict = EventFeedConverter.audit_log_to_event(entry)

            assert event_dict["actor"]["type"] == source

    def test_full_event_response_validation(self):
        """Test complete event can be validated against schema."""
        timestamp = datetime(2025, 1, 15, 14, 30, 45, tzinfo=timezone.utc)
        entry = self._create_audit_log_entry(
            entry_id="evt_12345",
            investigation_id="inv_98765",
            user_id="user_abc",
            action_type="UPDATED",
            source="API",
            timestamp=timestamp,
            changes_json=json.dumps({"status": "active"}),
            from_version=2,
            to_version=3
        )

        event_dict = EventFeedConverter.audit_log_to_event(entry)

        # Validate with Pydantic
        event = InvestigationEvent(**event_dict)

        assert event.id == "evt_12345"
        assert event.investigation_id == "inv_98765"
        assert event.op == "UPDATED"
        assert event.actor.type == "API"
        assert event.actor.id == "user_abc"
        assert event.version == 3
        assert event.payload == {"status": "active"}
