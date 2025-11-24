"""
Tool Execution Handler

Handles the tool execution phase of investigations.
"""

from typing import Dict, Any, List

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState, update_phase
from .tool_execution import ToolExecutionLimiter, MessageBuilder, LLMInvoker, LoggerUtilities

logger = get_bridge_logger(__name__)


class ToolExecutionHandler:
    """Handles the tool execution phase of investigations."""

    def __init__(self, llm_with_tools, tools: List[Any], create_enhanced_system_prompt_fn, summarize_snowflake_data_fn):
        """Initialize with LLM and tools."""
        self.tools = tools

        # Initialize modular components
        self.execution_limiter = ToolExecutionLimiter()
        self.message_builder = MessageBuilder(tools, create_enhanced_system_prompt_fn, summarize_snowflake_data_fn)
        self.llm_invoker = LLMInvoker(llm_with_tools)
        self.logger_utilities = LoggerUtilities()

    async def handle_tool_execution(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle additional tool execution based on Snowflake findings."""
        snowflake_data = state.get("snowflake_data", {})
        tools_used = state.get("tools_used", [])

        # Check for mock mode early exit
        if self.execution_limiter.should_exit_mock_mode(snowflake_data, tools_used):
            return update_phase(state, "domain_analysis")

        # Check for execution limits
        if self.execution_limiter.should_exit_due_to_limits(state):
            return update_phase(state, "domain_analysis")

        # Continue with tool execution
        return await self._execute_additional_tools(state, snowflake_data, tools_used)

    async def _execute_additional_tools(self, state: InvestigationState, snowflake_data: Dict[str, Any], tools_used: List[str]) -> Dict[str, Any]:
        """Execute additional tools based on Snowflake findings."""
        tool_execution_attempts = state.get("tool_execution_attempts", 0) + 1
        orchestrator_loops = state.get("orchestrator_loops", 0)

        logger.info(f"🔧 Tool execution phase - {len(tools_used)} tools used, attempt {tool_execution_attempts}/4, loop {orchestrator_loops}")

        # Determine tool count needed
        actual_tools_used = len(set(tools_used))
        tool_count = max(actual_tools_used, 2)

        # Create tool selection prompt
        messages = self.message_builder.create_tool_selection_messages(
            state, snowflake_data, tools_used, tool_count, tool_execution_attempts, orchestrator_loops
        )

        # Log LLM interaction
        self.logger_utilities.log_tool_execution_interaction(state, messages, snowflake_data, len(self.tools))

        # Log full LLM prompt when snowflake data is included
        if snowflake_data:
            logger.info("📝 LLM Prompt (with formatted Snowflake data):")
            for i, msg in enumerate(messages):
                msg_type = type(msg).__name__
                content_preview = str(msg.content)[:500] if hasattr(msg, 'content') else str(msg)[:500]
                logger.info(f"   Message {i+1} ({msg_type}): {content_preview}...")
                if len(str(msg.content)) > 500:
                    logger.info(f"   ... (truncated, full length: {len(str(msg.content))} chars)")

        # Invoke LLM
        response = await self.llm_invoker.invoke_llm_with_error_handling(messages, tool_execution_attempts)

        # Log full LLM response
        if snowflake_data:
            logger.info("🤖 LLM Response (after receiving formatted Snowflake data):")
            if hasattr(response, 'content'):
                response_preview = str(response.content)[:1000] if response.content else "[Empty response]"
                logger.info(f"   Response content: {response_preview}")
                if response.content and len(str(response.content)) > 1000:
                    logger.info(f"   ... (truncated, full length: {len(str(response.content))} chars)")
            if hasattr(response, 'tool_calls') and response.tool_calls:
                logger.info(f"   Tool calls: {len(response.tool_calls)}")
                for tc in response.tool_calls:
                    logger.info(f"      - {tc.get('name', 'unknown')}")

        # Log response analysis
        self.logger_utilities.log_response_analysis(response, tools_used)

        return {
            "messages": [response],
            "current_phase": "tool_execution",
            "tool_execution_attempts": tool_execution_attempts
        }