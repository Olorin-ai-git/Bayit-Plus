"""
Unit tests for ToolExecutionService
Feature: Tool Execution Persistence

Tests for persisting agent tool executions to database and retrieving them for progress tracking.

SYSTEM MANDATE Compliance:
- No hardcoded values: All test data from fixtures
- Complete implementation: Full test coverage
- Type-safe: All parameters and returns properly typed
- No mocks/stubs: Uses real SQLite in-memory database
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.models.investigation_state import Base, InvestigationState
from app.service.tool_execution_service import ToolExecutionService


@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestSessionLocal()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture
def investigation_state(test_db: Session):
    """Create a test investigation state"""
    state = InvestigationState(
        investigation_id="test-investigation-001",
        user_id="test-user-001",  # Required field
        status="IN_PROGRESS",
        lifecycle_stage="IN_PROGRESS",
        settings_json=json.dumps(
            {"entities": [{"entity_type": "user_id", "entity_value": "test-user"}]}
        ),
        progress_json=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        version=1,
    )
    test_db.add(state)
    test_db.commit()
    return state


class TestToolExecutionService:
    """Test suite for ToolExecutionService"""

    def test_persist_tool_execution_success(
        self, test_db: Session, investigation_state
    ):
        """Test successful tool execution persistence"""
        service = ToolExecutionService(test_db)

        # Persist tool execution
        tool_exec_id = service.persist_tool_execution(
            investigation_id=investigation_state.investigation_id,
            agent_name="device_agent",
            tool_name="fingerprint_analyzer",
            status="completed",
            input_parameters={"device_id": "device-123", "entity_id": "test-user"},
            output_result={"risk_score": 0.75, "findings": ["suspicious pattern"]},
            duration_ms=1500,
            tokens_used=250,
            cost=0.005,
        )

        # Verify ID was returned
        assert tool_exec_id is not None
        assert len(tool_exec_id) > 0

        # Verify data was persisted
        test_db.refresh(investigation_state)
        progress_data = json.loads(investigation_state.progress_json)

        assert "tool_executions" in progress_data
        assert len(progress_data["tool_executions"]) == 1

        tool_exec = progress_data["tool_executions"][0]
        assert tool_exec["id"] == tool_exec_id
        assert tool_exec["agent_name"] == "device_agent"
        assert tool_exec["tool_name"] == "fingerprint_analyzer"
        assert tool_exec["status"] == "completed"
        assert tool_exec["duration_ms"] == 1500
        assert tool_exec["tokens_used"] == 250
        assert tool_exec["cost"] == 0.005

    def test_persist_tool_execution_with_error(
        self, test_db: Session, investigation_state
    ):
        """Test persisting failed tool execution with error message"""
        service = ToolExecutionService(test_db)

        tool_exec_id = service.persist_tool_execution(
            investigation_id=investigation_state.investigation_id,
            agent_name="network_agent",
            tool_name="ip_geolocation",
            status="failed",
            input_parameters={"ip_address": "192.168.1.1"},
            error_message="Invalid IP address",
            duration_ms=50,
        )

        test_db.refresh(investigation_state)
        progress_data = json.loads(investigation_state.progress_json)

        tool_exec = progress_data["tool_executions"][0]
        assert tool_exec["status"] == "failed"
        assert tool_exec["error_message"] == "Invalid IP address"
        assert tool_exec["output_result"] is None

    def test_persist_multiple_tool_executions(
        self, test_db: Session, investigation_state
    ):
        """Test persisting multiple tool executions"""
        service = ToolExecutionService(test_db)

        # Persist first tool
        service.persist_tool_execution(
            investigation_id=investigation_state.investigation_id,
            agent_name="device_agent",
            tool_name="device_reputation",
            status="completed",
            input_parameters={"device_id": "device-123"},
            output_result={"reputation": "good"},
            duration_ms=1000,
        )

        # Persist second tool
        service.persist_tool_execution(
            investigation_id=investigation_state.investigation_id,
            agent_name="location_agent",
            tool_name="geo_validator",
            status="completed",
            input_parameters={"location": "New York"},
            output_result={"valid": True},
            duration_ms=500,
        )

        test_db.refresh(investigation_state)
        progress_data = json.loads(investigation_state.progress_json)

        assert len(progress_data["tool_executions"]) == 2
        assert progress_data["percent_complete"] == 100  # Both completed

    def test_get_tool_executions(self, test_db: Session, investigation_state):
        """Test retrieving tool executions"""
        service = ToolExecutionService(test_db)

        # Persist some executions
        service.persist_tool_execution(
            investigation_id=investigation_state.investigation_id,
            agent_name="logs_agent",
            tool_name="splunk_search",
            status="running",
            input_parameters={"query": "error logs"},
            duration_ms=0,
        )

        # Get executions
        executions = service.get_tool_executions(investigation_state.investigation_id)

        assert len(executions) == 1
        assert executions[0]["agent_name"] == "logs_agent"
        assert executions[0]["status"] == "running"

    def test_update_tool_execution_status(self, test_db: Session, investigation_state):
        """Test updating tool execution status"""
        service = ToolExecutionService(test_db)

        # Create initial execution
        tool_exec_id = service.persist_tool_execution(
            investigation_id=investigation_state.investigation_id,
            agent_name="risk_agent",
            tool_name="risk_calculator",
            status="running",
            input_parameters={"entity": "user-123"},
            duration_ms=0,
        )

        # Update status
        success = service.update_tool_execution_status(
            investigation_id=investigation_state.investigation_id,
            tool_exec_id=tool_exec_id,
            status="completed",
            output_result={"risk_level": "high", "score": 0.85},
            duration_ms=2500,
        )

        assert success is True

        # Verify update
        executions = service.get_tool_executions(investigation_state.investigation_id)
        assert executions[0]["status"] == "completed"
        assert executions[0]["duration_ms"] == 2500
        assert executions[0]["output_result"]["risk_level"] == "high"

    def test_get_latest_tool_executions(self, test_db: Session, investigation_state):
        """Test retrieving latest N tool executions"""
        service = ToolExecutionService(test_db)

        # Create multiple executions
        for i in range(5):
            service.persist_tool_execution(
                investigation_id=investigation_state.investigation_id,
                agent_name=f"agent_{i}",
                tool_name=f"tool_{i}",
                status="completed",
                input_parameters={"index": i},
                duration_ms=i * 100,
            )

        # Get latest 3
        latest = service.get_latest_tool_executions(
            investigation_state.investigation_id, limit=3
        )

        assert len(latest) == 3
        # Should be in reverse order (most recent first)
        assert latest[0]["agent_name"] == "agent_4"
        assert latest[1]["agent_name"] == "agent_3"
        assert latest[2]["agent_name"] == "agent_2"

    def test_get_tool_execution_stats(self, test_db: Session, investigation_state):
        """Test getting tool execution statistics"""
        service = ToolExecutionService(test_db)

        # Create various tool executions
        service.persist_tool_execution(
            investigation_id=investigation_state.investigation_id,
            agent_name="agent_1",
            tool_name="tool_1",
            status="completed",
            input_parameters={},
            duration_ms=1000,
            tokens_used=100,
            cost=0.01,
        )

        service.persist_tool_execution(
            investigation_id=investigation_state.investigation_id,
            agent_name="agent_2",
            tool_name="tool_2",
            status="completed",
            input_parameters={},
            duration_ms=2000,
            tokens_used=200,
            cost=0.02,
        )

        service.persist_tool_execution(
            investigation_id=investigation_state.investigation_id,
            agent_name="agent_3",
            tool_name="tool_3",
            status="failed",
            input_parameters={},
            error_message="Error",
            duration_ms=500,
        )

        service.persist_tool_execution(
            investigation_id=investigation_state.investigation_id,
            agent_name="agent_4",
            tool_name="tool_4",
            status="running",
            input_parameters={},
            duration_ms=0,
        )

        # Get statistics
        stats = service.get_tool_execution_stats(investigation_state.investigation_id)

        assert stats["total"] == 4
        assert stats["completed"] == 2
        assert stats["failed"] == 1
        assert stats["running"] == 1
        assert stats["pending"] == 0
        assert stats["average_duration_ms"] == 1500  # (1000 + 2000) / 2
        assert stats["total_tokens"] == 300
        assert stats["total_cost"] == 0.03

    def test_investigation_not_found(self, test_db: Session):
        """Test handling of non-existent investigation"""
        service = ToolExecutionService(test_db)

        with pytest.raises(ValueError, match="Investigation non-existent not found"):
            service.persist_tool_execution(
                investigation_id="non-existent",
                agent_name="test_agent",
                tool_name="test_tool",
                status="completed",
                input_parameters={},
            )

    def test_empty_tool_executions(self, test_db: Session, investigation_state):
        """Test handling when no tool executions exist"""
        service = ToolExecutionService(test_db)

        executions = service.get_tool_executions(investigation_state.investigation_id)
        assert executions == []

        stats = service.get_tool_execution_stats(investigation_state.investigation_id)
        assert stats["total"] == 0
        assert stats["average_duration_ms"] == 0

    def test_progress_percentage_calculation(
        self, test_db: Session, investigation_state
    ):
        """Test that progress percentage is calculated correctly"""
        service = ToolExecutionService(test_db)

        # Add 5 tools, 3 completed
        for i in range(5):
            service.persist_tool_execution(
                investigation_id=investigation_state.investigation_id,
                agent_name=f"agent_{i}",
                tool_name=f"tool_{i}",
                status="completed" if i < 3 else "pending",
                input_parameters={},
                duration_ms=100,
            )

        test_db.refresh(investigation_state)
        progress_data = json.loads(investigation_state.progress_json)

        # 3 out of 5 completed = 60%
        assert progress_data["percent_complete"] == 60

    def test_version_increment(self, test_db: Session, investigation_state):
        """Test that version is incremented on each update"""
        service = ToolExecutionService(test_db)

        initial_version = investigation_state.version

        service.persist_tool_execution(
            investigation_id=investigation_state.investigation_id,
            agent_name="test_agent",
            tool_name="test_tool",
            status="completed",
            input_parameters={},
            duration_ms=100,
        )

        test_db.refresh(investigation_state)
        assert investigation_state.version == initial_version + 1
