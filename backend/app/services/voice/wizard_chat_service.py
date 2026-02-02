"""
Wizard Chat Service - Claude AI integration for voice assistant
Provides conversational AI responses with tool execution loop
"""

import asyncio
from typing import Any, Dict, Optional
from anthropic import Anthropic, AuthenticationError, RateLimitError, APIError

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.voice.wizard_prompts import get_system_prompt
from app.services.voice.error_messages import get_error_message
from app.services.voice.conversation_memory import conversation_memory
from app.services.voice.response_formatter import extract_text_from_response, format_for_voice
from app.services.voice.chat_tool_executor import execute_with_tools

logger = get_logger(__name__)


class WizardChatService:
    """Service for handling chat interactions via Claude AI."""

    def __init__(self):
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is required for wizard chat")

        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.CLAUDE_MODEL

    async def process_chat(
        self,
        transcript: str,
        language: str,
        conversation_id: str,
        user_id: str,
        media_context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Process chat request with Claude AI and tool execution.

        Args:
            transcript: User voice input
            language: Language code (he, en, es)
            conversation_id: Conversation identifier
            user_id: User ID for conversation access control
            media_context: Optional current media state

        Returns:
            Dict with spoken_response and optional action payload
        """
        try:
            # Get system prompt
            system_prompt = get_system_prompt(language, media_context)

            # Get conversation history with user validation
            try:
                history = conversation_memory.get_history(conversation_id, user_id)
            except PermissionError:
                logger.error(
                    "Unauthorized conversation access",
                    extra={"conversation_id": conversation_id, "user_id": user_id}
                )
                return {
                    "spoken_response": get_error_message("unauthorized", language),
                    "action": None
                }

            # Build messages
            messages = history + [{"role": "user", "content": transcript}]

            # Execute with timeout
            try:
                result = await asyncio.wait_for(
                    execute_with_tools(self.client, messages, system_prompt),
                    timeout=settings.WIZARD_CHAT_TIMEOUT_SECONDS
                )
            except asyncio.TimeoutError:
                logger.warning(
                    "Chat request timeout",
                    extra={"conversation_id": conversation_id, "language": language}
                )
                return {
                    "spoken_response": get_error_message("timeout", language),
                    "action": None
                }
            except AuthenticationError:
                logger.error("Claude API authentication failed")
                return {
                    "spoken_response": get_error_message("service_unavailable", language),
                    "action": None
                }
            except RateLimitError:
                logger.warning("Claude API rate limit exceeded")
                return {
                    "spoken_response": get_error_message("rate_limit", language),
                    "action": None
                }
            except APIError as e:
                logger.error(
                    "Claude API error",
                    extra={"error_type": type(e).__name__}
                )
                return {
                    "spoken_response": get_error_message("claude_api_failure", language),
                    "action": None
                }

            # Extract response text
            response_text = extract_text_from_response(result)

            # Format for voice
            spoken_response = format_for_voice(response_text)

            # Update conversation memory with user validation
            try:
                conversation_memory.add_message(
                    conversation_id,
                    {"role": "user", "content": transcript},
                    user_id
                )
                conversation_memory.add_message(
                    conversation_id,
                    {"role": "assistant", "content": response_text},
                    user_id
                )
            except PermissionError:
                logger.error(
                    "Failed to save conversation",
                    extra={"conversation_id": conversation_id, "user_id": user_id}
                )

            logger.info(
                "Chat processed successfully",
                extra={
                    "conversation_id": conversation_id,
                    "language": language,
                    "response_length": len(spoken_response)
                }
            )

            return {
                "spoken_response": spoken_response,
                "action": {"type": "chat", "payload": {"message": transcript}}
            }

        except Exception as e:
            logger.error(
                "Chat processing failed",
                extra={
                    "conversation_id": conversation_id,
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return {
                "spoken_response": get_error_message("claude_api_failure", language),
                "action": None
            }
