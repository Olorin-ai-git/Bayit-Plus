"""
Integration tests for LiveTriviaOrchestrator

Tests the full pipeline: transcript → topic → search → fact → cache → delivery
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch

from app.services.live_trivia.live_trivia_orchestrator import LiveTriviaOrchestrator
from app.models.trivia import TriviaFactModel


@pytest.fixture
async def orchestrator():
    """Create LiveTriviaOrchestrator instance with mocked dependencies."""
    with patch("app.services.live_trivia.live_trivia_orchestrator.get_redis_client"):
        orch = LiveTriviaOrchestrator()

        # Mock Redis
        orch.redis = AsyncMock()
        orch._redis_initialized = True

        # Mock services
        orch.topic_detector = AsyncMock()
        orch.web_search = AsyncMock()
        orch.fact_extractor = AsyncMock()

        yield orch


class TestFullPipeline:
    """Test complete pipeline from transcript to facts."""

    @pytest.mark.asyncio
    async def test_pipeline_end_to_end(self, orchestrator):
        """Test full pipeline: transcript → topic → search → fact → cache."""
        # Mock topic detection
        orchestrator.topic_detector.detect_topics = AsyncMock(return_value=[
            {
                "topic_text": "Putin",
                "entity_type": "person",
                "confidence_score": 0.9,
                "topic_hash": "hash123",
                "is_validated": True
            }
        ])

        # Mock web search
        orchestrator.web_search.search = AsyncMock(return_value={
            "title": "Vladimir Putin",
            "summary": "President of Russia...",
            "url": "https://en.wikipedia.org/wiki/Vladimir_Putin",
            "source": "wikipedia"
        })

        # Mock fact extraction
        mock_fact = TriviaFactModel(
            text="פוטין הוא נשיא רוסיה",
            text_en="Putin is the President of Russia",
            text_es="Putin es el presidente de Rusia",
            category="historical",
            trigger_type="topic",
            source="live_ai",
            detected_topic="Putin",
            topic_type="person"
        )
        orchestrator.fact_extractor.extract_facts = AsyncMock(return_value=[mock_fact])
        orchestrator.fact_extractor.validate_fact_quality = Mock(return_value=True)

        # Mock Redis cache miss
        orchestrator.redis.get = AsyncMock(return_value=None)
        orchestrator.redis.setex = AsyncMock()

        # Mock database
        with patch("app.services.live_trivia.live_trivia_orchestrator.LiveTriviaSession") as MockSession:
            mock_session = MockSession.find_one.return_value = AsyncMock()
            mock_session.user_id = "user123"
            mock_session.channel_id = "kan11"
            mock_session.shown_fact_ids = []
            mock_session.shown_topics = []
            mock_session.last_fact_shown_at = None
            mock_session.is_topic_shown_recently = Mock(return_value=False)
            mock_session.add_shown_topic = Mock()
            mock_session.add_shown_fact = Mock()
            mock_session.save = AsyncMock()

            MockSession.find_one.return_value = mock_session

            # First call - only 1 mention (debouncing blocks)
            facts = await orchestrator.process_transcript(
                "Putin announced today",
                "kan11",
                "user123",
                "en"
            )

            assert len(facts) == 0  # Debouncing: need 2+ mentions

            # Second call - 2nd mention (should generate fact)
            facts = await orchestrator.process_transcript(
                "Putin said something",
                "kan11",
                "user123",
                "en"
            )

            assert len(facts) == 1
            assert facts[0].text_en == "Putin is the President of Russia"
            assert facts[0].detected_topic == "Putin"

            # Verify cache was updated
            orchestrator.redis.setex.assert_called_once()

            # Verify session was updated
            mock_session.add_shown_topic.assert_called_once()
            mock_session.add_shown_fact.assert_called_once()
            mock_session.save.assert_called()


class TestDebouncing:
    """Test topic debouncing (require 2+ mentions)."""

    @pytest.mark.asyncio
    async def test_debouncing_single_mention(self, orchestrator):
        """Test that single mention doesn't trigger fact generation."""
        orchestrator.topic_detector.detect_topics = AsyncMock(return_value=[
            {
                "topic_text": "Ukraine",
                "entity_type": "place",
                "confidence_score": 0.8,
                "topic_hash": "hash_ukraine",
                "is_validated": True
            }
        ])

        with patch("app.services.live_trivia.live_trivia_orchestrator.LiveTriviaSession"):
            facts = await orchestrator.process_transcript(
                "Ukraine news today",
                "kan11",
                "user123",
                "en"
            )

            # Should return empty (debouncing)
            assert len(facts) == 0

            # web_search should not be called
            orchestrator.web_search.search.assert_not_called()

    @pytest.mark.asyncio
    async def test_debouncing_two_mentions(self, orchestrator):
        """Test that 2 mentions trigger fact generation."""
        orchestrator.topic_detector.detect_topics = AsyncMock(return_value=[
            {
                "topic_text": "Ukraine",
                "entity_type": "place",
                "confidence_score": 0.8,
                "topic_hash": "hash_ukraine",
                "is_validated": True
            }
        ])

        orchestrator.web_search.search = AsyncMock(return_value={
            "title": "Ukraine",
            "summary": "Country in Eastern Europe...",
            "url": "https://en.wikipedia.org/wiki/Ukraine",
            "source": "wikipedia"
        })

        mock_fact = TriviaFactModel(
            text="אוקראינה היא מדינה במזרח אירופה",
            text_en="Ukraine is a country in Eastern Europe",
            text_es="Ucrania es un país en Europa del Este",
            category="historical",
            trigger_type="topic",
            source="live_ai"
        )
        orchestrator.fact_extractor.extract_facts = AsyncMock(return_value=[mock_fact])
        orchestrator.fact_extractor.validate_fact_quality = Mock(return_value=True)

        orchestrator.redis.get = AsyncMock(return_value=None)
        orchestrator.redis.setex = AsyncMock()

        with patch("app.services.live_trivia.live_trivia_orchestrator.LiveTriviaSession") as MockSession:
            mock_session = AsyncMock()
            mock_session.shown_fact_ids = []
            mock_session.last_fact_shown_at = None
            mock_session.is_topic_shown_recently = Mock(return_value=False)
            mock_session.add_shown_topic = Mock()
            mock_session.add_shown_fact = Mock()
            mock_session.save = AsyncMock()

            MockSession.find_one.return_value = mock_session

            # First mention
            await orchestrator.process_transcript(
                "Ukraine news",
                "kan11",
                "user123",
                "en"
            )

            # Second mention - should generate facts
            facts = await orchestrator.process_transcript(
                "Ukraine war continues",
                "kan11",
                "user123",
                "en"
            )

            assert len(facts) == 1
            orchestrator.web_search.search.assert_called_once()


