"""
Logger Utilities

Provides logging utilities for Snowflake analysis phase.
"""

from typing import Any, Dict, List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class LoggerUtilities:
    """Utilities for logging Snowflake analysis details."""

    @staticmethod
    def log_llm_interaction(
        state: Dict[str, Any], messages: List, date_range_days: int
    ):
        """Log detailed LLM interaction information."""
        logger.debug(
            "[Step 3.2.4.2] LLM tool call generation - Invoking LLM with SnowflakeQueryTool"
        )
        logger.info("🤖 Invoking LLM for Snowflake query generation...")
        logger.info(f"   LLM type: {type(messages)}")
        logger.info(f"   Messages to LLM: {len(messages)}")

        # DEBUG logging
        system_msg = messages[0] if messages else None
        if system_msg:
            logger.debug(f"   📝 System prompt length: {len(system_msg.content)} chars")
            logger.debug(f"   📝 System prompt preview: {system_msg.content[:200]}...")

    @staticmethod
    def log_response_analysis(response, state: Dict[str, Any]):
        """Log analysis of LLM response."""
        logger.info(f"🤖 LLM response type: {type(response)}")

        if hasattr(response, "tool_calls") and response.tool_calls:
            logger.info(f"📞 LLM generated {len(response.tool_calls)} tool calls")
            for tool_call in response.tool_calls:
                logger.info(f"  - Tool: {tool_call.get('name', 'unknown')}")
                if "snowflake" in tool_call.get("name", "").lower():
                    logger.info("✅ Snowflake tool call generated")
                    break
        else:
            logger.warning("⚠️ LLM did not generate any tool calls")
