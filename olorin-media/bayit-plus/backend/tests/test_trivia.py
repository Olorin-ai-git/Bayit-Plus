"""
Tests for trivia functionality.
Covers model validation, generation service, and API routes.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from pydantic import ValidationError


class TestTriviaFactModel:
    """Tests for TriviaFactModel validation."""

    def test_valid_trivia_fact(self):
        """Test creating a valid trivia fact."""
        from app.models.trivia import TriviaFactModel

        fact = TriviaFactModel(
            fact_id=str(uuid4()),
            text="דני דבורה מגלם את הדמות אבי",
            text_en="Danny Dvora plays Avi",
            text_es="Danny Dvora interpreta a Avi",
            category="cast",
            source="tmdb",
            trigger_type="random",
            priority=7,
        )

        assert fact.text == "דני דבורה מגלם את הדמות אבי"
        assert fact.category == "cast"
        assert fact.source == "tmdb"
        assert fact.priority == 7

    def test_trivia_fact_empty_text_fails(self):
        """Test that empty text fields are rejected."""
        from app.models.trivia import TriviaFactModel

        with pytest.raises(ValidationError):
            TriviaFactModel(
                fact_id=str(uuid4()),
                text="",
                text_en="English text",
                text_es="Spanish text",
                category="cast",
            )

    def test_trivia_fact_whitespace_text_fails(self):
        """Test that whitespace-only text fields are rejected."""
        from app.models.trivia import TriviaFactModel

        with pytest.raises(ValidationError):
            TriviaFactModel(
                fact_id=str(uuid4()),
                text="   ",
                text_en="English text",
                text_es="Spanish text",
                category="cast",
            )

    def test_trivia_fact_invalid_category_fails(self):
        """Test that invalid categories are rejected."""
        from app.models.trivia import TriviaFactModel

        with pytest.raises(ValidationError):
            TriviaFactModel(
                fact_id=str(uuid4()),
                text="Some text",
                text_en="English text",
                text_es="Spanish text",
                category="invalid_category",
            )

    def test_trivia_fact_invalid_trigger_type_fails(self):
        """Test that invalid trigger types are rejected."""
        from app.models.trivia import TriviaFactModel

        with pytest.raises(ValidationError):
            TriviaFactModel(
                fact_id=str(uuid4()),
                text="Some text",
                text_en="English text",
                text_es="Spanish text",
                category="cast",
                trigger_type="invalid_type",
            )

    def test_trivia_fact_priority_bounds(self):
        """Test priority value bounds."""
        from app.models.trivia import TriviaFactModel

        # Valid priority at bounds
        fact_low = TriviaFactModel(
            text="Text",
            text_en="English",
            text_es="Spanish",
            category="cast",
            priority=1,
        )
        assert fact_low.priority == 1

        fact_high = TriviaFactModel(
            text="Text",
            text_en="English",
            text_es="Spanish",
            category="cast",
            priority=10,
        )
        assert fact_high.priority == 10

        # Invalid priority below minimum
        with pytest.raises(ValidationError):
            TriviaFactModel(
                text="Text",
                text_en="English",
                text_es="Spanish",
                category="cast",
                priority=0,
            )

        # Invalid priority above maximum
        with pytest.raises(ValidationError):
            TriviaFactModel(
                text="Text",
                text_en="English",
                text_es="Spanish",
                category="cast",
                priority=11,
            )


class TestTriviaPreferencesRequest:
    """Tests for TriviaPreferencesRequest validation."""

    def test_valid_preferences(self):
        """Test creating valid trivia preferences."""
        from app.models.trivia import TriviaPreferencesRequest

        prefs = TriviaPreferencesRequest(
            enabled=True,
            frequency="normal",
            categories=["cast", "production"],
            display_duration=10,
        )

        assert prefs.enabled is True
        assert prefs.frequency == "normal"
        assert "cast" in prefs.categories

    def test_invalid_frequency_fails(self):
        """Test that invalid frequencies are rejected."""
        from app.models.trivia import TriviaPreferencesRequest

        with pytest.raises(ValidationError):
            TriviaPreferencesRequest(
                enabled=True,
                frequency="invalid",
                categories=["cast"],
            )

    def test_invalid_category_fails(self):
        """Test that invalid categories are rejected."""
        from app.models.trivia import TriviaPreferencesRequest

        with pytest.raises(ValidationError):
            TriviaPreferencesRequest(
                enabled=True,
                frequency="normal",
                categories=["invalid_category"],
            )

    def test_display_duration_bounds(self):
        """Test display duration bounds."""
        from app.models.trivia import TriviaPreferencesRequest

        # Valid at bounds
        prefs_min = TriviaPreferencesRequest(
            enabled=True,
            frequency="normal",
            categories=["cast"],
            display_duration=5,
        )
        assert prefs_min.display_duration == 5

        prefs_max = TriviaPreferencesRequest(
            enabled=True,
            frequency="normal",
            categories=["cast"],
            display_duration=30,
        )
        assert prefs_max.display_duration == 30

        # Invalid below minimum
        with pytest.raises(ValidationError):
            TriviaPreferencesRequest(
                enabled=True,
                frequency="normal",
                categories=["cast"],
                display_duration=4,
            )


class TestSecurityUtils:
    """Tests for security utilities."""

    def test_validate_object_id_valid(self):
        """Test validation of valid ObjectId."""
        from app.services.security_utils import validate_object_id
        from bson import ObjectId

        valid_id = str(ObjectId())
        result = validate_object_id(valid_id)
        assert result == valid_id

    def test_validate_object_id_invalid(self):
        """Test validation of invalid ObjectId."""
        from app.services.security_utils import validate_object_id
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            validate_object_id("not-a-valid-id")

        assert exc_info.value.status_code == 400
        assert "Invalid content ID format" in str(exc_info.value.detail)

    def test_sanitize_for_prompt_normal_text(self):
        """Test sanitizing normal text for prompts."""
        from app.services.security_utils import sanitize_for_prompt

        text = "This is a normal title"
        result = sanitize_for_prompt(text)
        assert result == text

    def test_sanitize_for_prompt_removes_injection_patterns(self):
        """Test that injection patterns are removed."""
        from app.services.security_utils import sanitize_for_prompt

        text = "Title <script>alert('xss')</script> {ignore: true}"
        result = sanitize_for_prompt(text)
        assert "<" not in result
        assert ">" not in result
        assert "{" not in result
        assert "}" not in result

    def test_sanitize_for_prompt_truncates(self):
        """Test that long text is truncated."""
        from app.services.security_utils import sanitize_for_prompt

        long_text = "a" * 600
        result = sanitize_for_prompt(long_text, max_len=500)
        assert len(result) == 500

    def test_sanitize_for_prompt_none_returns_na(self):
        """Test that None returns 'N/A'."""
        from app.services.security_utils import sanitize_for_prompt

        result = sanitize_for_prompt(None)
        assert result == "N/A"

    def test_sanitize_ai_output_escapes_html(self):
        """Test that HTML is escaped in AI output."""
        from app.services.security_utils import sanitize_ai_output

        text = "<script>alert('xss')</script>"
        result = sanitize_ai_output(text)
        assert "<script>" not in result
        assert "&lt;script&gt;" in result

    def test_sanitize_ai_output_removes_javascript(self):
        """Test that javascript: URLs are removed."""
        from app.services.security_utils import sanitize_ai_output

        text = "Click here: javascript:alert('xss')"
        result = sanitize_ai_output(text)
        assert "javascript:" not in result.lower()


class TestTriviaGenerationService:
    """Tests for TriviaGenerationService."""

    @pytest.fixture
    def mock_content(self):
        """Create a mock content object."""
        content = MagicMock()
        content.id = "test_content_id"
        content.title = "Test Movie"
        content.description = "A test movie description"
        content.year = 2023
        content.genre = "Drama"
        content.director = "Test Director"
        content.tmdb_id = 12345
        content.is_series = False
        return content

    @pytest.fixture
    def mock_tmdb_response(self):
        """Create mock TMDB response data."""
        return {
            "credits": {
                "cast": [
                    {"name": "Actor One", "character": "Character A"},
                    {"name": "Actor Two", "character": "Character B"},
                ],
                "crew": [
                    {"name": "Director Name", "job": "Director"},
                ],
            }
        }

    @pytest.mark.asyncio
    async def test_fetch_tmdb_facts_creates_cast_facts(self, mock_content, mock_tmdb_response):
        """Test that TMDB facts include cast information."""
        from app.services.trivia_generator import TriviaGenerationService

        service = TriviaGenerationService()

        with patch.object(
            service.tmdb_service, "get_movie_details", new_callable=AsyncMock
        ) as mock_tmdb:
            mock_tmdb.return_value = mock_tmdb_response

            facts = await service._fetch_tmdb_facts(mock_content)

            assert len(facts) > 0
            cast_facts = [f for f in facts if f.category == "cast"]
            assert len(cast_facts) > 0

    @pytest.mark.asyncio
    async def test_fetch_tmdb_facts_creates_director_fact(self, mock_content, mock_tmdb_response):
        """Test that TMDB facts include director information."""
        from app.services.trivia_generator import TriviaGenerationService

        service = TriviaGenerationService()

        with patch.object(
            service.tmdb_service, "get_movie_details", new_callable=AsyncMock
        ) as mock_tmdb:
            mock_tmdb.return_value = mock_tmdb_response

            facts = await service._fetch_tmdb_facts(mock_content)

            production_facts = [f for f in facts if f.category == "production"]
            assert len(production_facts) > 0

    @pytest.mark.asyncio
    async def test_fetch_tmdb_facts_handles_missing_tmdb_id(self):
        """Test graceful handling of content without TMDB ID."""
        from app.services.trivia_generator import TriviaGenerationService

        service = TriviaGenerationService()

        content = MagicMock()
        content.id = "test_content_id"
        content.tmdb_id = None

        facts = await service._fetch_tmdb_facts(content)
        assert facts == []

    @pytest.mark.asyncio
    async def test_generate_ai_facts_sanitizes_input(self, mock_content):
        """Test that AI fact generation sanitizes content input."""
        from app.services.trivia_generator import TriviaGenerationService

        service = TriviaGenerationService()

        # Mock the Anthropic client
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(
                text='[{"text": "עובדה מעניינת", "text_en": "Interesting fact", "text_es": "Hecho interesante", "category": "production"}]'
            )
        ]
        mock_client.messages.create = AsyncMock(return_value=mock_response)

        with patch.object(service, "_anthropic_client", mock_client):
            with patch("app.services.trivia_generator.settings") as mock_settings:
                mock_settings.ANTHROPIC_API_KEY = "test-key"
                mock_settings.CLAUDE_MODEL = "claude-3-haiku-20240307"
                mock_settings.TRIVIA_MAX_FACTS_PER_CONTENT = 50

                mock_content.title = "<script>bad</script> Movie"

                facts = await service._generate_ai_facts(mock_content, existing_count=0)

                # Verify sanitization was called (input should not contain script tags)
                call_args = mock_client.messages.create.call_args
                prompt = call_args[1]["messages"][0]["content"]
                assert "<script>" not in prompt
