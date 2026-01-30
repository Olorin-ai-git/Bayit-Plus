"""
Session Manager

Manages user sessions and frequency limits for live trivia.
"""

import logging
from datetime import datetime, timedelta, timezone

from app.models.live_trivia import LiveTriviaSession

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages user trivia sessions and frequency limits."""

    def __init__(self, min_interval_seconds: int, max_facts_per_session: int):
        """
        Initialize session manager.

        Args:
            min_interval_seconds: Minimum seconds between facts
            max_facts_per_session: Maximum facts per session
        """
        self.min_interval_seconds = min_interval_seconds
        self.max_facts_per_session = max_facts_per_session

    async def get_or_create_session(
        self,
        user_id: str,
        channel_id: str
    ) -> LiveTriviaSession:
        """
        Get or create user's live trivia session.

        Args:
            user_id: User ID
            channel_id: Channel ID

        Returns:
            LiveTriviaSession instance
        """
        session = await LiveTriviaSession.find_one(
            LiveTriviaSession.user_id == user_id,
            LiveTriviaSession.channel_id == channel_id,
            LiveTriviaSession.session_end.exists(False)  # Active session
        )

        if not session:
            session = LiveTriviaSession(
                user_id=user_id,
                channel_id=channel_id,
                session_start=datetime.now(timezone.utc),
                shown_topics=[],
                shown_fact_ids=[]
            )
            await session.save()
            logger.info(f"Created new trivia session for user {user_id} on {channel_id}")
        else:
            # Refresh updated_at to keep session alive (TTL is on updated_at)
            session.updated_at = datetime.now(timezone.utc)
            await session.save()

        return session

    async def check_frequency_limit(self, session: LiveTriviaSession) -> bool:
        """
        Check if enough time has passed since last fact.

        Args:
            session: User session

        Returns:
            True if can show next fact, False if too soon
        """
        if not session.last_fact_shown_at:
            return True

        elapsed = (datetime.now(timezone.utc) - session.last_fact_shown_at).total_seconds()
        return elapsed >= self.min_interval_seconds
