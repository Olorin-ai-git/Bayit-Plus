"""
Tool Execution Limiter

Manages execution limits and safety checks for tool execution.
"""

import os
from typing import Any, Dict, List

from app.service.agent.orchestration.state_schema import (
    InvestigationState,
    update_phase,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ToolExecutionLimiter:
    """Manages execution limits and safety checks."""

    @staticmethod
    def should_exit_mock_mode(
        snowflake_data: Dict[str, Any], tools_used: List[str]
    ) -> bool:
        """Check if should exit in mock mode."""
        test_mode = os.getenv("TEST_MODE", "").lower()
        mock_mode_ready = test_mode == "mock" and snowflake_data is not None

        logger.debug(f"[SAFETY-CHECK-2] 🔒 TOOL EXECUTION SAFETY CHECK (MOCK MODE)")
        logger.debug(f"[SAFETY-CHECK-2]   Test mode: {test_mode}")
        logger.debug(f"[SAFETY-CHECK-2]   Tools used count: {len(tools_used)}")
        logger.debug(
            f"[SAFETY-CHECK-2]   Snowflake completed: {snowflake_data is not None}"
        )
        logger.debug(
            f"[SAFETY-CHECK-2]   Mock mode ready for domain analysis: {mock_mode_ready}"
        )

        if mock_mode_ready:
            logger.debug(
                f"[SAFETY-CHECK-2]   ✅ TRIGGERED: Mock mode moving to domain analysis after Snowflake completion"
            )
            logger.info(
                f"🎭 Mock mode: Moving to domain analysis after Snowflake completion ({len(tools_used)} tools used)"
            )
            return True

        return False

    @staticmethod
    def should_exit_due_to_limits(state: InvestigationState) -> bool:
        """Check if should exit due to execution limits."""
        tools_used = state.get("tools_used", [])
        tool_execution_attempts = state.get("tool_execution_attempts", 0) + 1
        orchestrator_loops = state.get("orchestrator_loops", 0)

        max_attempts = 4
        max_tools = 10
        max_orchestrator_loops = 25

        ToolExecutionLimiter._log_safety_check(
            tool_execution_attempts,
            max_attempts,
            tools_used,
            max_tools,
            orchestrator_loops,
            max_orchestrator_loops,
        )

        should_exit = (
            tool_execution_attempts >= max_attempts
            or len(tools_used) >= max_tools
            or orchestrator_loops >= max_orchestrator_loops
        )

        if should_exit:
            triggered_conditions = ToolExecutionLimiter._get_triggered_conditions(
                tool_execution_attempts,
                max_attempts,
                tools_used,
                max_tools,
                orchestrator_loops,
                max_orchestrator_loops,
            )
            logger.debug(
                f"[SAFETY-CHECK-3]   ✅ TRIGGERED: Tool execution limit reached - {', '.join(triggered_conditions)}"
            )
            logger.info(
                f"✅ Tool execution complete: {len(tools_used)} tools used, {tool_execution_attempts} attempts, {orchestrator_loops} loops"
            )
            return True

        return False

    @staticmethod
    def _log_safety_check(
        tool_execution_attempts: int,
        max_attempts: int,
        tools_used: List[str],
        max_tools: int,
        orchestrator_loops: int,
        max_orchestrator_loops: int,
    ):
        """Log safety check details."""
        logger.debug(f"[SAFETY-CHECK-3] 🔒 TOOL EXECUTION SAFETY CHECK (LIVE MODE)")
        logger.debug(
            f"[SAFETY-CHECK-3]   Tool execution attempts: {tool_execution_attempts}/{max_attempts}"
        )
        logger.debug(
            f"[SAFETY-CHECK-3]   Tools used count: {len(tools_used)}/{max_tools}"
        )
        logger.debug(
            f"[SAFETY-CHECK-3]   Orchestrator loops: {orchestrator_loops}/{max_orchestrator_loops}"
        )

    @staticmethod
    def _get_triggered_conditions(
        tool_execution_attempts: int,
        max_attempts: int,
        tools_used: List[str],
        max_tools: int,
        orchestrator_loops: int,
        max_orchestrator_loops: int,
    ) -> List[str]:
        """Get list of triggered exit conditions."""
        triggered_conditions = []

        if tool_execution_attempts >= max_attempts:
            triggered_conditions.append(
                f"max_attempts({tool_execution_attempts}>={max_attempts})"
            )
        if len(tools_used) >= max_tools:
            triggered_conditions.append(f"max_tools({len(tools_used)}>={max_tools})")
        if orchestrator_loops >= max_orchestrator_loops:
            triggered_conditions.append(
                f"max_loops({orchestrator_loops}>={max_orchestrator_loops})"
            )

        return triggered_conditions