class TestCaching:
    """Test Redis caching behavior."""

    @pytest.mark.asyncio
    async def test_cache_hit(self, orchestrator):
        """Test that cached facts are returned without web search."""
        orchestrator.topic_detector.detect_topics = AsyncMock(return_value=[
            {
                "topic_text": "Putin",
                "entity_type": "person",
                "confidence_score": 0.9,
                "topic_hash": "hash_putin",
                "is_validated": True
            }
        ])

        # Mock cached facts
        import json
        cached_fact = TriviaFactModel(
            text="עובדה מטמון",
            text_en="Cached fact",
            text_es="Hecho en caché",
            category="historical",
            trigger_type="topic",
            source="live_ai"
        )
        cached_data = json.dumps([cached_fact.model_dump()])

        orchestrator.redis.get = AsyncMock(return_value=cached_data)

        with patch("app.services.live_trivia.live_trivia_orchestrator.LiveTriviaSession") as MockSession:
            mock_session = AsyncMock()
            mock_session.shown_fact_ids = []
            mock_session.last_fact_shown_at = None
            mock_session.is_topic_shown_recently = Mock(return_value=False)
            mock_session.add_shown_topic = Mock()
            mock_session.add_shown_fact = Mock()
            mock_session.save = AsyncMock()

            MockSession.find_one.return_value = mock_session

            # Trigger topic twice (debouncing)
            await orchestrator.process_transcript("Putin news", "kan11", "user123", "en")
            facts = await orchestrator.process_transcript("Putin today", "kan11", "user123", "en")

            assert len(facts) == 1
            assert facts[0].text_en == "Cached fact"

            # web_search should NOT be called (cache hit)
            orchestrator.web_search.search.assert_not_called()

    @pytest.mark.asyncio
    async def test_cache_miss(self, orchestrator):
        """Test that cache miss triggers web search and caching."""
        orchestrator.topic_detector.detect_topics = AsyncMock(return_value=[
            {
                "topic_text": "Biden",
                "entity_type": "person",
                "confidence_score": 0.9,
                "topic_hash": "hash_biden",
                "is_validated": True
            }
        ])

        # Cache miss
        orchestrator.redis.get = AsyncMock(return_value=None)
        orchestrator.redis.setex = AsyncMock()

        # Mock search and extraction
        orchestrator.web_search.search = AsyncMock(return_value={
            "title": "Joe Biden",
            "summary": "President of USA...",
            "url": "https://en.wikipedia.org/wiki/Joe_Biden",
            "source": "wikipedia"
        })

        mock_fact = TriviaFactModel(
            text="ביידן הוא נשיא ארה\"ב",
            text_en="Biden is the President of USA",
            text_es="Biden es el presidente de EE.UU.",
            category="historical",
            trigger_type="topic",
            source="live_ai"
        )
        orchestrator.fact_extractor.extract_facts = AsyncMock(return_value=[mock_fact])
        orchestrator.fact_extractor.validate_fact_quality = Mock(return_value=True)

        with patch("app.services.live_trivia.live_trivia_orchestrator.LiveTriviaSession") as MockSession, \
             patch("app.services.live_trivia.live_trivia_orchestrator.LiveTriviaTopic"):
            mock_session = AsyncMock()
            mock_session.shown_fact_ids = []
            mock_session.last_fact_shown_at = None
            mock_session.is_topic_shown_recently = Mock(return_value=False)
            mock_session.add_shown_topic = Mock()
            mock_session.add_shown_fact = Mock()
            mock_session.save = AsyncMock()

            MockSession.find_one.return_value = mock_session

            # Trigger twice
            await orchestrator.process_transcript("Biden speech", "kan11", "user123", "en")
            facts = await orchestrator.process_transcript("Biden announces", "kan11", "user123", "en")

            assert len(facts) == 1

            # Should call web_search (cache miss)
            orchestrator.web_search.search.assert_called_once()

            # Should cache the result
            orchestrator.redis.setex.assert_called_once()


