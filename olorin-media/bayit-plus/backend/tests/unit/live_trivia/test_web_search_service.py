"""
Unit tests for WebSearchService

Tests Wikipedia API and DuckDuckGo fallback searches.
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch
from aiohttp import ClientError

from app.services.live_trivia.web_search_service import WebSearchService


@pytest.fixture
def search_service():
    """Create WebSearchService instance."""
    return WebSearchService()


class TestWikipediaSearch:
    """Test Wikipedia API searches."""

    @pytest.mark.asyncio
    async def test_search_wikipedia_success(self, search_service):
        """Test successful Wikipedia search."""
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "title": "Vladimir Putin",
            "extract": "Vladimir Putin is the President of Russia...",
            "content_urls": {
                "desktop": {
                    "page": "https://en.wikipedia.org/wiki/Vladimir_Putin"
                }
            }
        })

        mock_session = Mock()
        mock_session.get = AsyncMock(return_value=mock_response)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock()

        with patch("aiohttp.ClientSession", return_value=mock_session):
            result = await search_service.search_wikipedia("Vladimir Putin")

        assert result is not None
        assert result["title"] == "Vladimir Putin"
        assert result["source"] == "wikipedia"
        assert len(result["summary"]) > 0
        assert "wikipedia.org" in result["url"]

    @pytest.mark.asyncio
    async def test_search_wikipedia_not_found(self, search_service):
        """Test Wikipedia search for non-existent page."""
        mock_response = Mock()
        mock_response.status = 404

        mock_session = Mock()
        mock_session.get = AsyncMock(return_value=mock_response)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock()

        with patch("aiohttp.ClientSession", return_value=mock_session):
            result = await search_service.search_wikipedia("NonExistentPage")

        assert result is None

    @pytest.mark.asyncio
    async def test_search_wikipedia_truncate_summary(self, search_service):
        """Test summary truncation at 1500 chars."""
        long_summary = "A" * 2000

        mock_response = Mock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "title": "Test",
            "extract": long_summary,
            "content_urls": {"desktop": {"page": "http://test.com"}}
        })

        mock_session = Mock()
        mock_session.get = AsyncMock(return_value=mock_response)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock()

        with patch("aiohttp.ClientSession", return_value=mock_session):
            result = await search_service.search_wikipedia("Test")

        assert result is not None
        assert len(result["summary"]) == 1503  # 1500 + "..."
        assert result["summary"].endswith("...")

    @pytest.mark.asyncio
    async def test_search_wikipedia_network_error(self, search_service):
        """Test handling of network errors."""
        mock_session = Mock()
        mock_session.get = AsyncMock(side_effect=ClientError("Network error"))
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock()

        with patch("aiohttp.ClientSession", return_value=mock_session):
            result = await search_service.search_wikipedia("Test")

        assert result is None


class TestDuckDuckGoSearch:
    """Test DuckDuckGo instant answer searches."""

    @pytest.mark.asyncio
    async def test_search_duckduckgo_success(self, search_service):
        """Test successful DuckDuckGo search."""
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "Heading": "Ukraine",
            "Abstract": "Ukraine is a country in Eastern Europe...",
            "AbstractURL": "https://en.wikipedia.org/wiki/Ukraine"
        })

        mock_session = Mock()
        mock_session.get = AsyncMock(return_value=mock_response)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock()

        with patch("aiohttp.ClientSession", return_value=mock_session):
            result = await search_service.search_duckduckgo("Ukraine")

        assert result is not None
        assert result["title"] == "Ukraine"
        assert result["source"] == "duckduckgo"
        assert len(result["summary"]) > 0

    @pytest.mark.asyncio
    async def test_search_duckduckgo_no_result(self, search_service):
        """Test DuckDuckGo with no instant answer."""
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "Heading": "",
            "Abstract": "",
            "Answer": ""
        })

        mock_session = Mock()
        mock_session.get = AsyncMock(return_value=mock_response)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock()

        with patch("aiohttp.ClientSession", return_value=mock_session):
            result = await search_service.search_duckduckgo("Unknown")

        assert result is None

    @pytest.mark.asyncio
    async def test_search_duckduckgo_uses_answer(self, search_service):
        """Test DuckDuckGo uses Answer field when Abstract is empty."""
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "Heading": "Test",
            "Abstract": "",
            "Answer": "This is the answer",
            "AbstractURL": ""
        })

        mock_session = Mock()
        mock_session.get = AsyncMock(return_value=mock_response)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock()

        with patch("aiohttp.ClientSession", return_value=mock_session):
            result = await search_service.search_duckduckgo("Test")

        assert result is not None
        assert result["summary"] == "This is the answer"


class TestSearch:
    """Test combined search with fallback."""

    @pytest.mark.asyncio
    async def test_search_wikipedia_success_no_fallback(self, search_service):
        """Test successful Wikipedia search doesn't use fallback."""
        # Mock Wikipedia success
        search_service.search_wikipedia = AsyncMock(return_value={
            "title": "Test",
            "summary": "Test summary",
            "url": "http://test.com",
            "source": "wikipedia"
        })

        # Mock DuckDuckGo (should not be called)
        search_service.search_duckduckgo = AsyncMock()

        result = await search_service.search("Test")

        assert result is not None
        assert result["source"] == "wikipedia"
        search_service.search_duckduckgo.assert_not_called()

    @pytest.mark.asyncio
    async def test_search_wikipedia_fail_fallback_duckduckgo(self, search_service):
        """Test fallback to DuckDuckGo when Wikipedia fails."""
        # Mock Wikipedia failure
        search_service.search_wikipedia = AsyncMock(return_value=None)

        # Mock DuckDuckGo success
        search_service.search_duckduckgo = AsyncMock(return_value={
            "title": "Test",
            "summary": "Test summary",
            "url": "http://test.com",
            "source": "duckduckgo"
        })

        result = await search_service.search("Test")

        assert result is not None
        assert result["source"] == "duckduckgo"
        search_service.search_wikipedia.assert_called_once()
        search_service.search_duckduckgo.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_both_fail(self, search_service):
        """Test when both sources fail."""
        search_service.search_wikipedia = AsyncMock(return_value=None)
        search_service.search_duckduckgo = AsyncMock(return_value=None)

        result = await search_service.search("Test")

        assert result is None

    @pytest.mark.asyncio
    async def test_search_wikipedia_empty_summary_uses_fallback(self, search_service):
        """Test fallback when Wikipedia returns empty summary."""
        # Mock Wikipedia with empty summary
        search_service.search_wikipedia = AsyncMock(return_value={
            "title": "Test",
            "summary": "",
            "url": "http://test.com",
            "source": "wikipedia"
        })

        # Mock DuckDuckGo success
        search_service.search_duckduckgo = AsyncMock(return_value={
            "title": "Test",
            "summary": "Valid summary",
            "url": "http://test.com",
            "source": "duckduckgo"
        })

        result = await search_service.search("Test")

        assert result is not None
        assert result["source"] == "duckduckgo"
        assert result["summary"] == "Valid summary"
