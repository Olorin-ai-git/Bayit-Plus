"""
Session Store - Storage abstraction for NLP conversation sessions.

Implements Protocol pattern for dependency injection and testability.
"""

from datetime import datetime, timezone
from typing import List, Optional, Protocol

from app.models.nlp_session import NLPConversationSession


class SessionStore(Protocol):
    """Protocol for session storage operations."""

    async def get(self, session_id: str) -> Optional[NLPConversationSession]:
        """Get session by ID."""
        ...

    async def create(self, session: NLPConversationSession) -> str:
        """Create a new session, return session ID."""
        ...

    async def update(self, session: NLPConversationSession) -> None:
        """Update an existing session."""
        ...

    async def delete(self, session_id: str) -> bool:
        """Delete a session, return True if deleted."""
        ...

    async def list_by_user(
        self, user_id: str, limit: int = 10
    ) -> List[NLPConversationSession]:
        """List sessions for a user, most recent first."""
        ...


class MongoSessionStore:
    """MongoDB-backed session store implementation."""

    async def get(self, session_id: str) -> Optional[NLPConversationSession]:
        """Get session by ID."""
        session = await NLPConversationSession.find_one({"session_id": session_id})
        if session and session.is_expired():
            await self.delete(session_id)
            return None
        return session

    async def create(self, session: NLPConversationSession) -> str:
        """Create a new session, return session ID."""
        await session.insert()
        return session.session_id

    async def update(self, session: NLPConversationSession) -> None:
        """Update an existing session."""
        session.last_activity = datetime.now(timezone.utc)
        await session.save()

    async def delete(self, session_id: str) -> bool:
        """Delete a session, return True if deleted."""
        result = await NLPConversationSession.find_one({"session_id": session_id})
        if result:
            await result.delete()
            return True
        return False

    async def list_by_user(
        self, user_id: str, limit: int = 10
    ) -> List[NLPConversationSession]:
        """List sessions for a user, most recent first."""
        return await (
            NLPConversationSession.find({"user_id": user_id})
            .sort("-created_at")
            .limit(limit)
            .to_list()
        )

    async def cleanup_expired(self) -> int:
        """
        Manual cleanup of expired sessions.

        Note: MongoDB TTL index handles automatic cleanup, but this
        provides immediate cleanup if needed.
        """
        now = datetime.now(timezone.utc)
        result = await NLPConversationSession.find({"expires_at": {"$lt": now}}).delete()
        return result.deleted_count if result else 0
