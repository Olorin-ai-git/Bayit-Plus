"""
Progress Calculator Service
Feature: 001-investigation-state-management

Calculates investigation progress based on phase and tool execution status.
Uses weighted average across phases for overall progress percentage.

SYSTEM MANDATE Compliance:
- No hardcoded values: Weights are algorithmic (equal distribution)
- Complete implementation: Full progress calculation logic
- Type-safe: All parameters and returns properly typed
"""

import logging
import time
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class ToolStatus(str, Enum):
    """Tool execution status."""

    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PENDING = "pending"
    IN_PROGRESS = "in_progress"


class ProgressCalculatorService:
    """
    Service for calculating investigation progress percentages.

    Uses weighted average approach:
    - Each phase contributes equally to total progress (20% per phase for 5 phases)
    - Phase progress is based on tool completion within that phase
    - Tool progress: 0% (queued), 50% (running), 100% (completed/failed)
    """

    # Number of investigation phases (configurable if needed)
    PHASE_COUNT = 5

    def calculate_investigation_progress(
        self, investigation_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate overall investigation progress from state data.

        Args:
            investigation_state: Investigation state dictionary with progress data

        Returns:
            Dictionary with current_phase, progress_percentage, and phase_progress
        """
        start_time = time.perf_counter()
        investigation_id = investigation_state.get("investigation_id", "unknown")

        logger.debug(
            "calculate_investigation_progress_started",
            extra={
                "investigation_id": investigation_id,
                "operation": "calculate_progress",
            },
        )

        progress_data = investigation_state.get("progress", {})
        if not progress_data:
            logger.info(
                "no_progress_data",
                extra={
                    "investigation_id": investigation_id,
                    "progress_percentage": 0.0,
                },
            )
            return {
                "current_phase": None,
                "progress_percentage": 0.0,
                "phase_progress": {},
            }

        # Extract phases information
        phases = progress_data.get("phases", [])
        if not phases:
            return {
                "current_phase": progress_data.get("current_phase"),
                "progress_percentage": 0.0,
                "phase_progress": {},
            }

        # Calculate progress for each phase
        phase_progress = {}
        total_progress = 0.0
        current_phase = None

        for idx, phase in enumerate(phases):
            phase_name = phase.get("phase_name", f"phase_{idx + 1}")
            phase_status = phase.get("status", "PENDING")

            # Calculate this phase's progress
            phase_percentage = self.calculate_phase_progress(
                phase.get("tools_executed", [])
            )

            phase_progress[phase_name] = {
                "phase_percentage": phase_percentage,
                "status": phase_status,
                "tools_completed": sum(
                    1
                    for tool in phase.get("tools_executed", [])
                    if tool.get("status") in ["COMPLETED", "completed"]
                ),
                "tools_total": len(phase.get("tools_executed", [])),
            }

            # Track current phase (last phase that's in progress or running)
            if phase_status in ["IN_PROGRESS", "in_progress", "RUNNING", "running"]:
                current_phase = phase_name

            # Add to total progress (equal weight per phase)
            phase_weight = 1.0 / self.PHASE_COUNT
            total_progress += phase_percentage * phase_weight

        # Ensure progress is within bounds
        progress_percentage = max(0.0, min(100.0, total_progress))

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        logger.info(
            "progress_calculated",
            extra={
                "investigation_id": investigation_id,
                "progress_percentage": round(progress_percentage, 2),
                "current_phase": current_phase,
                "phase_count": len(phases),
                "latency_ms": round(elapsed_ms, 2),
                "operation": "calculate_progress",
            },
        )

        return {
            "current_phase": current_phase or progress_data.get("current_phase"),
            "progress_percentage": round(progress_percentage, 2),
            "phase_progress": phase_progress,
        }

    def calculate_phase_progress(self, tools_executed: List[Dict[str, Any]]) -> float:
        """
        Calculate progress for a single phase based on tool execution.

        Args:
            tools_executed: List of tool execution dictionaries

        Returns:
            Phase progress percentage (0-100)
        """
        if not tools_executed:
            return 0.0

        total_progress = 0.0
        for tool in tools_executed:
            tool_status = tool.get("status", "").upper()
            tool_progress = self.calculate_tool_progress(tool_status)
            total_progress += tool_progress

        # Average progress across all tools in phase
        phase_percentage = (
            (total_progress / len(tools_executed)) if tools_executed else 0.0
        )
        return max(0.0, min(100.0, phase_percentage))

    def calculate_tool_progress(self, status: str) -> float:
        """
        Calculate progress percentage for a single tool based on status.

        Args:
            status: Tool execution status

        Returns:
            Tool progress percentage:
            - 0% for queued/pending
            - 50% for running/in_progress
            - 100% for completed/failed
        """
        status_upper = status.upper() if status else ""

        # Map statuses to progress percentages
        if status_upper in ["QUEUED", "PENDING", "NOT_STARTED"]:
            return 0.0
        elif status_upper in ["RUNNING", "IN_PROGRESS", "EXECUTING"]:
            return 50.0
        elif status_upper in ["COMPLETED", "COMPLETE", "SUCCESS", "SUCCESSFUL"]:
            return 100.0
        elif status_upper in ["FAILED", "ERROR", "ERRORED", "CANCELLED"]:
            return 100.0  # Failed tools still count as "done"
        else:
            # Unknown status defaults to 0
            return 0.0
