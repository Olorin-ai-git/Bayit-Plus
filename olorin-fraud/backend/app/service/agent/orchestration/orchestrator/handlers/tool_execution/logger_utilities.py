"""
Logger Utilities

Provides logging utilities for tool execution phase.
"""

from typing import Any, Dict, List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class LoggerUtilities:
    """Utilities for logging tool execution details."""

    @staticmethod
    def log_tool_execution_interaction(
        state: Dict[str, Any],
        messages: List,
        snowflake_data: Dict[str, Any],
        tools_count: int,
    ):
        """Log detailed LLM interaction for tool execution."""
        system_msg = messages[0] if messages else None

        logger.debug("🤖 LLM TOOL EXECUTION INTERACTION DEBUG:")
        logger.debug(
            f"   🧠 Reasoning context: Tool execution phase for {state.get('entity_type')} - {state.get('entity_id')}"
        )

        if system_msg:
            logger.debug(f"   📝 System prompt length: {len(system_msg.content)} chars")
            logger.debug(f"   📝 System prompt preview: {system_msg.content[:200]}...")

        logger.debug(f"   📚 Existing messages count: {len(messages) - 2}")
        logger.debug(f"   🔧 Available tools: {tools_count}")

        if snowflake_data:
            # Summarize snowflake_data instead of logging raw content
            if isinstance(snowflake_data, dict) and "results" in snowflake_data:
                results = snowflake_data.get("results", [])
                logger.debug(
                    f"   📊 Snowflake context available: Yes ({len(results)} records)"
                )
            elif isinstance(snowflake_data, dict) and "row_count" in snowflake_data:
                logger.debug(
                    f"   📊 Snowflake context available: Yes ({snowflake_data.get('row_count', 0)} rows)"
                )
            else:
                logger.debug(f"   📊 Snowflake context available: Yes (data available)")
        else:
            logger.debug(f"   📊 Snowflake context available: No")

    @staticmethod
    def log_response_analysis(response, tools_used: List[str]):
        """Log analysis of LLM response."""
        logger.debug(f"🤖 LLM TOOL EXECUTION RESPONSE DEBUG:")

        if hasattr(response, "content"):
            logger.debug(
                f"   📄 Response content length: {len(str(response.content))} chars"
            )

        if hasattr(response, "tool_calls") and response.tool_calls:
            logger.debug(f"   🔧 Tool calls present: Yes")
            for i, tc in enumerate(response.tool_calls):
                tool_name = tc.get("name", "unknown")
                logger.debug(f"      Tool call {i}: {tool_name}")
            logger.debug(
                f"   ✅ Reasoning successful: Generated {len(response.tool_calls)} new tool calls (total tools used: {len(tools_used)})"
            )
        else:
            logger.debug(f"   🔧 Tool calls present: No")
            logger.debug(
                f"   💭 Reasoning decision: No additional tools needed (current tools used: {len(tools_used)})"
            )
