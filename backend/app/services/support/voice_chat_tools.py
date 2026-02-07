"""
Voice Chat with Tools Module
Streaming chat that gives the LLM access to WIZARD_TOOLS for content actions.

Used as fallback when the keyword-based IntentRouter classifies intent as CHAT.
The LLM can search content, play media, navigate, etc. via tool calls.
"""

import json
from typing import Any, AsyncIterator, Dict, Optional

import anthropic

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.user import User
from app.services.support.constants import (
    HIGH_CONFIDENCE_SCORE,
    LOW_CONFIDENCE_SCORE,
)
from app.services.support.chat_utils import build_chat_result, check_escalation
from app.services.support.conversation import (
    get_or_create_conversation,
    update_conversation_after_response,
)
from app.services.support.voice_chat import (
    _append_voice_brevity,
    _prepare_chat_context,
)
from app.services.voice.tool_definitions import WIZARD_TOOLS
from app.services.voice.tool_executors import execute_tool

logger = get_logger(__name__)

# Tools whose results contain an _action for the frontend
_ACTION_PRODUCING_TOOLS = {
    "play_content",
    "select_subtitles",
    "navigate_to_page",
    "control_playback",
    "search_content",
    "get_kids_content",
    "get_recommendations",
    "get_live_channels",
}


async def chat_streaming_with_tools(
    async_client: anthropic.AsyncAnthropic,
    message: str,
    user: User,
    language: str = "en",
    conversation_id: Optional[str] = None,
    app_context: Optional[dict] = None,
    max_tokens: int = 300,
) -> AsyncIterator[Dict[str, Any]]:
    """
    Stream chat response with tool calling support.

    Yields dicts with type:
      - "chunk": text chunk for TTS streaming
      - "tool_action": extracted frontend action from a tool
      - "complete": final result with conversation metadata
      - "error": on failure
    """
    transcript_limit = settings.SUPPORT_VOICE_TRANSCRIPT_MAX_LENGTH
    message = message[:transcript_limit]

    conversation = await get_or_create_conversation(
        user, conversation_id, language
    )
    context, system_prompt, messages = await _prepare_chat_context(
        conversation, message, language, user, app_context
    )
    system_prompt = _append_voice_brevity(system_prompt, language)

    max_iterations = settings.WIZARD_CHAT_MAX_ITERATIONS
    extracted_action: Optional[Dict[str, Any]] = None
    full_response = ""

    try:
        for iteration in range(max_iterations):
            has_tool_use = False

            async with async_client.messages.stream(
                model=settings.CLAUDE_MODEL,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=messages,
                tools=WIZARD_TOOLS,
            ) as stream:
                assistant_content = []

                async for event in stream:
                    if event.type == "content_block_start":
                        block = event.content_block
                        if block.type == "text":
                            assistant_content.append(
                                {"type": "text", "text": ""}
                            )
                        elif block.type == "tool_use":
                            has_tool_use = True
                            assistant_content.append({
                                "type": "tool_use",
                                "id": block.id,
                                "name": block.name,
                                "input": "",
                            })

                    elif event.type == "content_block_delta":
                        delta = event.delta
                        if delta.type == "text_delta":
                            full_response += delta.text
                            if assistant_content:
                                assistant_content[-1]["text"] += delta.text
                            yield {"type": "chunk", "text": delta.text}

                        elif delta.type == "input_json_delta":
                            if assistant_content:
                                assistant_content[-1]["input"] += (
                                    delta.partial_json
                                )

            if not has_tool_use:
                break

            # Execute tool calls from this iteration
            tool_results = []
            for block in assistant_content:
                if block.get("type") != "tool_use":
                    continue

                tool_name = block["name"]
                try:
                    tool_input = json.loads(block["input"])
                except (json.JSONDecodeError, TypeError):
                    tool_input = {}

                logger.info(
                    "Executing tool in voice chat",
                    extra={
                        "tool_name": tool_name,
                        "iteration": iteration,
                    },
                )

                result = await execute_tool(tool_name, tool_input)

                if (
                    tool_name in _ACTION_PRODUCING_TOOLS
                    and isinstance(result, dict)
                    and "_action" in result
                ):
                    extracted_action = result["_action"]
                    yield {
                        "type": "tool_action",
                        "action": extracted_action,
                    }

                result_for_claude = (
                    {k: v for k, v in result.items() if k != "_action"}
                    if isinstance(result, dict)
                    else result
                )

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block["id"],
                    "content": json.dumps(
                        result_for_claude, default=str
                    ),
                })

            # Append assistant turn and tool results for next iteration
            messages.append({
                "role": "assistant",
                "content": assistant_content,
            })
            messages.append({"role": "user", "content": tool_results})

        # Finalize conversation
        response_text = full_response.strip()
        escalation_needed, escalation_reason = check_escalation(
            message, response_text, context
        )
        doc_paths = [d["path"] for d in context.get("docs", [])]

        await update_conversation_after_response(
            conversation,
            response_text,
            doc_paths,
            escalation_needed,
            escalation_reason,
        )

        confidence = (
            HIGH_CONFIDENCE_SCORE
            if not escalation_needed
            else LOW_CONFIDENCE_SCORE
        )
        result = build_chat_result(
            response_text,
            str(conversation.id),
            language,
            doc_paths,
            escalation_needed,
            escalation_reason,
            confidence,
        )
        result["type"] = "complete"
        yield result

    except anthropic.APIError as e:
        logger.error(
            "Claude API error during streaming with tools",
            extra={"error": str(e)},
        )
        yield {"type": "error", "message": str(e)}
        raise
