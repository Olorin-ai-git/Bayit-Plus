"""
Integration Tests for Investigation Auto-Trigger Flow

Tests the complete flow from investigation state creation to automatic
background investigation execution with proper lifecycle management.

Feature: 001-investigation-state-management
Tests auto-execution of investigations when state is created with settings.
"""

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.models.investigation_audit_log import InvestigationAuditLog
from app.models.investigation_state import InvestigationState
from app.router.models.structured_investigation_models import (
    StructuredInvestigationRequest,
)
from app.schemas.investigation_state import (
    CorrelationMode,
    Entity,
    EntityType,
    InvestigationSettings,
    InvestigationStateCreate,
    InvestigationStatus,
    LifecycleStage,
    TimeRange,
    ToolSelection,
)
from app.service.investigation_state_service import InvestigationStateService
from app.service.investigation_trigger_service import InvestigationTriggerService


class TestInvestigationAutoTrigger:
    """Tests for investigation auto-trigger functionality."""

    @pytest.fixture
    def investigation_settings(self) -> InvestigationSettings:
        """Create sample investigation settings with entities."""
        return InvestigationSettings(
            name="Fraud Investigation Test",
            entities=[Entity(entity_type="ip_address", entity_value="192.168.1.1")],
            time_range=TimeRange(
                start_time=datetime(2025, 1, 1, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 31, tzinfo=timezone.utc),
            ),
            tools=[ToolSelection(tool_name="ip_reputation", enabled=True, config={})],
            correlation_mode=CorrelationMode.OR,
        )

    @pytest.fixture
    def investigation_create_request(
        self, investigation_settings
    ) -> InvestigationStateCreate:
        """Create sample investigation state creation request."""
        return InvestigationStateCreate(
            investigation_id="inv_test_001",
            lifecycle_stage=LifecycleStage.CREATED,
            status=InvestigationStatus.CREATED,
            settings=investigation_settings,
        )

    @pytest.mark.asyncio
    async def test_create_state_without_background_tasks(
        self, db: Session, investigation_create_request
    ):
        """Test that state creation works without background_tasks (backward compatibility)."""
        service = InvestigationStateService(db)

        response = await service.create_state(
            user_id="test_user",
            data=investigation_create_request,
            background_tasks=None,
        )

        assert response.investigation_id == "inv_test_001"
        assert response.status == InvestigationStatus.CREATED
        assert response.lifecycle_stage == LifecycleStage.CREATED

        # Verify state is in database
        state = (
            db.query(InvestigationState)
            .filter(InvestigationState.investigation_id == "inv_test_001")
            .first()
        )
        assert state is not None
        assert state.status == InvestigationStatus.CREATED

    @pytest.mark.asyncio
    async def test_create_state_with_background_tasks_queues_execution(
        self, db: Session, investigation_create_request
    ):
        """Test that background task is properly queued when background_tasks provided."""
        service = InvestigationStateService(db)
        background_tasks = BackgroundTasks()

        # Patch the executor at its actual location (imported inside method)
        with patch(
            "app.router.controllers.investigation_executor.execute_structured_investigation"
        ):
            response = await service.create_state(
                user_id="test_user",
                data=investigation_create_request,
                background_tasks=background_tasks,
            )

            assert response.investigation_id == "inv_test_001"

            # Verify background task was queued
            assert len(background_tasks.tasks) > 0

    @pytest.mark.asyncio
    async def test_trigger_service_extracts_structured_request(
        self, db: Session, investigation_settings
    ):
        """Test that trigger service correctly extracts structured request from settings."""
        trigger_service = InvestigationTriggerService(db)

        request = trigger_service.extract_structured_request(
            investigation_id="inv_001", settings=investigation_settings
        )

        assert request is not None
        assert isinstance(request, StructuredInvestigationRequest)
        assert request.investigation_id == "inv_001"
        assert request.entity_id == "192.168.1.1"
        assert request.entity_type == "ip"  # Converted from ip_address

    @pytest.mark.asyncio
    async def test_trigger_service_returns_none_for_empty_settings(self, db: Session):
        """Test that trigger service returns None when settings have no entities."""
        trigger_service = InvestigationTriggerService(db)

        request = trigger_service.extract_structured_request(
            investigation_id="inv_001", settings=None
        )

        assert request is None

    @pytest.mark.asyncio
    async def test_trigger_service_raises_for_missing_entity_value(self, db: Session):
        """Test that trigger service raises error when entity_value is missing."""
        trigger_service = InvestigationTriggerService(db)

        settings = InvestigationSettings(
            name="Invalid Investigation",
            entities=[Entity(entity_type="ip_address", entity_value=None)],
            time_range=TimeRange(
                start_time=datetime(2025, 1, 1, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 31, tzinfo=timezone.utc),
            ),
            tools=[ToolSelection(tool_name="test")],
            correlation_mode=CorrelationMode.OR,
        )

        with pytest.raises(ValueError):
            trigger_service.extract_structured_request(
                investigation_id="inv_001", settings=settings
            )

    @pytest.mark.asyncio
    async def test_trigger_service_builds_investigation_context(
        self, db: Session, investigation_settings
    ):
        """Test that trigger service builds investigation context correctly."""
        trigger_service = InvestigationTriggerService(db)

        context = trigger_service.get_investigation_context(
            investigation_id="inv_001",
            entity=investigation_settings.entities[0],
            settings=investigation_settings,
        )

        assert context["investigation_id"] == "inv_001"
        assert context["entity_id"] == "192.168.1.1"
        assert (
            context["entity_type"] == "ip_address"
        )  # Original settings value, not converted
        assert context["triggered_from_state"] is True
        assert context["correlation_mode"] == CorrelationMode.OR
        assert "time_range" in context
        assert "tools" in context

    @pytest.mark.asyncio
    async def test_trigger_service_updates_state_to_in_progress(
        self, db: Session, investigation_create_request
    ):
        """Test that trigger service updates investigation state to IN_PROGRESS."""
        service = InvestigationStateService(db)
        trigger_service = InvestigationTriggerService(db)

        # Create initial state
        state_response = await service.create_state(
            user_id="test_user",
            data=investigation_create_request,
            background_tasks=None,
        )

        # Get the created state from database
        state = (
            db.query(InvestigationState)
            .filter(InvestigationState.investigation_id == "inv_test_001")
            .first()
        )

        assert state.status == InvestigationStatus.CREATED

        # Update to IN_PROGRESS
        trigger_service.update_state_to_in_progress(
            investigation_id="inv_test_001", state=state, user_id="test_user"
        )

        # Refresh and verify
        db.refresh(state)
        assert state.lifecycle_stage == LifecycleStage.IN_PROGRESS
        assert state.status == InvestigationStatus.IN_PROGRESS

        # Verify audit entry was created
        audit_entries = (
            db.query(InvestigationAuditLog)
            .filter(
                InvestigationAuditLog.investigation_id == "inv_test_001",
                InvestigationAuditLog.action_type == "STATE_CHANGE",
            )
            .all()
        )

        assert len(audit_entries) > 0

    @pytest.mark.asyncio
    async def test_end_to_end_auto_trigger_flow(
        self, db: Session, investigation_create_request
    ):
        """Test complete end-to-end flow of auto-trigger."""
        service = InvestigationStateService(db)
        background_tasks = BackgroundTasks()

        # Create state with background_tasks
        with patch(
            "app.router.controllers.investigation_executor.execute_structured_investigation"
        ):
            response = await service.create_state(
                user_id="test_user",
                data=investigation_create_request,
                background_tasks=background_tasks,
            )

        # Verify state transitioned to IN_PROGRESS after auto-trigger
        assert response.investigation_id == "inv_test_001"
        assert response.status == InvestigationStatus.IN_PROGRESS

        # Verify state exists in database
        state = (
            db.query(InvestigationState)
            .filter(InvestigationState.investigation_id == "inv_test_001")
            .first()
        )
        assert state is not None

        # Verify initial CREATED audit entry
        audit_entries = (
            db.query(InvestigationAuditLog)
            .filter(
                InvestigationAuditLog.investigation_id == "inv_test_001",
                InvestigationAuditLog.action_type == "CREATED",
            )
            .all()
        )
        assert len(audit_entries) == 1

        # Verify background task was queued
        assert len(background_tasks.tasks) > 0

        # Verify state was updated to IN_PROGRESS (via trigger service)
        db.refresh(state)
        assert state.lifecycle_stage == LifecycleStage.IN_PROGRESS
        assert state.status == InvestigationStatus.IN_PROGRESS

        # Verify STATE_CHANGE audit entry was created
        state_change_entries = (
            db.query(InvestigationAuditLog)
            .filter(
                InvestigationAuditLog.investigation_id == "inv_test_001",
                InvestigationAuditLog.action_type == "STATE_CHANGE",
            )
            .all()
        )
        assert len(state_change_entries) > 0

    @pytest.mark.asyncio
    async def test_investigation_without_settings_not_triggered(self, db: Session):
        """Test that investigation without settings is not auto-triggered."""
        service = InvestigationStateService(db)
        background_tasks = BackgroundTasks()

        # Create request without settings
        request = InvestigationStateCreate(
            investigation_id="inv_no_settings",
            lifecycle_stage=LifecycleStage.CREATED,
            status=InvestigationStatus.CREATED,
            settings=None,
        )

        response = await service.create_state(
            user_id="test_user", data=request, background_tasks=background_tasks
        )

        assert response.investigation_id == "inv_no_settings"

        # Verify no background tasks were queued (no auto-trigger)
        assert len(background_tasks.tasks) == 0

        # Verify state remains in CREATED status
        state = (
            db.query(InvestigationState)
            .filter(InvestigationState.investigation_id == "inv_no_settings")
            .first()
        )
        assert state.status == InvestigationStatus.CREATED
        assert state.lifecycle_stage == LifecycleStage.CREATED

    @pytest.mark.asyncio
    async def test_audit_trail_completeness(
        self, db: Session, investigation_create_request
    ):
        """Test that complete audit trail is created during auto-trigger."""
        service = InvestigationStateService(db)
        background_tasks = BackgroundTasks()

        with patch(
            "app.router.controllers.investigation_executor.execute_structured_investigation"
        ):
            await service.create_state(
                user_id="test_user",
                data=investigation_create_request,
                background_tasks=background_tasks,
            )

        # Get all audit entries
        audit_entries = (
            db.query(InvestigationAuditLog)
            .filter(InvestigationAuditLog.investigation_id == "inv_test_001")
            .order_by(InvestigationAuditLog.timestamp)
            .all()
        )

        # Should have at least 2 entries: CREATED and STATE_CHANGE
        assert len(audit_entries) >= 2

        # Verify CREATED entry
        created_entry = [e for e in audit_entries if e.action_type == "CREATED"][0]
        assert created_entry.user_id == "test_user"
        assert created_entry.source == "API"
        assert created_entry.from_version is None
        assert created_entry.to_version == 1

        # Verify STATE_CHANGE entry
        state_change_entry = [
            e for e in audit_entries if e.action_type == "STATE_CHANGE"
        ][0]
        assert state_change_entry.user_id == "test_user"
        assert state_change_entry.source == "SYSTEM"
        assert state_change_entry.to_version > 1
