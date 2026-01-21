"""
Rollback Service

Functions for rolling back librarian actions.
"""

import logging

from app.models.content import Content
from app.models.librarian import LibrarianAction

from .models import FixResult

logger = logging.getLogger(__name__)


async def rollback_action(action_id: str) -> FixResult:
    """Rollback a librarian action."""
    try:
        action = await LibrarianAction.get(action_id)
        if not action:
            return FixResult(success=False, error_message="Action not found")

        content = await Content.get(action.content_id)
        if not content:
            return FixResult(success=False, error_message="Content not found")

        # Restore before state
        if action.before_state:
            for key, value in action.before_state.items():
                setattr(content, key, value)
            await content.save()

        action.is_rolled_back = True
        await action.save()

        return FixResult(success=True, action_id=action_id)

    except Exception as e:
        logger.error(f"Error rolling back action {action_id}: {e}")
        return FixResult(success=False, error_message=str(e))
