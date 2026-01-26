"""
Conversation Session Manager

Manages NLP conversation sessions with:
- Session lifecycle (create, get, end)
- Message history management
- Cost tracking
- Pending action management
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.nlp_session import (
    NLPConversationSession,
    PendingAction,
    SessionMessage,
    ToolCallRecord,
)
from app.services.nlp.session_store import MongoSessionStore, SessionStore

logger = logging.getLogger(__name__)


class SessionSummary(BaseModel):
    """Summary of a session for API responses."""

    session_id: str
    platform: str
    message_count: int
    total_cost: float
    total_iterations: int
    created_at: datetime
    last_activity: datetime
    pending_actions_count: int


class ConversationSessionManager:
    """
    Manages NLP conversation sessions.

    Uses dependency injection for the session store to enable
    testability and alternative implementations.
    """

    def __init__(self, store: Optional[SessionStore] = None):
        """Initialize with optional custom store."""
        self._store = store or MongoSessionStore()

    async def create_session(
        self,
        platform: str = "bayit",
        user_id: Optional[str] = None,
        action_mode: Literal["smart", "confirm_all"] = "smart",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> NLPConversationSession:
        """
        Create a new conversation session.

        Args:
            platform: Target platform (bayit, fraud, cvplus)
            user_id: Optional user ID for authenticated sessions
            action_mode: Action execution mode
            metadata: Optional session metadata

        Returns:
            New session with unique session_id
        """
        session = NLPConversationSession(
            user_id=user_id,
            platform=platform,
            action_mode=action_mode,
            metadata=metadata or {},
        )

        await self._store.create(session)

        logger.info(
            "nlp_session_created",
            extra={
                "session_id": session.session_id,
                "platform": platform,
                "user_id": user_id,
                "action_mode": action_mode,
            },
        )

        return session

    async def get_session(self, session_id: str) -> Optional[NLPConversationSession]:
        """
        Get an existing session by ID.

        Returns None if session doesn't exist or has expired.
        """
        session = await self._store.get(session_id)

        if session is None:
            logger.debug(f"Session not found: {session_id}")
            return None

        if session.is_expired():
            logger.info(f"Session expired: {session_id}")
            await self._store.delete(session_id)
            return None

        return session

    async def get_or_create_session(
        self,
        session_id: Optional[str] = None,
        platform: str = "bayit",
        user_id: Optional[str] = None,
        action_mode: Literal["smart", "confirm_all"] = "smart",
    ) -> NLPConversationSession:
        """
        Get existing session or create new one.

        Useful for API endpoints that optionally accept session_id.
        """
        if session_id:
            session = await self.get_session(session_id)
            if session:
                return session

        return await self.create_session(
            platform=platform,
            user_id=user_id,
            action_mode=action_mode,
        )

    async def add_message(
        self,
        session_id: str,
        role: Literal["user", "assistant", "system"],
        content: str,
    ) -> bool:
        """
        Add a message to session history.

        Returns True if successful, False if session not found.
        """
        session = await self.get_session(session_id)
        if not session:
            return False

        session.add_message(role, content)

        if len(session.messages) > settings.NLP_SESSION_MAX_HISTORY:
            session.messages = session.messages[-settings.NLP_SESSION_MAX_HISTORY :]

        await self._store.update(session)
        return True

    async def add_tool_call(
        self,
        session_id: str,
        tool: str,
        tool_input: Dict[str, Any],
        output: str,
        duration_ms: Optional[int] = None,
    ) -> bool:
        """
        Record a tool call in the session.

        Returns True if successful, False if session not found.
        """
        session = await self.get_session(session_id)
        if not session:
            return False

        session.add_tool_call(tool, tool_input, output, duration_ms)
        await self._store.update(session)

        logger.info(
            "nlp_tool_call_recorded",
            extra={
                "session_id": session_id,
                "tool": tool,
                "duration_ms": duration_ms,
            },
        )

        return True

    async def update_cost(
        self,
        session_id: str,
        cost: float,
        iterations: int = 0,
    ) -> Optional[float]:
        """
        Update session cost tracking.

        Returns new total cost or None if session not found.
        """
        session = await self.get_session(session_id)
        if not session:
            return None

        session.update_cost(cost, iterations)
        await self._store.update(session)

        logger.info(
            "nlp_session_cost_updated",
            extra={
                "session_id": session_id,
                "added_cost": cost,
                "total_cost": session.total_cost,
            },
        )

        return session.total_cost

    async def add_pending_action(
        self,
        session_id: str,
        action_type: str,
        description: str,
        parameters: Dict[str, Any],
        context_snapshot: str,
    ) -> Optional[PendingAction]:
        """
        Add a pending action awaiting confirmation.

        Returns the PendingAction or None if session not found.
        """
        session = await self.get_session(session_id)
        if not session:
            return None

        action = session.add_pending_action(
            action_type=action_type,
            description=description,
            parameters=parameters,
            context_snapshot=context_snapshot,
        )
        await self._store.update(session)

        logger.info(
            "nlp_pending_action_added",
            extra={
                "session_id": session_id,
                "action_id": action.action_id,
                "action_type": action_type,
            },
        )

        return action

    async def get_pending_action(
        self,
        session_id: str,
        action_id: str,
    ) -> Optional[PendingAction]:
        """Get a pending action by ID."""
        session = await self.get_session(session_id)
        if not session:
            return None

        action = session.get_pending_action(action_id)
        if action and action.expires_at < datetime.now(timezone.utc):
            session.remove_pending_action(action_id)
            await self._store.update(session)
            return None

        return action

    async def consume_pending_action(
        self,
        session_id: str,
        action_id: str,
    ) -> Optional[PendingAction]:
        """
        Get and remove a pending action (for execution).

        Returns the action or None if not found/expired.
        """
        session = await self.get_session(session_id)
        if not session:
            return None

        action = session.get_pending_action(action_id)
        if not action:
            return None

        if action.expires_at < datetime.now(timezone.utc):
            session.remove_pending_action(action_id)
            await self._store.update(session)
            logger.info(
                "nlp_pending_action_expired",
                extra={
                    "session_id": session_id,
                    "action_id": action_id,
                },
            )
            return None

        session.remove_pending_action(action_id)
        await self._store.update(session)

        logger.info(
            "nlp_pending_action_consumed",
            extra={
                "session_id": session_id,
                "action_id": action_id,
                "action_type": action.action_type,
            },
        )

        return action

    async def get_conversation_history(
        self,
        session_id: str,
        max_messages: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get conversation history for agent context.

        Returns list of {role, content} dicts.
        """
        session = await self.get_session(session_id)
        if not session:
            return []

        return session.get_conversation_history(max_messages)

    async def get_session_summary(self, session_id: str) -> Optional[SessionSummary]:
        """Get summary of a session."""
        session = await self.get_session(session_id)
        if not session:
            return None

        return SessionSummary(
            session_id=session.session_id,
            platform=session.platform,
            message_count=len(session.messages),
            total_cost=session.total_cost,
            total_iterations=session.total_iterations,
            created_at=session.created_at,
            last_activity=session.last_activity,
            pending_actions_count=len(session.pending_actions),
        )

    async def end_session(self, session_id: str) -> Optional[SessionSummary]:
        """
        End a session and return summary.

        Returns summary or None if session not found.
        """
        summary = await self.get_session_summary(session_id)
        if summary:
            await self._store.delete(session_id)
            logger.info(
                "nlp_session_ended",
                extra={
                    "session_id": session_id,
                    "total_cost": summary.total_cost,
                    "message_count": summary.message_count,
                },
            )
        return summary

    async def list_user_sessions(
        self,
        user_id: str,
        limit: int = 10,
    ) -> List[SessionSummary]:
        """List recent sessions for a user."""
        sessions = await self._store.list_by_user(user_id, limit)
        return [
            SessionSummary(
                session_id=s.session_id,
                platform=s.platform,
                message_count=len(s.messages),
                total_cost=s.total_cost,
                total_iterations=s.total_iterations,
                created_at=s.created_at,
                last_activity=s.last_activity,
                pending_actions_count=len(s.pending_actions),
            )
            for s in sessions
        ]


def get_session_manager() -> ConversationSessionManager:
    """Get default session manager instance."""
    return ConversationSessionManager()
