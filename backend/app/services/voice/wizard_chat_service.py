"""
Wizard Chat Service - Claude AI integration for voice assistant
Provides conversational AI responses with tool execution loop
"""

import asyncio
from typing import Any, Dict, List, Optional
from anthropic import Anthropic
from anthropic.types import Message, TextBlock, ToolUseBlock

from app.core.config import settings
from app.core.logging_config import get_logger
from .wizard_prompts import get_system_prompt
from .wizard_tools import WIZARD_TOOLS, execute_tool
from .error_messages import get_error_message

logger = get_logger(__name__)


class ConversationMemory:
    """
    In-memory conversation history storage.
    TTL-based expiry handled by the service itself.
    """

    def __init__(self):
        self._conversations: Dict[str, List[Dict]] = {}

    def add_message(self, conversation_id: str, message: Dict):
        """Add message to conversation history."""
        if conversation_id not in self._conversations:
            self._conversations[conversation_id] = []

        self._conversations[conversation_id].append(message)

        # Keep only last N messages
        max_history = settings.WIZARD_CHAT_MAX_HISTORY
        if len(self._conversations[conversation_id]) > max_history:
            self._conversations[conversation_id] = self._conversations[conversation_id][-max_history:]

    def get_history(self, conversation_id: str) -> List[Dict]:
        """Get conversation history."""
        return self._conversations.get(conversation_id, [])

    def clear(self, conversation_id: str):
        """Clear conversation history."""
        if conversation_id in self._conversations:
            del self._conversations[conversation_id]


# Global conversation memory
_conversation_memory = ConversationMemory()


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
        media_context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Process chat request with Claude AI and tool execution.

        Args:
            transcript: User voice input
            language: Language code (he, en, es)
            conversation_id: Conversation identifier
            media_context: Optional current media state

        Returns:
            Dict with spoken_response and optional action payload
        """
        try:
            # Get system prompt
            system_prompt = get_system_prompt(language, media_context)

            # Get conversation history
            history = _conversation_memory.get_history(conversation_id)

            # Build messages
            messages = history + [{"role": "user", "content": transcript}]

            # Execute with timeout
            try:
                result = await asyncio.wait_for(
                    self._execute_with_tools(messages, system_prompt),
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

            # Extract response text
            response_text = self._extract_text_from_response(result)

            # Format for voice
            spoken_response = self._format_for_voice(response_text)

            # Update conversation memory
            _conversation_memory.add_message(
                conversation_id,
                {"role": "user", "content": transcript}
            )
            _conversation_memory.add_message(
                conversation_id,
                {"role": "assistant", "content": response_text}
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
                extra={"conversation_id": conversation_id, "error": str(e)},
                exc_info=True
            )
            return {
                "spoken_response": get_error_message("claude_api_failure", language),
                "action": None
            }

    async def _execute_with_tools(
        self,
        messages: List[Dict],
        system_prompt: str
    ) -> Message:
        """
        Execute Claude API with tool loop.

        Args:
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
            response = self.client.messages.create(
                model=self.model,
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

            tool_results = await self._execute_tools(tool_use_blocks)

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
        self,
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

    def _extract_text_from_response(self, response: Message) -> str:
        """Extract text content from Claude response."""
        text_blocks = [
            block.text for block in response.content
            if isinstance(block, TextBlock)
        ]
        return " ".join(text_blocks).strip()

    def _format_for_voice(self, text: str) -> str:
        """
        Format text for voice output.
        Remove markdown, complex punctuation, etc.

        Args:
            text: Raw text from Claude

        Returns:
            Voice-optimized text
        """
        # Remove markdown formatting
        text = text.replace("**", "").replace("*", "")
        text = text.replace("#", "").replace("`", "")

        # Remove brackets and parentheses
        text = text.replace("[", "").replace("]", "")
        text = text.replace("(", "").replace(")", "")

        # Normalize whitespace
        text = " ".join(text.split())

        return text.strip()
