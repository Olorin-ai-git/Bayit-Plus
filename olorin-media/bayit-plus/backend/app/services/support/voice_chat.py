"""
Voice Chat Module
Handles voice support chat conversations with Claude AI.
"""

import logging
from datetime import datetime, timezone
from typing import AsyncIterator, Optional

import anthropic

from app.core.config import settings
from app.models.support import SupportConversation
from app.models.user import User
from app.services.support.chat_utils import build_chat_result, check_escalation
from app.services.support.constants import (CONVERSATION_HISTORY_LIMIT,
                                            HIGH_CONFIDENCE_SCORE,
                                            LOW_CONFIDENCE_SCORE)
from app.services.support.conversation import (
    get_or_create_conversation, rate_conversation,
    update_conversation_after_response)
from app.services.support_context_builder import support_context_builder

logger = logging.getLogger(__name__)


async def _prepare_chat_context(
    conversation: SupportConversation,
    message: str,
    language: str,
    user: User,
    app_context: Optional[dict],
) -> tuple:
    """Prepare context and messages for Claude API call."""
    context = await support_context_builder.build_context(
        query=message,
        language=language,
        user=user,
        app_context=app_context,
        max_docs=settings.SUPPORT_CONTEXT_MAX_DOCS,
    )

    conversation.messages.append(
        {
            "role": "user",
            "content": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )

    system_prompt = context["instructions"]
    context_prompt = support_context_builder.format_context_for_prompt(context)

    if context_prompt:
        system_prompt += f"\n\n{context_prompt}"

    messages = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in conversation.messages[-CONVERSATION_HISTORY_LIMIT:]
    ]

    return context, system_prompt, messages


async def chat(
    async_client: anthropic.AsyncAnthropic,
    message: str,
    user: User,
    language: str = "en",
    conversation_id: Optional[str] = None,
    app_context: Optional[dict] = None,
    max_tokens: int = 300,
) -> dict:
    """Process a voice support chat message."""
    conversation = await get_or_create_conversation(user, conversation_id, language)
    context, system_prompt, messages = await _prepare_chat_context(
        conversation, message, language, user, app_context
    )

    try:
        response = await async_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages,
        )

        response_text = response.content[0].text.strip()
        escalation_needed, escalation_reason = check_escalation(
            message, response_text, context
        )
        doc_paths = [d["path"] for d in context.get("docs", [])]

        await update_conversation_after_response(
            conversation, response_text, doc_paths, escalation_needed, escalation_reason
        )

        confidence = (
            HIGH_CONFIDENCE_SCORE if not escalation_needed else LOW_CONFIDENCE_SCORE
        )
        return build_chat_result(
            response_text,
            str(conversation.id),
            language,
            doc_paths,
            escalation_needed,
            escalation_reason,
            confidence,
        )

    except anthropic.APIError as e:
        logger.error(f"[Support] Claude API error: {e}")
        raise


async def chat_streaming(
    async_client: anthropic.AsyncAnthropic,
    message: str,
    user: User,
    language: str = "en",
    conversation_id: Optional[str] = None,
    app_context: Optional[dict] = None,
    max_tokens: int = 300,
) -> AsyncIterator[dict]:
    """Process a voice support chat message with streaming response."""
    conversation = await get_or_create_conversation(user, conversation_id, language)
    context, system_prompt, messages = await _prepare_chat_context(
        conversation, message, language, user, app_context
    )

    full_response = ""

    try:
        async with async_client.messages.stream(
            model=settings.CLAUDE_MODEL,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages,
        ) as stream:
            async for text_chunk in stream.text_stream:
                full_response += text_chunk
                yield {"type": "chunk", "text": text_chunk}

        response_text = full_response.strip()
        escalation_needed, escalation_reason = check_escalation(
            message, response_text, context
        )
        doc_paths = [d["path"] for d in context.get("docs", [])]

        await update_conversation_after_response(
            conversation, response_text, doc_paths, escalation_needed, escalation_reason
        )

        confidence = (
            HIGH_CONFIDENCE_SCORE if not escalation_needed else LOW_CONFIDENCE_SCORE
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
        logger.error(f"[Support] Claude API error during streaming: {e}")
        yield {"type": "error", "message": str(e)}
        raise


# Re-export for backward compatibility
__all__ = ["chat", "chat_streaming", "rate_conversation"]
