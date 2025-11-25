"""
Unit Tests for Progress Calculator Service
Feature: 001-investigation-state-management

Tests investigation progress calculation logic.
Targets 100% coverage of progress_calculator_service.py.

SYSTEM MANDATE Compliance:
- No mocks: Direct testing with real data structures
- Complete tests: All calculation paths covered
- Type-safe: Proper assertions on returned values
"""

import pytest

from app.service.progress_calculator_service import (
    ProgressCalculatorService,
    ToolStatus,
)
from app.service.progress_update_service import ProgressUpdateService


class TestProgressCalculatorService:
    """Test suite for ProgressCalculatorService."""

    def setup_method(self):
        """Setup test instance."""
        self.service = ProgressCalculatorService()
        self.update_service = ProgressUpdateService()

    def test_calculate_investigation_progress_no_data(self):
        """Test progress calculation with no progress data."""
        state = {}
        result = self.service.calculate_investigation_progress(state)

        assert result["current_phase"] is None
        assert result["progress_percentage"] == 0.0
        assert result["phase_progress"] == {}

    def test_calculate_investigation_progress_empty_progress(self):
        """Test progress calculation with empty progress object."""
        state = {"progress": {}}
        result = self.service.calculate_investigation_progress(state)

        assert result["current_phase"] is None
        assert result["progress_percentage"] == 0.0
        assert result["phase_progress"] == {}

    def test_calculate_investigation_progress_no_phases(self):
        """Test progress calculation with no phases but current phase set."""
        state = {"progress": {"current_phase": "phase_1", "phases": []}}
        result = self.service.calculate_investigation_progress(state)

        assert result["current_phase"] == "phase_1"
        assert result["progress_percentage"] == 0.0
        assert result["phase_progress"] == {}

    def test_calculate_investigation_progress_all_phases_zero(self):
        """Test progress calculation with all phases at 0%."""
        state = {
            "progress": {
                "phases": [
                    {
                        "phase_name": "phase_1",
                        "status": "PENDING",
                        "tools_executed": [],
                    },
                    {
                        "phase_name": "phase_2",
                        "status": "PENDING",
                        "tools_executed": [],
                    },
                    {
                        "phase_name": "phase_3",
                        "status": "PENDING",
                        "tools_executed": [],
                    },
                    {
                        "phase_name": "phase_4",
                        "status": "PENDING",
                        "tools_executed": [],
                    },
                    {
                        "phase_name": "phase_5",
                        "status": "PENDING",
                        "tools_executed": [],
                    },
                ]
            }
        }
        result = self.service.calculate_investigation_progress(state)

        assert result["current_phase"] is None
        assert result["progress_percentage"] == 0.0
        assert len(result["phase_progress"]) == 5
        for phase_name, phase_data in result["phase_progress"].items():
            assert phase_data["phase_percentage"] == 0.0
            assert phase_data["tools_completed"] == 0
            assert phase_data["tools_total"] == 0

    def test_calculate_investigation_progress_mixed_percentages(self):
        """Test progress calculation with mixed phase percentages."""
        state = {
            "progress": {
                "phases": [
                    {
                        "phase_name": "phase_1",
                        "status": "COMPLETED",
                        "tools_executed": [
                            {"tool_name": "tool1", "status": "COMPLETED"},
                            {"tool_name": "tool2", "status": "COMPLETED"},
                        ],
                    },
                    {
                        "phase_name": "phase_2",
                        "status": "IN_PROGRESS",
                        "tools_executed": [
                            {"tool_name": "tool3", "status": "COMPLETED"},
                            {"tool_name": "tool4", "status": "RUNNING"},
                        ],
                    },
                    {
                        "phase_name": "phase_3",
                        "status": "PENDING",
                        "tools_executed": [{"tool_name": "tool5", "status": "QUEUED"}],
                    },
                    {
                        "phase_name": "phase_4",
                        "status": "PENDING",
                        "tools_executed": [],
                    },
                    {
                        "phase_name": "phase_5",
                        "status": "PENDING",
                        "tools_executed": [],
                    },
                ]
            }
        }
        result = self.service.calculate_investigation_progress(state)

        assert result["current_phase"] == "phase_2"  # IN_PROGRESS phase
        # Phase 1: 100%, Phase 2: 75%, Phase 3: 0%, Phase 4: 0%, Phase 5: 0%
        # Weighted: (100*0.2) + (75*0.2) + (0*0.2) + (0*0.2) + (0*0.2) = 35
        assert result["progress_percentage"] == 35.0
        assert result["phase_progress"]["phase_1"]["phase_percentage"] == 100.0
        assert result["phase_progress"]["phase_2"]["phase_percentage"] == 75.0
        assert result["phase_progress"]["phase_3"]["phase_percentage"] == 0.0

    def test_calculate_phase_progress_all_completed(self):
        """Test phase progress with all tools completed."""
        tools = [
            {"tool_name": "tool1", "status": "COMPLETED"},
            {"tool_name": "tool2", "status": "COMPLETED"},
            {"tool_name": "tool3", "status": "COMPLETED"},
        ]
        result = self.service.calculate_phase_progress(tools)
        assert result == 100.0

    def test_calculate_phase_progress_mixed_status(self):
        """Test phase progress with mixed tool statuses."""
        tools = [
            {"tool_name": "tool1", "status": "COMPLETED"},  # 100%
            {"tool_name": "tool2", "status": "RUNNING"},  # 50%
            {"tool_name": "tool3", "status": "QUEUED"},  # 0%
            {"tool_name": "tool4", "status": "FAILED"},  # 100%
        ]
        result = self.service.calculate_phase_progress(tools)
        # Average: (100 + 50 + 0 + 100) / 4 = 62.5
        assert result == 62.5

    def test_calculate_phase_progress_empty_tools(self):
        """Test phase progress with no tools."""
        result = self.service.calculate_phase_progress([])
        assert result == 0.0

    def test_calculate_tool_progress_queued(self):
        """Test tool progress for queued status."""
        assert self.service.calculate_tool_progress("QUEUED") == 0.0
        assert self.service.calculate_tool_progress("queued") == 0.0
        assert self.service.calculate_tool_progress("PENDING") == 0.0
        assert self.service.calculate_tool_progress("NOT_STARTED") == 0.0

    def test_calculate_tool_progress_running(self):
        """Test tool progress for running status."""
        assert self.service.calculate_tool_progress("RUNNING") == 50.0
        assert self.service.calculate_tool_progress("running") == 50.0
        assert self.service.calculate_tool_progress("IN_PROGRESS") == 50.0
        assert self.service.calculate_tool_progress("EXECUTING") == 50.0

    def test_calculate_tool_progress_completed(self):
        """Test tool progress for completed status."""
        assert self.service.calculate_tool_progress("COMPLETED") == 100.0
        assert self.service.calculate_tool_progress("completed") == 100.0
        assert self.service.calculate_tool_progress("COMPLETE") == 100.0
        assert self.service.calculate_tool_progress("SUCCESS") == 100.0
        assert self.service.calculate_tool_progress("SUCCESSFUL") == 100.0

    def test_calculate_tool_progress_failed(self):
        """Test tool progress for failed status."""
        assert self.service.calculate_tool_progress("FAILED") == 100.0
        assert self.service.calculate_tool_progress("failed") == 100.0
        assert self.service.calculate_tool_progress("ERROR") == 100.0
        assert self.service.calculate_tool_progress("ERRORED") == 100.0
        assert self.service.calculate_tool_progress("CANCELLED") == 100.0

    def test_calculate_tool_progress_unknown(self):
        """Test tool progress for unknown status."""
        assert self.service.calculate_tool_progress("UNKNOWN") == 0.0
        assert self.service.calculate_tool_progress("") == 0.0
        assert self.service.calculate_tool_progress(None) == 0.0

    def test_update_phase_progress_new_tool(self):
        """Test updating progress with a new tool."""
        state = {
            "progress": {
                "phases": [
                    {
                        "phase_name": "phase_1",
                        "status": "IN_PROGRESS",
                        "tools_executed": [],
                    }
                ]
            }
        }

        result = self.update_service.update_phase_progress(
            state, "phase_1", "new_tool", "RUNNING"
        )

        # Verify the tool was added
        assert result["phase_progress"]["phase_1"]["phase_percentage"] == 50.0
        assert result["phase_progress"]["phase_1"]["tools_total"] == 1

    def test_update_phase_progress_existing_tool(self):
        """Test updating progress for an existing tool."""
        state = {
            "progress": {
                "phases": [
                    {
                        "phase_name": "phase_1",
                        "status": "IN_PROGRESS",
                        "tools_executed": [
                            {"tool_name": "existing_tool", "status": "RUNNING"}
                        ],
                    }
                ]
            }
        }

        result = self.update_service.update_phase_progress(
            state, "phase_1", "existing_tool", "COMPLETED"
        )

        # Verify the tool status was updated
        assert result["phase_progress"]["phase_1"]["phase_percentage"] == 100.0
        assert result["phase_progress"]["phase_1"]["tools_completed"] == 1

    def test_weighted_average_correctness(self):
        """Test that weighted average calculation is correct."""
        # All phases at 100% should give 100%
        state = {
            "progress": {
                "phases": [
                    {
                        "phase_name": f"phase_{i}",
                        "status": "COMPLETED",
                        "tools_executed": [{"status": "COMPLETED"}],
                    }
                    for i in range(1, 6)
                ]
            }
        }
        result = self.service.calculate_investigation_progress(state)
        assert result["progress_percentage"] == 100.0

    def test_progress_bounds(self):
        """Test that progress is always within 0-100 bounds."""
        # Even with calculation errors, should be bounded
        state = {
            "progress": {
                "phases": [
                    {
                        "phase_name": "phase_1",
                        "status": "IN_PROGRESS",
                        "tools_executed": [{"status": "COMPLETED"} for _ in range(100)],
                    }
                ]
            }
        }
        result = self.service.calculate_investigation_progress(state)
        assert 0.0 <= result["progress_percentage"] <= 100.0
