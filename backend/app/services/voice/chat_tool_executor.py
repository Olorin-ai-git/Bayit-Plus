"""
Chat Tool Executor Module
Tool execution loop for wizard chat service.

Tracks action-producing tools (play_content, navigate_to_page, etc.)
so the chat service can return proper actions instead of generic "chat".
"""

from typing import Any, Dict, List, Optional

from anthropic import Anthropic
from anthropic.types import Message, ToolUseBlock

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.voice.wizard_tools import WIZARD_TOOLS, execute_tool

logger = get_logger(__name__)

# Tools that produce frontend actions (contain _action in their results)
ACTION_PRODUCING_TOOLS = {
    "play_content",
    "select_subtitles",
    "navigate_to_page",
    "control_playback",
}


class ToolExecutionResult:
    """Wraps the final Claude Message with any extracted actions from tools."""

    def __init__(
        self,
        message: Message,
        extracted_action: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.extracted_action = extracted_action


async def execute_with_tools(
    client: Anthropic,
    messages: List[Dict],
    system_prompt: str
) -> ToolExecutionResult:
    """
    Execute Claude API with tool loop, tracking action-producing tools.

    Args:
        client: Anthropic API client
        messages: Conversation messages
        system_prompt: System prompt

    Returns:
        ToolExecutionResult with the final Message and any extracted action
    """
    max_iterations = settings.WIZARD_CHAT_MAX_ITERATIONS
    iteration = 0
    extracted_action: Optional[Dict[str, Any]] = None

    while iteration < max_iterations:
        iteration += 1

        # Call Claude API
        response = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.CLAUDE_MAX_TOKENS_LONG,
            system=system_prompt,
            messages=messages,
            tools=WIZARD_TOOLS
        )

        # Check if response contains tool use
        tool_use_blocks = [
            block for block in response.content
            if isinstance(block, ToolUseBlock)
        ]

        if not tool_use_blocks:
            # No tools used, return response
            return ToolExecutionResult(response, extracted_action)

        # Execute tools
        logger.info(
            "Executing tools",
            extra={"tool_count": len(tool_use_blocks), "iteration": iteration}
        )

        tool_results, action = await _execute_tools(tool_use_blocks)

        # Keep the last action-producing tool result
        if action is not None:
            extracted_action = action

        # Add assistant response and tool results to messages
        messages.append({
            "role": "assistant",
            "content": response.content
        })
        messages.append({
            "role": "user",
            "content": tool_results
        })

    # Max iterations reached, return last response
    logger.warning(
        "Max iterations reached",
        extra={"max_iterations": max_iterations}
    )
    return ToolExecutionResult(response, extracted_action)


async def _execute_tools(
    tool_use_blocks: List[ToolUseBlock]
) -> tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Execute tool use blocks and extract any frontend actions.

    Args:
        tool_use_blocks: List of tool use blocks from Claude

    Returns:
        Tuple of (tool results for Claude, extracted action or None)
    """
    tool_results = []
    extracted_action: Optional[Dict[str, Any]] = None

    for tool_block in tool_use_blocks:
        tool_name = tool_block.name
        tool_input = tool_block.input
        tool_use_id = tool_block.id

        logger.info(
            "Executing tool",
            extra={"tool_name": tool_name, "tool_use_id": tool_use_id}
        )

        try:
            result = await execute_tool(tool_name, tool_input)

            # Extract _action from action-producing tools
            if (
                tool_name in ACTION_PRODUCING_TOOLS
                and isinstance(result, dict)
                and "_action" in result
            ):
                extracted_action = result["_action"]
                logger.info(
                    "Extracted action from tool result",
                    extra={
                        "tool_name": tool_name,
                        "action_type": extracted_action.get("type"),
                    }
                )

            # Remove _action before sending result to Claude
            result_for_claude = {
                k: v for k, v in result.items() if k != "_action"
            } if isinstance(result, dict) else result

            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": str(result_for_claude)
            })

            logger.debug(
                "Tool executed successfully",
                extra={
                    "tool_name": tool_name,
                    "result_length": len(str(result_for_claude)),
                }
            )

        except Exception as e:
            logger.error(
                "Tool execution failed",
                extra={"tool_name": tool_name, "error": str(e)},
                exc_info=True
            )

            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": f"Error: {str(e)}",
                "is_error": True
            })

    return tool_results, extracted_action
