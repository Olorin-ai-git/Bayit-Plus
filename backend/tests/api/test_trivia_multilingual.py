"""
Tests for multilingual trivia API endpoints.
Verifies multilingual parameter and display_languages preferences.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def mock_trivia_data():
    """Create mock trivia response data."""
    mock_trivia = MagicMock()
    mock_trivia.id = "trivia-id-123"
    mock_trivia.content_id = "test-content-123"
    mock_trivia.content_type = "vod"
    mock_trivia.is_enriched = True
    mock_trivia.sources_used = ["tmdb", "ai"]
    mock_trivia.facts = [
        MagicMock(
            fact_id="fact-1",
            text="Will Ferrell plays Maxime (voice)",
            text_en="Will Ferrell plays Maxime (voice)",
            text_es="Will Ferrell interpreta a Maxime",
            source_language="en",
            translations={"he": "Will Ferrell plays Maxime", "es": "Will Ferrell interpreta a Maxime"},
            trigger_time=120.5,
            trigger_type="actor",
            category="cast",
            source="tmdb",
            display_duration=10,
            priority=5,
            related_person="Will Ferrell",
            chain_id=None,
            chain_order=None,
        ),
    ]
    return mock_trivia


class TestMultilingualTriviaAPI:
    """Test multilingual trivia API functionality."""

    @pytest.mark.asyncio
    async def test_get_trivia_returns_200_with_cached(self, mock_trivia_data):
        """Test GET /api/v1/trivia/{id} returns 200 with cached data."""
        with patch("app.api.routes.trivia.trivia_core.ContentTrivia") as mock_ct:
            mock_ct.get_for_content = AsyncMock(return_value=mock_trivia_data)
            with patch("app.api.routes.trivia.trivia_core.validate_object_id", return_value="test-content-123"):
                with patch("app.api.routes.trivia.trivia_core.check_trivia_rollout"):
                    with patch("app.api.routes.trivia.trivia_core.format_trivia_response") as mock_fmt:
                        mock_fmt.return_value = {"facts": [{"text": "test"}]}
                        transport = ASGITransport(app=app)
                        async with AsyncClient(transport=transport, base_url="http://test") as client:
                            response = await client.get(
                                "/api/v1/trivia/test-content-123?multilingual=true"
                            )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_trivia_404_when_no_content(self):
        """Test GET /api/v1/trivia/{id} returns 404 for missing content."""
        with patch("app.api.routes.trivia.trivia_core.ContentTrivia") as mock_ct:
            mock_ct.get_for_content = AsyncMock(return_value=None)
            with patch("app.api.routes.trivia.trivia_core.Content") as mock_content:
                mock_content.get = AsyncMock(return_value=None)
                with patch("app.api.routes.trivia.trivia_core.validate_object_id", return_value="missing-id"):
                    with patch("app.api.routes.trivia.trivia_core.check_trivia_rollout"):
                        transport = ASGITransport(app=app)
                        async with AsyncClient(transport=transport, base_url="http://test") as client:
                            response = await client.get("/api/v1/trivia/missing-id")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_format_response_called_with_multilingual_flag(self, mock_trivia_data):
        """Test that format_trivia_response receives multilingual=True."""
        with patch("app.api.routes.trivia.trivia_core.ContentTrivia") as mock_ct:
            mock_ct.get_for_content = AsyncMock(return_value=mock_trivia_data)
            with patch("app.api.routes.trivia.trivia_core.validate_object_id", return_value="test-content-123"):
                with patch("app.api.routes.trivia.trivia_core.check_trivia_rollout"):
                    with patch("app.api.routes.trivia.trivia_core.format_trivia_response") as mock_fmt:
                        mock_fmt.return_value = {"facts": []}
                        transport = ASGITransport(app=app)
                        async with AsyncClient(transport=transport, base_url="http://test") as client:
                            await client.get(
                                "/api/v1/trivia/test-content-123?multilingual=true"
                            )
                        mock_fmt.assert_called_once()
                        call_args = mock_fmt.call_args
                        assert call_args[0][2] is True  # multilingual arg

    @pytest.mark.asyncio
    async def test_format_response_default_no_multilingual(self, mock_trivia_data):
        """Test that format_trivia_response defaults to multilingual=False."""
        with patch("app.api.routes.trivia.trivia_core.ContentTrivia") as mock_ct:
            mock_ct.get_for_content = AsyncMock(return_value=mock_trivia_data)
            with patch("app.api.routes.trivia.trivia_core.validate_object_id", return_value="test-content-123"):
                with patch("app.api.routes.trivia.trivia_core.check_trivia_rollout"):
                    with patch("app.api.routes.trivia.trivia_core.format_trivia_response") as mock_fmt:
                        mock_fmt.return_value = {"facts": []}
                        transport = ASGITransport(app=app)
                        async with AsyncClient(transport=transport, base_url="http://test") as client:
                            await client.get("/api/v1/trivia/test-content-123")
                        mock_fmt.assert_called_once()
                        call_args = mock_fmt.call_args
                        assert call_args[0][2] is False  # multilingual arg


class TestTriviaPreferencesValidation:
    """Test trivia preferences display_languages validation."""

    def test_valid_display_languages(self):
        """Test valid display_languages in TriviaPreferencesRequest."""
        from app.models.trivia import TriviaPreferencesRequest

        prefs = TriviaPreferencesRequest(
            enabled=True,
            frequency="normal",
            categories=["cast", "production"],
            display_duration=10,
            display_languages=["he", "en", "es"],
        )
        assert prefs.display_languages == ["he", "en", "es"]

    def test_default_display_languages(self):
        """Test default display_languages values."""
        from app.models.trivia import TriviaPreferencesRequest

        prefs = TriviaPreferencesRequest(
            enabled=True,
            frequency="normal",
            categories=["cast"],
            display_duration=10,
        )
        assert prefs.display_languages == ["he", "en"]

    def test_invalid_language_code_rejected(self):
        """Test that invalid language codes are rejected."""
        from pydantic import ValidationError
        from app.models.trivia import TriviaPreferencesRequest

        with pytest.raises(ValidationError):
            TriviaPreferencesRequest(
                enabled=True,
                frequency="normal",
                categories=["cast"],
                display_duration=10,
                display_languages=["he", "fr", "de"],
            )

    def test_empty_display_languages_rejected(self):
        """Test that empty display_languages list is rejected."""
        from pydantic import ValidationError
        from app.models.trivia import TriviaPreferencesRequest

        with pytest.raises(ValidationError):
            TriviaPreferencesRequest(
                enabled=True,
                frequency="normal",
                categories=["cast"],
                display_duration=10,
                display_languages=[],
            )

    def test_too_many_display_languages_rejected(self):
        """Test that more than 3 display_languages is rejected."""
        from pydantic import ValidationError
        from app.models.trivia import TriviaPreferencesRequest

        with pytest.raises(ValidationError):
            TriviaPreferencesRequest(
                enabled=True,
                frequency="normal",
                categories=["cast"],
                display_duration=10,
                display_languages=["he", "en", "es", "ru"],
            )
