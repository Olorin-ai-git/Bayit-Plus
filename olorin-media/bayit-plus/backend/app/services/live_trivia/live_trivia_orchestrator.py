"""Live Trivia Orchestrator - coordinates topic detection, search, and fact generation."""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from anthropic import AsyncAnthropic

from app.core.redis_client import get_redis_client
from app.core.config import settings
from app.models.live_trivia import LiveTriviaSession
from app.models.trivia import TriviaFactModel
from app.services.live_feature_quota_service import live_feature_quota_service
from app.services.live_trivia.fact_cache import FactCache
from app.services.live_trivia.fact_extractor import FactExtractionService
from app.services.live_trivia.fact_generation_pipeline import FactGenerationPipeline
from app.services.live_trivia.mention_tracker import MentionTracker
from app.services.live_trivia.session_manager import SessionManager
from app.services.live_trivia.session_validator import SessionValidator
from app.services.live_trivia.topic_detector import TopicDetectionService
from app.services.live_trivia.topic_tracker import TopicTracker
from app.services.live_trivia.web_search_service import WebSearchService

logger = logging.getLogger(__name__)


class LiveTriviaOrchestrator:
    """Orchestrates live trivia: topic detection, caching, session management."""

    def __init__(
        self,
        topic_detector: Optional[TopicDetectionService] = None,
        web_search: Optional[WebSearchService] = None,
        fact_extractor: Optional[FactExtractionService] = None,
        anthropic_client: Optional[AsyncAnthropic] = None,
    ):
        """Initialize orchestrator with optional dependency injection."""
        # Shared Anthropic client for all AI services
        self.anthropic_client = anthropic_client or AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Initialize services with shared client
        self.topic_detector = topic_detector or TopicDetectionService(self.anthropic_client)
        self.web_search = web_search or WebSearchService()
        self.fact_extractor = fact_extractor or FactExtractionService(self.anthropic_client)

        self.redis = None
        self._redis_initialized = False
        self.config = settings.olorin.live_trivia
        self.min_topic_mentions = self.config.min_topic_mentions
        self.fact_cache: Optional[FactCache] = None
        self.mention_tracker: Optional[MentionTracker] = None
        self.session_validator: Optional[SessionValidator] = None
        self.fact_pipeline: Optional[FactGenerationPipeline] = None
        self.session_manager = SessionManager(
            min_interval_seconds=self.config.min_interval_seconds,
            max_facts_per_session=self.config.max_facts_per_session
        )
        self.topic_tracker = TopicTracker(
            default_confidence=self.config.tracked_topic_default_confidence
        )

    async def _ensure_redis(self) -> None:
        """Ensure Redis client and helper managers are initialized."""
        if not self._redis_initialized:
            redis_client = await get_redis_client()
            # Access low-level Redis client for raw string operations
            self.redis = redis_client._client

            # Initialize helper managers with Redis client
            self.fact_cache = FactCache(
                redis_client=self.redis,
                cache_ttl_seconds=self.config.fact_cache_ttl_seconds
            )
            self.mention_tracker = MentionTracker(
                redis_client=self.redis,
                topic_cooldown_minutes=self.config.topic_cooldown_minutes,
                mention_ttl_seconds=self.config.mention_ttl_seconds
            )
            self.session_validator = SessionValidator(
                session_manager=self.session_manager,
                mention_tracker=self.mention_tracker,
                max_facts_per_session=self.config.max_facts_per_session,
                min_interval_seconds=self.config.min_interval_seconds
            )
            self.fact_pipeline = FactGenerationPipeline(
                web_search=self.web_search,
                fact_extractor=self.fact_extractor,
                fact_cache=self.fact_cache,
                topic_tracker=self.topic_tracker
            )

            self._redis_initialized = True

    async def close(self) -> None:
        """Close all service connections for cleanup."""
        if self.web_search:
            await self.web_search.close()

    async def process_transcript(
        self,
        transcript: str,
        channel_id: str,
        user_id: str,
        language: str = "en"
    ) -> List[TriviaFactModel]:
        """
        Process transcript chunk and generate trivia facts if appropriate.

        Args:
            transcript: Transcript text from live stream
            channel_id: LiveChannel ID
            user_id: User ID
            language: Language code (en, he)

        Returns:
            List of trivia facts to display (may be empty)
        """
        await self._ensure_redis()

        # Detect topics
        topics = await self.topic_detector.detect_topics(
            transcript, language, validate_with_ai=self.config.ner_provider == "hybrid"
        )
        if not topics:
            return []

        # Apply debouncing
        ready_topics = []
        for topic in topics:
            topic_hash = topic["topic_hash"]
            mention_count = await self.mention_tracker.increment_topic_mention(channel_id, topic_hash)
            if mention_count >= self.min_topic_mentions:
                ready_topics.append(topic)

        if not ready_topics:
            return []

        # Get session and process topics
        session = await self.session_manager.get_or_create_session(user_id, channel_id)
        return await self._process_ready_topics(ready_topics, user_id, channel_id, session)

    async def _process_ready_topics(
        self,
        ready_topics: List[Dict],
        user_id: str,
        channel_id: str,
        session: LiveTriviaSession
    ) -> List[TriviaFactModel]:
        """Process ready topics and generate facts for first valid one."""
        for topic in ready_topics:
            topic_hash = topic["topic_hash"]

            # Validate and check quota
            can_show, _ = await self.session_validator.validate_topic_for_user(
                topic_hash, topic["topic_text"], user_id, session
            )
            if not can_show:
                continue

            has_quota, _ = await self.session_validator.check_user_quota(user_id)
            if not has_quota:
                continue

            # Generate facts
            facts = await self._get_or_generate_facts(
                topic["topic_text"], topic["entity_type"], topic_hash, channel_id
            )
            if not facts:
                continue

            # Deduct quota and update session
            await self.session_validator.deduct_quota_and_set_cooldown(
                user_id, topic_hash, len(facts)
            )
            await LiveTriviaSession.get_motor_collection().update_one(
                {"_id": session.id},
                {
                    "$addToSet": {"shown_topics": topic_hash},
                    "$push": {"shown_fact_ids": {"$each": [f.fact_id for f in facts], "$slice": -100}},
                    "$set": {"last_fact_shown_at": datetime.utcnow()}
                }
            )
            return facts

        return []

    async def _get_or_generate_facts(
        self, topic_text: str, entity_type: str, topic_hash: str, channel_id: str
    ) -> List[TriviaFactModel]:
        """Get facts from cache or generate new ones."""
        facts = await self.fact_cache.get_cached_facts(topic_hash)
        if facts:
            return facts
        return await self.fact_pipeline.generate_facts(
            topic_text, entity_type, topic_hash, channel_id
        )
