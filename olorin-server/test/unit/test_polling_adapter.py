"""
Unit tests for Investigation Polling Adapter.
Feature: 006-hybrid-graph-integration - Phase 4 - Task T047

Tests InvestigationPollingAdapter transformation logic from hybrid graph internal state
to polling API responses. Verifies correct mapping of phases, agents, tools, and logs.
"""

import pytest
from datetime import datetime, timedelta
from app.service.investigation_polling_adapter import InvestigationPollingAdapter
from app.models.investigation_state import InvestigationState


class TestInvestigationPollingAdapter:
    """Test InvestigationPollingAdapter transformation logic"""

    def test_transform_running_investigation(self):
        """Test transformation of running investigation with partial progress"""
        investigation = InvestigationState(
            investigation_id="hg-test-001",
            user_id="user-123",
            entity_type="user",
            entity_id="entity-456",
            status="running",
            current_phase="domain_analysis",
            progress_percentage=45.0,
            created_at=datetime.utcnow() - timedelta(minutes=5),
            updated_at=datetime.utcnow(),
            progress_json={
                "agents": {
                    "device": {
                        "name": "Device Agent",
                        "status": "completed",
                        "progress_percentage": 100.0,
                        "tools_used": 3,
                        "findings_count": 5
                    }
                },
                "tool_executions": [
                    {
                        "tool_id": "tool-001",
                        "tool_name": "Device Analyzer",
                        "status": "completed",
                        "started_at": "2025-10-15T10:00:00Z",
                        "completed_at": "2025-10-15T10:00:05Z",
                        "duration_ms": 5000
                    }
                ],
                "logs": [
                    {
                        "timestamp": "2025-10-15T10:00:00Z",
                        "severity": "info",
                        "source": "device_agent",
                        "message": "Device analysis started"
                    }
                ]
            }
        )

        adapter = InvestigationPollingAdapter()
        result = adapter.transform_to_status(investigation)

        assert result.investigation_id == "hg-test-001"
        assert result.status == "running"
        assert result.current_phase == "domain_analysis"
        assert result.progress_percentage == 45.0
        assert len(result.agent_status) == 1
        assert "device" in result.agent_status
        assert result.agent_status["device"].status == "completed"
        assert len(result.tool_executions) == 1
        assert result.tool_executions[0].tool_name == "Device Analyzer"
        assert len(result.logs) == 1

    def test_transform_completed_investigation_with_risk_score(self):
        """Test transformation of completed investigation including risk score"""
        investigation = InvestigationState(
            investigation_id="hg-test-002",
            user_id="user-123",
            entity_type="user",
            entity_id="entity-789",
            status="completed",
            current_phase="summary",
            progress_percentage=100.0,
            created_at=datetime.utcnow() - timedelta(minutes=10),
            updated_at=datetime.utcnow(),
            progress_json={
                "risk_score": 75.5,
                "agents": {}
            }
        )

        adapter = InvestigationPollingAdapter()
        result = adapter.transform_to_status(investigation)

        assert result.status == "completed"
        assert result.progress_percentage == 100.0
        assert result.risk_score == 75.5
        assert result.estimated_completion_time is None

    def test_extract_agent_status(self):
        """Test agent status extraction with multiple agents"""
        progress_data = {
            "agents": {
                "device": {"name": "Device Agent", "status": "completed",
                           "progress_percentage": 100.0, "tools_used": 3, "findings_count": 5},
                "location": {"name": "Location Agent", "status": "running",
                             "progress_percentage": 60.0, "tools_used": 2, "findings_count": 2}
            }
        }

        adapter = InvestigationPollingAdapter()
        result = adapter._extract_agent_status(progress_data)

        assert len(result) == 2
        assert result["device"].status == "completed"
        assert result["location"].status == "running"

    def test_extract_tool_executions(self):
        """Test tool execution extraction with various statuses"""
        progress_data = {
            "tool_executions": [
                {"tool_id": "tool-001", "tool_name": "Tool One", "status": "completed",
                 "started_at": "2025-10-15T10:00:00Z", "completed_at": "2025-10-15T10:00:05Z",
                 "duration_ms": 5000},
                {"tool_id": "tool-002", "tool_name": "Tool Two", "status": "running",
                 "started_at": "2025-10-15T10:00:05Z"}
            ]
        }

        adapter = InvestigationPollingAdapter()
        result = adapter._extract_tool_executions(progress_data)

        assert len(result) == 2
        assert result[0].status == "completed"
        assert result[0].duration_ms == 5000
        assert result[1].status == "running"
        assert result[1].completed_at is None

    def test_extract_log_entries(self):
        """Test log entry extraction with different severity levels"""
        progress_data = {
            "logs": [
                {"timestamp": "2025-10-15T10:00:00Z", "severity": "info",
                 "source": "coordinator", "message": "Investigation started"},
                {"timestamp": "2025-10-15T10:00:05Z", "severity": "error",
                 "source": "network_agent", "message": "Connection failed",
                 "metadata": {"retry_count": 3}}
            ]
        }

        adapter = InvestigationPollingAdapter()
        result = adapter._extract_log_entries(progress_data)

        assert len(result) == 2
        assert result[0].severity == "info"
        assert result[1].severity == "error"
        assert result[1].metadata["retry_count"] == 3

    def test_extract_error_details_failed_investigation(self):
        """Test error detail extraction for failed investigation"""
        investigation = InvestigationState(
            investigation_id="hg-test-error",
            user_id="user-123",
            status="failed",
            progress_json={
                "error": {
                    "error_code": "AGENT_TIMEOUT",
                    "error_message": "Network agent exceeded timeout",
                    "error_details": {"agent": "network", "timeout_seconds": 300},
                    "recovery_suggestions": ["Retry with increased timeout", "Check network connectivity"]
                }
            }
        )

        adapter = InvestigationPollingAdapter()
        result = adapter._extract_error_details(investigation)

        assert result is not None
        assert result.error_code == "AGENT_TIMEOUT"
        assert result.error_message == "Network agent exceeded timeout"
        assert "Retry" in result.recovery_suggestions[0]

    def test_estimate_completion_time(self):
        """Test completion time estimation based on progress"""
        investigation = InvestigationState(
            investigation_id="hg-test-timing",
            user_id="user-123",
            status="running",
            progress_percentage=50.0,
            created_at=datetime.utcnow() - timedelta(minutes=5)
        )

        adapter = InvestigationPollingAdapter()
        result = adapter._estimate_completion_time(investigation)

        assert result is not None
        assert result > datetime.utcnow()
