"""
Session Manager

Manages user sessions and frequency limits for live trivia.
Falls back to in-memory sessions when MongoDB is unavailable.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union

from app.models.live_trivia import LiveTriviaSession

logger = logging.getLogger(__name__)


class InMemoryTriviaSession:
    """Lightweight session that mirrors LiveTriviaSession without Beanie.

    Used when MongoDB/Beanie is unavailable (e.g. SSL failures to Atlas).
    Beanie Document.__init__ calls get_pymongo_collection() which raises
    CollectionWasNotInitialized when the DB connection never succeeded.
    """

    def __init__(
        self,
        user_id: str,
        channel_id: str,
    ):
        self.id = None
        self.user_id = user_id
        self.channel_id = channel_id
        self.session_start = datetime.utcnow()
        self.session_end: Optional[datetime] = None
        self.shown_topics: List[str] = []
        self.shown_fact_ids: List[str] = []
        self.frequency = "normal"
        self.last_fact_shown_at: Optional[datetime] = None

    def add_shown_topic(self, topic_hash: str) -> None:
        if topic_hash not in self.shown_topics:
            self.shown_topics.append(topic_hash)
            if len(self.shown_topics) > 100:
                self.shown_topics = self.shown_topics[-100:]

    def add_shown_fact(self, fact_id: str) -> None:
        if fact_id not in self.shown_fact_ids:
            self.shown_fact_ids.append(fact_id)
            if len(self.shown_fact_ids) > 100:
                self.shown_fact_ids = self.shown_fact_ids[-100:]

    def is_topic_shown_recently(self, topic_hash: str) -> bool:
        return topic_hash in self.shown_topics


TriviaSession = Union[LiveTriviaSession, InMemoryTriviaSession]


class SessionManager:
    """Manages user trivia sessions and frequency limits."""

    def __init__(self, min_interval_seconds: int, max_facts_per_session: int):
        self.min_interval_seconds = min_interval_seconds
        self.max_facts_per_session = max_facts_per_session
        self._inmemory_sessions: Dict[
            Tuple[str, str], InMemoryTriviaSession
        ] = {}

    async def get_or_create_session(
        self,
        user_id: str,
        channel_id: str,
    ) -> TriviaSession:
        """
        Get or create user's live trivia session.

        Falls back to an in-memory session when MongoDB is
        unavailable (e.g. SSL handshake failures to Atlas).
        """
        try:
            session = await LiveTriviaSession.find_one(
                {
                    "user_id": user_id,
                    "channel_id": channel_id,
                    "session_end": None,
                }
            )

            if not session:
                session = LiveTriviaSession(
                    user_id=user_id,
                    channel_id=channel_id,
                    session_start=datetime.utcnow(),
                    shown_topics=[],
                    shown_fact_ids=[],
                )
                await session.save()
                logger.info(
                    "Created new trivia session",
                    extra={"user_id": user_id, "channel_id": channel_id},
                )

            return session
        except Exception as e:
            error_detail = str(e) or type(e).__name__
            logger.warning(
                "MongoDB unavailable for trivia session, using in-memory",
                extra={
                    "user_id": user_id,
                    "channel_id": channel_id,
                    "error": error_detail,
                },
            )
            return self._get_inmemory_session(user_id, channel_id)

    def _get_inmemory_session(
        self, user_id: str, channel_id: str
    ) -> InMemoryTriviaSession:
        key = (user_id, channel_id)
        if key not in self._inmemory_sessions:
            self._inmemory_sessions[key] = InMemoryTriviaSession(
                user_id=user_id,
                channel_id=channel_id,
            )
        return self._inmemory_sessions[key]

    async def check_frequency_limit(self, session: TriviaSession) -> bool:
        if not session.last_fact_shown_at:
            return True

        elapsed = (datetime.utcnow() - session.last_fact_shown_at).total_seconds()
        return elapsed >= self.min_interval_seconds