class TestFrequencyLimits:
    """Test frequency limits (30s minimum between facts)."""

    @pytest.mark.asyncio
    async def test_frequency_limit_blocks(self, orchestrator):
        """Test that frequency limit blocks facts within 30 seconds."""
        orchestrator.topic_detector.detect_topics = AsyncMock(return_value=[
            {
                "topic_text": "Topic1",
                "entity_type": "person",
                "confidence_score": 0.9,
                "topic_hash": "hash1",
                "is_validated": True
            }
        ])

        orchestrator.redis.get = AsyncMock(return_value=None)

        with patch("app.services.live_trivia.live_trivia_orchestrator.LiveTriviaSession") as MockSession:
            mock_session = AsyncMock()
            mock_session.shown_fact_ids = []
            mock_session.shown_topics = []
            # Set last fact shown 10 seconds ago
            mock_session.last_fact_shown_at = datetime.utcnow() - timedelta(seconds=10)
            mock_session.is_topic_shown_recently = Mock(return_value=False)

            MockSession.find_one.return_value = mock_session

            # Trigger twice (pass debouncing)
            await orchestrator.process_transcript("Topic1 news", "kan11", "user123", "en")
            facts = await orchestrator.process_transcript("Topic1 update", "kan11", "user123", "en")

            # Should be blocked by frequency limit
            assert len(facts) == 0

    @pytest.mark.asyncio
    async def test_frequency_limit_passes_after_30s(self, orchestrator):
        """Test that frequency limit passes after 30 seconds."""
        orchestrator.topic_detector.detect_topics = AsyncMock(return_value=[
            {
                "topic_text": "Topic2",
                "entity_type": "person",
                "confidence_score": 0.9,
                "topic_hash": "hash2",
                "is_validated": True
            }
        ])

        orchestrator.redis.get = AsyncMock(return_value=None)
        orchestrator.redis.setex = AsyncMock()

        orchestrator.web_search.search = AsyncMock(return_value={
            "title": "Topic2",
            "summary": "Summary...",
            "url": "http://test.com",
            "source": "wikipedia"
        })

        mock_fact = TriviaFactModel(
            text="עובדה",
            text_en="Fact",
            text_es="Hecho",
            category="historical",
            trigger_type="topic",
            source="live_ai"
        )
        orchestrator.fact_extractor.extract_facts = AsyncMock(return_value=[mock_fact])
        orchestrator.fact_extractor.validate_fact_quality = Mock(return_value=True)

        with patch("app.services.live_trivia.live_trivia_orchestrator.LiveTriviaSession") as MockSession, \
             patch("app.services.live_trivia.live_trivia_orchestrator.LiveTriviaTopic"):
            mock_session = AsyncMock()
            mock_session.shown_fact_ids = []
            mock_session.shown_topics = []
            # Set last fact shown 31 seconds ago (past frequency limit)
            mock_session.last_fact_shown_at = datetime.utcnow() - timedelta(seconds=31)
            mock_session.is_topic_shown_recently = Mock(return_value=False)
            mock_session.add_shown_topic = Mock()
            mock_session.add_shown_fact = Mock()
            mock_session.save = AsyncMock()

            MockSession.find_one.return_value = mock_session

            # Trigger twice
            await orchestrator.process_transcript("Topic2 news", "kan11", "user123", "en")
            facts = await orchestrator.process_transcript("Topic2 update", "kan11", "user123", "en")

            # Should pass frequency limit
            assert len(facts) == 1


