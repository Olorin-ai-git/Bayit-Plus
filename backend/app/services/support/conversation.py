"""
Conversation Management Module
Handles support conversation lifecycle operations.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.models.support import SupportConversation
from app.models.user import User

logger = logging.getLogger(__name__)


async def get_or_create_conversation(
    user: User,
    conversation_id: Optional[str],
    language: str,
) -> SupportConversation:
    """Get existing or create new support conversation."""
    if conversation_id:
        try:
            conversation = await SupportConversation.get(conversation_id)
            if conversation and conversation.user_id == user.id:
                return conversation
        except Exception:
            pass

    conversation = SupportConversation(
        user_id=user.id,
        language=language,
        messages=[],
    )
    await conversation.insert()
    return conversation


async def update_conversation_after_response(
    conversation: SupportConversation,
    response_text: str,
    doc_paths: list,
    escalation_needed: bool,
    escalation_reason: Optional[str],
) -> None:
    """Update conversation after receiving assistant response."""
    conversation.messages.append({
        'role': 'assistant',
        'content': response_text,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })

    conversation.docs_referenced = list(set(
        conversation.docs_referenced + doc_paths
    ))

    if escalation_needed and not conversation.escalated:
        conversation.escalated = True
        conversation.escalation_reason = escalation_reason

    conversation.updated_at = datetime.now(timezone.utc)
    await conversation.save()


async def rate_conversation(
    conversation_id: str,
    user: User,
    rating: int,
    feedback: Optional[str] = None,
) -> bool:
    """Rate a support conversation."""
    try:
        conversation = await SupportConversation.get(conversation_id)
        if not conversation or conversation.user_id != user.id:
            return False

        conversation.rating = rating
        conversation.feedback = feedback
        await conversation.save()

        return True
    except Exception as e:
        logger.error(f'[Support] Error rating conversation: {e}')
        return False
