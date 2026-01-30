"""
Unit tests for FactExtractionService

Tests Claude AI fact extraction and quality validation.
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch

from app.services.live_trivia.fact_extractor import FactExtractionService
from app.models.trivia import TriviaFactModel


@pytest.fixture
def fact_extractor():
    """Create FactExtractionService instance."""
    with patch("app.services.live_trivia.fact_extractor.Anthropic"):
        return FactExtractionService()


class TestExtractFacts:
    """Test fact extraction from search results."""

    @pytest.mark.asyncio
    async def test_extract_facts_success(self, fact_extractor):
        """Test successful fact extraction."""
        search_result = {
            "title": "Vladimir Putin",
            "summary": "Putin is the President of Russia since 2000...",
            "url": "https://en.wikipedia.org/wiki/Vladimir_Putin",
            "source": "wikipedia"
        }

        # Mock Claude response
        mock_message = Mock()
        mock_message.content = [Mock()]
        mock_message.content[0].text = '''[
            {
                "text_he": "פוטין שימש כנשיא רוסיה מאז 2000",
                "text_en": "Putin has served as President of Russia since 2000",
                "text_es": "Putin ha sido presidente de Rusia desde 2000",
                "category": "historical",
                "priority": 8
            },
            {
                "text_he": "פוטין היה סוכן KGB לשעבר",
                "text_en": "Putin is a former KGB agent",
                "text_es": "Putin es un ex agente del KGB",
                "category": "historical",
                "priority": 7
            }
        ]'''

        fact_extractor.anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        facts = await fact_extractor.extract_facts(
            "Vladimir Putin",
            "person",
            search_result
        )

        assert len(facts) == 2
        assert isinstance(facts[0], TriviaFactModel)
        assert facts[0].trigger_type == "topic"
        assert facts[0].source == "live_ai"
        assert facts[0].detected_topic == "Vladimir Putin"
        assert facts[0].topic_type == "person"
        assert len(facts[0].text_en) > 0
        assert len(facts[0].text_he) > 0
        assert len(facts[0].text_es) > 0

    @pytest.mark.asyncio
    async def test_extract_facts_max_three(self, fact_extractor):
        """Test that maximum 3 facts are returned."""
        search_result = {
            "summary": "Long summary with lots of info...",
            "url": "http://test.com",
            "source": "wikipedia"
        }

        # Mock Claude returning 5 facts
        mock_message = Mock()
        mock_message.content = [Mock()]
        facts_data = [
            {
                "text_he": f"עובדה {i}",
                "text_en": f"Fact {i}",
                "text_es": f"Hecho {i}",
                "category": "historical",
                "priority": 5
            }
            for i in range(5)
        ]
        mock_message.content[0].text = str(facts_data).replace("'", '"')

        fact_extractor.anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        facts = await fact_extractor.extract_facts("Test", "person", search_result)

        # Should only return 3 facts
        assert len(facts) == 3

    @pytest.mark.asyncio
    async def test_extract_facts_truncate_long_text(self, fact_extractor):
        """Test that facts over 150 chars are truncated."""
        search_result = {
            "summary": "Test summary",
            "url": "http://test.com",
            "source": "wikipedia"
        }

        long_text = "A" * 200

        mock_message = Mock()
        mock_message.content = [Mock()]
        mock_message.content[0].text = f'''[{{
            "text_he": "{long_text}",
            "text_en": "{long_text}",
            "text_es": "{long_text}",
            "category": "historical",
            "priority": 5
        }}]'''

        fact_extractor.anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        facts = await fact_extractor.extract_facts("Test", "person", search_result)

        assert len(facts) == 1
        assert len(facts[0].text) == 150  # Truncated to 147 + "..."
        assert facts[0].text.endswith("...")

    @pytest.mark.asyncio
    async def test_extract_facts_empty_summary(self, fact_extractor):
        """Test behavior with empty summary."""
        search_result = {
            "summary": "",
            "url": "http://test.com",
            "source": "wikipedia"
        }

        facts = await fact_extractor.extract_facts("Test", "person", search_result)

        assert facts == []

    @pytest.mark.asyncio
    async def test_extract_facts_api_error(self, fact_extractor):
        """Test handling of API errors."""
        search_result = {
            "summary": "Test summary",
            "url": "http://test.com",
            "source": "wikipedia"
        }

        fact_extractor.anthropic_client.messages.create = AsyncMock(
            side_effect=Exception("API error")
        )

        facts = await fact_extractor.extract_facts("Test", "person", search_result)

        assert facts == []

    @pytest.mark.asyncio
    async def test_extract_facts_invalid_json(self, fact_extractor):
        """Test handling of invalid JSON response."""
        search_result = {
            "summary": "Test summary",
            "url": "http://test.com",
            "source": "wikipedia"
        }

        mock_message = Mock()
        mock_message.content = [Mock()]
        mock_message.content[0].text = "Not valid JSON"

        fact_extractor.anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        facts = await fact_extractor.extract_facts("Test", "person", search_result)

        assert facts == []

    @pytest.mark.asyncio
    async def test_extract_facts_handles_markdown_code_blocks(self, fact_extractor):
        """Test extraction from markdown code blocks."""
        search_result = {
            "summary": "Test summary",
            "url": "http://test.com",
            "source": "wikipedia"
        }

        mock_message = Mock()
        mock_message.content = [Mock()]
        mock_message.content[0].text = '''```json
        [{
            "text_he": "עובדה",
            "text_en": "Fact",
            "text_es": "Hecho",
            "category": "historical",
            "priority": 5
        }]
        ```'''

        fact_extractor.anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        facts = await fact_extractor.extract_facts("Test", "person", search_result)

        assert len(facts) == 1
        assert facts[0].text_en == "Fact"


class TestValidateFactQuality:
    """Test fact quality validation."""

    def test_validate_fact_quality_valid(self, fact_extractor):
        """Test validation of valid fact."""
        fact = TriviaFactModel(
            text="עובדה מעניינת על הנושא",
            text_en="Interesting fact about the topic",
            text_es="Hecho interesante sobre el tema",
            category="historical",
            trigger_type="topic",
            source="live_ai"
        )

        assert fact_extractor.validate_fact_quality(fact) is True

    def test_validate_fact_quality_missing_text(self, fact_extractor):
        """Test validation fails for missing text."""
        fact = TriviaFactModel(
            text="",
            text_en="English text",
            text_es="Spanish text",
            category="historical",
            trigger_type="topic",
            source="live_ai"
        )

        assert fact_extractor.validate_fact_quality(fact) is False

    def test_validate_fact_quality_too_long(self, fact_extractor):
        """Test validation fails for text over 150 chars."""
        long_text = "A" * 151

        fact = TriviaFactModel(
            text=long_text,
            text_en="English",
            text_es="Spanish",
            category="historical",
            trigger_type="topic",
            source="live_ai"
        )

        assert fact_extractor.validate_fact_quality(fact) is False

    def test_validate_fact_quality_too_short(self, fact_extractor):
        """Test validation fails for text under 20 chars."""
        fact = TriviaFactModel(
            text="Short",
            text_en="Too short",
            text_es="Corto",
            category="historical",
            trigger_type="topic",
            source="live_ai"
        )

        assert fact_extractor.validate_fact_quality(fact) is False

    def test_validate_fact_quality_placeholder_text(self, fact_extractor):
        """Test validation fails for placeholder text."""
        fact = TriviaFactModel(
            text="This is a TODO placeholder text",
            text_en="This needs to be filled in [later]",
            text_es="N/A - not available yet",
            category="historical",
            trigger_type="topic",
            source="live_ai"
        )

        assert fact_extractor.validate_fact_quality(fact) is False

    def test_validate_fact_quality_ellipsis(self, fact_extractor):
        """Test validation fails for incomplete text with ellipsis."""
        fact = TriviaFactModel(
            text="This is an incomplete fact...",
            text_en="English text here...",
            text_es="Spanish text here...",
            category="historical",
            trigger_type="topic",
            source="live_ai"
        )

        assert fact_extractor.validate_fact_quality(fact) is False
