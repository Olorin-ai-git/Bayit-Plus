"""
Session Validator

Validates user session constraints for live trivia (frequency, cooldown, quotas).
"""

import logging
from typing import Optional, Tuple

from app.models.live_trivia import LiveTriviaSession
from app.services.live_feature_quota_service import live_feature_quota_service
from app.services.live_trivia.mention_tracker import MentionTracker
from app.services.live_trivia.session_manager import SessionManager

logger = logging.getLogger(__name__)


class SessionValidator:
    """Validates session constraints for showing trivia facts."""

    def __init__(
        self,
        session_manager: SessionManager,
        mention_tracker: MentionTracker,
        max_facts_per_session: int,
        min_interval_seconds: int
    ):
        """
        Initialize session validator.

        Args:
            session_manager: Session manager instance
            mention_tracker: Mention tracker instance
            max_facts_per_session: Maximum facts per session
            min_interval_seconds: Minimum seconds between facts
        """
        self.session_manager = session_manager
        self.mention_tracker = mention_tracker
        self.max_facts_per_session = max_facts_per_session
        self.min_interval_seconds = min_interval_seconds

    async def validate_topic_for_user(
        self,
        topic_hash: str,
        topic_text: str,
        user_id: str,
        session: LiveTriviaSession
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate if topic can be shown to user.

        Args:
            topic_hash: Topic hash
            topic_text: Topic text (for logging)
            user_id: User ID
            session: User session

        Returns:
            (can_show, reason) tuple - reason is None if can show, error message otherwise
        """
        # Check topic cooldown (15 minutes)
        if session.is_topic_shown_recently(topic_hash):
            cooldown_active = await self.mention_tracker.check_topic_cooldown(
                user_id,
                topic_hash
            )
            if cooldown_active:
                return False, f"Topic cooldown active for '{topic_text}'"

        # Check frequency limit (30s minimum between facts)
        if not await self.session_manager.check_frequency_limit(session):
            return False, f"Frequency limit active (min interval: {self.min_interval_seconds}s)"

        # Check session fact limit
        if len(session.shown_fact_ids) >= self.max_facts_per_session:
            return False, f"Session fact limit reached (max: {self.max_facts_per_session})"

        return True, None

    async def check_user_quota(self, user_id: str) -> Tuple[bool, Optional[str]]:
        """
        Check if user has remaining trivia quota.

        Args:
            user_id: User ID

        Returns:
            (has_quota, error_message) tuple
        """
        try:
            has_quota = await live_feature_quota_service.check_trivia_quota(user_id)
            if not has_quota:
                return False, "User has exceeded trivia quota"
            return True, None
        except Exception as e:
            logger.error(f"Error checking trivia quota for user {user_id}: {e}")
            return False, "Error checking quota"

    async def deduct_quota_and_set_cooldown(
        self,
        user_id: str,
        topic_hash: str,
        facts_count: int
    ) -> None:
        """
        Deduct quota and set topic cooldown after showing facts.

        Args:
            user_id: User ID
            topic_hash: Topic hash
            facts_count: Number of facts shown
        """
        try:
            # Deduct quota
            await live_feature_quota_service.deduct_trivia_quota(user_id, facts_count)

            # Set cooldown
            await self.mention_tracker.set_topic_cooldown(user_id, topic_hash)

        except Exception as e:
            logger.error(f"Error deducting quota/setting cooldown for user {user_id}: {e}")
