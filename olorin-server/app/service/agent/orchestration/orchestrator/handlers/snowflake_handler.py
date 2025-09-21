"""
Snowflake Handler

Handles the Snowflake analysis phase of investigations.
"""

from typing import Dict, Any, List
from langchain_core.messages import ToolMessage

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState, update_phase
from .snowflake import (
    DataParser, MessageBuilder, LLMInvoker,
    LoggerUtilities, ChainOfThoughtLogger
)

logger = get_bridge_logger(__name__)


class SnowflakeHandler:
    """Handles the Snowflake analysis phase of investigations."""

    def __init__(self, llm_with_tools, tools: List[Any], create_enhanced_system_prompt_fn):
        """Initialize with LLM and tools."""
        self.tools = tools

        # Initialize modular components
        self.data_parser = DataParser()
        self.message_builder = MessageBuilder(create_enhanced_system_prompt_fn)
        self.llm_invoker = LLMInvoker(llm_with_tools)
        self.logger_utilities = LoggerUtilities()
        self.chain_of_thought_logger = ChainOfThoughtLogger(tools)

    async def handle_snowflake_analysis(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle Snowflake analysis phase - MANDATORY lookback (default 7 days, configurable)."""
        logger.debug("[Step 3.2.4.1] Snowflake Analysis Handler entry - Checking completion status")

        # Check if already completed
        if state.get("snowflake_completed", False):
            logger.debug("[Step 3.2.4.1] Snowflake analysis already completed - Skipping to tool_execution phase")
            logger.info("✅ Snowflake analysis already complete, moving to tool execution")
            return update_phase(state, "tool_execution")

        # Check for existing Snowflake results
        existing_result = self._check_existing_snowflake_results(state)
        if existing_result:
            return existing_result

        # Check for pending tool calls
        if self._has_pending_snowflake_calls(state):
            logger.info("⏳ Snowflake tool call already generated, waiting for execution")
            return {"current_phase": "snowflake_analysis"}

        # Generate new Snowflake tool call
        return await self._generate_snowflake_tool_call(state)

    def _check_existing_snowflake_results(self, state: InvestigationState) -> Dict[str, Any]:
        """Check if Snowflake results already exist in messages."""
        messages = state.get("messages", [])

        for msg in messages:
            if isinstance(msg, ToolMessage) and "snowflake" in msg.name.lower():
                logger.warning("🔧 Found Snowflake ToolMessage but completion flag not set - forcing completion")

                snowflake_data = self.data_parser.parse_snowflake_data(msg.content)
                return {
                    "snowflake_data": snowflake_data,
                    "snowflake_completed": True,
                    "current_phase": "tool_execution"
                }
        return None

    def _has_pending_snowflake_calls(self, state: InvestigationState) -> bool:
        """Check if there are pending Snowflake tool calls."""
        messages = state.get("messages", [])

        for msg in reversed(messages):
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tool_call in msg.tool_calls:
                    if "snowflake" in str(tool_call.get("name", "")).lower():
                        return True
        return False

    async def _generate_snowflake_tool_call(self, state: InvestigationState) -> Dict[str, Any]:
        """Generate a new Snowflake tool call."""
        date_range_days = state.get('date_range_days', 7)

        logger.debug(f"[Step 3.2.4.2] Tool call generation for Snowflake - Date range: {date_range_days} days")
        logger.info(f"❄️ Starting MANDATORY Snowflake {date_range_days}-day analysis")

        # Create messages for LLM
        messages = self.message_builder.create_snowflake_messages(state, date_range_days)

        # Log LLM interaction
        self.logger_utilities.log_llm_interaction(state, messages, date_range_days)

        # Log chain of thought
        self.chain_of_thought_logger.log_chain_of_thought(state, date_range_days)

        # Invoke LLM
        response = await self.llm_invoker.invoke_llm_with_error_handling(messages, state)

        # Log response analysis
        self.logger_utilities.log_response_analysis(response, state)

        return {
            "messages": [response],
            "current_phase": "snowflake_analysis"
        }