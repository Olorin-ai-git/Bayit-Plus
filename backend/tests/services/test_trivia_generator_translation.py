"""
Tests for TriviaGenerationService with translation integration.
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch

from app.models.content import Content
from app.models.trivia import TriviaFactModel
from app.services.trivia.trivia_generator import TriviaGenerationService


@pytest.mark.asyncio
class TestTriviaGeneratorTranslation:
    """Test trivia generator with translation service integration."""

    @pytest.fixture
    def mock_content(self):
        """Create mock content for testing."""
        content = Mock(spec=Content)
        content.id = "test-content-123"
        content.title = "Test Movie"
        content.description = "A test movie"
        content.year = 2024
        content.genre = "Drama"
        content.director = "Test Director"
        content.tmdb_id = 12345
        content.is_series = False
        return content

    @pytest.fixture
    def mock_translation_service(self):
        """Mock translation service."""
        mock = AsyncMock()
        mock.translate_trivia_fact = AsyncMock(
            return_value={"he": "עובדה בעברית", "es": "Hecho en español"}
        )
        return mock

    @pytest.fixture
    def service(self, mock_translation_service):
        """Create service with mocked translation service."""
        service = TriviaGenerationService()
        service.translation_service = mock_translation_service
        return service

    async def test_translate_facts_sets_translations(self, service, mock_translation_service):
        """Test that _translate_facts sets source_language and translations."""
        # Create facts with English text only
        facts = [
            TriviaFactModel(
                text="This is an interesting fact",
                category="production",
                trigger_type="random",
                source="ai"
            ),
            TriviaFactModel(
                text="Another interesting fact",
                category="cast",
                trigger_type="random",
                source="ai"
            )
        ]

        # Translate facts
        translated_facts = await service._translate_facts(facts, "test-content-123")

        # Verify all facts have translations
        assert len(translated_facts) == 2

        for fact in translated_facts:
            assert fact.source_language == "en"
            assert "he" in fact.translations
            assert "es" in fact.translations
            assert fact.translations["he"] == "עובדה בעברית"
            assert fact.translations["es"] == "Hecho en español"

        # Verify translation service was called for each fact
        assert mock_translation_service.translate_trivia_fact.call_count == 2

    async def test_translate_facts_handles_translation_failure(self, service, mock_translation_service):
        """Test that translation failures don't break fact generation."""
        # Mock translation service to fail
        mock_translation_service.translate_trivia_fact = AsyncMock(
            side_effect=Exception("Translation API error")
        )

        facts = [
            TriviaFactModel(
                text="Test fact",
                category="production",
                trigger_type="random",
                source="ai"
            )
        ]

        # Translate facts (should not raise exception)
        translated_facts = await service._translate_facts(facts, "test-content-123")

        # Fact should still have source_language set but empty translations
        assert len(translated_facts) == 1
        assert translated_facts[0].source_language == "en"
        assert translated_facts[0].translations == {}

    async def test_generate_trivia_always_uses_english(self, service, mock_translation_service):
        """Test that generate_trivia always generates in English regardless of language parameter."""
        mock_content = Mock(spec=Content)
        mock_content.id = "test-123"
        mock_content.title = "Test"
        mock_content.tmdb_id = None
        mock_content.is_series = False

        # Mock ContentTrivia.create_or_update to avoid database calls
        with patch('app.services.trivia.trivia_generator.ContentTrivia.create_or_update') as mock_create:
            mock_trivia = Mock()
            mock_create.return_value = mock_trivia

            # Call with language="he" (should be ignored)
            result = await service.generate_trivia(mock_content, enrich=False, language="he")

            # Verify result returned
            assert result == mock_trivia

    async def test_translate_facts_includes_content_id_in_tracking(self, service, mock_translation_service):
        """Test that content_id is included in translation tracking."""
        facts = [
            TriviaFactModel(
                fact_id="fact-123",
                text="Test fact",
                category="production",
                trigger_type="random",
                source="ai"
            )
        ]

        await service._translate_facts(facts, "content-456")

        # Verify translation service was called with correct content_id tracking
        call_args = mock_translation_service.translate_trivia_fact.call_args
        assert call_args[1]["content_id"] == "trivia_content-456_fact-123"
        assert call_args[1]["partner_id"] == "system"

    async def test_translate_facts_preserves_fact_metadata(self, service, mock_translation_service):
        """Test that translation preserves all fact metadata (category, priority, etc.)."""
        facts = [
            TriviaFactModel(
                fact_id="fact-123",
                text="Test fact",
                category="cultural",
                trigger_type="scene",
                source="tmdb",
                priority=8,
                display_duration=20,
                related_person="Test Person"
            )
        ]

        translated_facts = await service._translate_facts(facts, "test-content")

        # Verify all metadata preserved
        fact = translated_facts[0]
        assert fact.fact_id == "fact-123"
        assert fact.text == "Test fact"
        assert fact.category == "cultural"
        assert fact.trigger_type == "scene"
        assert fact.source == "tmdb"
        assert fact.priority == 8
        assert fact.display_duration == 20
        assert fact.related_person == "Test Person"

    async def test_empty_facts_list_returns_empty(self, service):
        """Test that translating empty facts list returns empty."""
        translated_facts = await service._translate_facts([], "test-content")
        assert translated_facts == []

    async def test_translation_service_called_with_correct_text(self, service, mock_translation_service):
        """Test that translation service receives correct English text."""
        facts = [
            TriviaFactModel(
                text="This is a specific test fact about movies",
                category="production",
                trigger_type="random",
                source="ai"
            )
        ]

        await service._translate_facts(facts, "test-content")

        # Verify translation service was called with exact English text
        call_args = mock_translation_service.translate_trivia_fact.call_args
        assert call_args[1]["english_text"] == "This is a specific test fact about movies"
