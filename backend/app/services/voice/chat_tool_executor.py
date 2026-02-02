"""
Chat Tool Executor Module
Tool execution loop for wizard chat service
"""

from typing import Any, Dict, List

from anthropic import Anthropic
from anthropic.types import Message, ToolUseBlock

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.voice.wizard_tools import WIZARD_TOOLS, execute_tool

logger = get_logger(__name__)


async def execute_with_tools(
    client: Anthropic,
    messages: List[Dict],
    system_prompt: str
) -> Message:
    """
    Execute Claude API with tool loop.

    Args:
        client: Anthropic API client
        messages: Conversation messages
        system_prompt: System prompt

    Returns:
        Final Claude response message
    """
    max_iterations = settings.WIZARD_CHAT_MAX_ITERATIONS
    iteration = 0

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
            return response

        # Execute tools
        logger.info(
            "Executing tools",
            extra={"tool_count": len(tool_use_blocks), "iteration": iteration}
        )

        tool_results = await _execute_tools(tool_use_blocks)

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
    return response


async def _execute_tools(
    tool_use_blocks: List[ToolUseBlock]
) -> List[Dict[str, Any]]:
    """
    Execute tool use blocks.

    Args:
        tool_use_blocks: List of tool use blocks from Claude

    Returns:
        List of tool result dictionaries
    """
    tool_results = []

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

            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": str(result)
            })

            logger.debug(
                "Tool executed successfully",
                extra={"tool_name": tool_name, "result_length": len(str(result))}
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

    return tool_results
