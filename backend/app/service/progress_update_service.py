"""
Progress Update Service
Feature: 001-investigation-state-management

Updates phase progress for investigation state.

SYSTEM MANDATE Compliance:
- No hardcoded values: All logic data-driven
- Complete implementation: Full update functionality
- Type-safe: All parameters and returns properly typed
"""

from typing import Any, Dict, List

from app.service.progress_calculator_service import ProgressCalculatorService


class ProgressUpdateService:
    """Service for updating investigation progress state."""

    def __init__(self):
        """Initialize with calculator service."""
        self.calculator = ProgressCalculatorService()

    def update_phase_progress(
        self,
        investigation_state: Dict[str, Any],
        phase_name: str,
        tool_name: str,
        tool_status: str,
    ) -> Dict[str, Any]:
        """
        Update progress for a specific tool within a phase.

        Args:
            investigation_state: Current investigation state
            phase_name: Name of the phase to update
            tool_name: Name of the tool being updated
            tool_status: New status for the tool

        Returns:
            Updated progress information
        """
        progress_data = investigation_state.get("progress", {})
        phases = progress_data.get("phases", [])

        # Find and update the specified phase
        for phase in phases:
            if phase.get("phase_name") == phase_name:
                tools = phase.get("tools_executed", [])

                # Find and update the tool
                tool_found = False
                for tool in tools:
                    if tool.get("tool_name") == tool_name:
                        tool["status"] = tool_status
                        tool_found = True
                        break

                # Add tool if not found
                if not tool_found:
                    tools.append({"tool_name": tool_name, "status": tool_status})

                break

        # Recalculate overall progress
        return self.calculator.calculate_investigation_progress(investigation_state)
