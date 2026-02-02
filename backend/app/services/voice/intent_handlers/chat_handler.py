"""
Chat Intent Handler
Handles natural language chat using Claude AI
"""

from typing import Any, Dict

from app.core.logging_config import get_logger
from ..context import VoiceContext
from ..wizard_chat_service import WizardChatService
from ..error_messages import get_error_message

logger = get_logger(__name__)


async def handle_chat(
    transcript: str,
    context: VoiceContext
) -> Dict[str, Any]:
    """
    Handle natural language chat using Claude AI.

    Args:
        transcript: User voice input
        context: Voice request context

    Returns:
        Dict with spoken_response and action
    """
    try:
        wizard_service = WizardChatService()

        result = await wizard_service.process_chat(
            transcript=transcript,
            language=context.language,
            conversation_id=context.conversation_id,
            user_id=context.user_id,
            media_context=None
        )

        logger.info(
            "Chat handled successfully",
            extra={
                "user_id": context.user_id,
                "language": context.language,
                "conversation_id": context.conversation_id
            }
        )

        return result

    except Exception as e:
        logger.error(
            "Chat handler failed",
            extra={"user_id": context.user_id, "error": str(e)},
            exc_info=True
        )
        return {
            "spoken_response": get_error_message("claude_api_failure", context.language),
            "action": {"type": "chat", "payload": {"message": transcript}}
        }