class TestTopicCooldown:
    """Test topic cooldown (15 minutes)."""

    @pytest.mark.asyncio
    async def test_topic_cooldown_blocks(self, orchestrator):
        """Test that topic cooldown blocks same topic within 15 minutes."""
        orchestrator.topic_detector.detect_topics = AsyncMock(return_value=[
            {
                "topic_text": "Putin",
                "entity_type": "person",
                "confidence_score": 0.9,
                "topic_hash": "hash_putin",
                "is_validated": True
            }
        ])

        # Topic is in cooldown
        orchestrator.redis.get = AsyncMock(side_effect=lambda key: "1" if "cooldown" in key else None)

        with patch("app.services.live_trivia.live_trivia_orchestrator.LiveTriviaSession") as MockSession:
            mock_session = AsyncMock()
            mock_session.shown_fact_ids = []
            mock_session.shown_topics = ["hash_putin"]  # Topic already shown
            mock_session.last_fact_shown_at = datetime.utcnow() - timedelta(seconds=60)
            mock_session.is_topic_shown_recently = Mock(return_value=True)

            MockSession.find_one.return_value = mock_session

            # Trigger twice
            await orchestrator.process_transcript("Putin news", "kan11", "user123", "en")
            facts = await orchestrator.process_transcript("Putin today", "kan11", "user123", "en")

            # Should be blocked by cooldown
            assert len(facts) == 0
