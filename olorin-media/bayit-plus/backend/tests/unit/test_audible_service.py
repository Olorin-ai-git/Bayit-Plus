"""Unit tests for Audible integration service.

Tests the AudibleService implementation including OAuth token exchange,
library syncing, catalog search, and error handling.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from app.services.audible_service import (
    AudibleService,
    AudibleAudiobook,
    AudibleOAuthToken,
    AudibleAPIError,
)


@pytest.fixture
def mock_settings():
    """Mock Olorin settings with Audible credentials."""
    with patch("app.core.config.settings") as mock:
        mock.AUDIBLE_CLIENT_ID = "test_client_id"
        mock.AUDIBLE_CLIENT_SECRET = "test_client_secret"
        mock.AUDIBLE_REDIRECT_URI = "http://localhost:8000/callback"
        yield mock


@pytest.fixture
def audible_service(mock_settings):
    """Create AudibleService instance with mocked HTTP client."""
    service = AudibleService()
    # Mock the HTTP client to prevent real network calls
    service.http_client = AsyncMock()
    yield service


class TestOAuthFlow:
    """Tests for OAuth authentication flow."""

    @pytest.mark.asyncio
    async def test_get_oauth_url(self, audible_service):
        """Test generating Audible OAuth authorization URL."""
        state = "test_state_token"
        url = await audible_service.get_oauth_url(state)

        assert "https://www.audible.com/auth/oauth2/authorize" in url
        assert "client_id=test_client_id" in url
        assert f"state={state}" in url
        assert "scope=library+profile" in url

    @pytest.mark.asyncio
    async def test_exchange_code_for_token_success(self, audible_service):
        """Test successful OAuth code exchange."""
        mock_response = AsyncMock()
        mock_response.json.return_value = {
            "access_token": "access_token_123",
            "refresh_token": "refresh_token_456",
            "expires_in": 3600,
            "user_id": "audible_user_789",
        }
        audible_service.http_client.post.return_value = mock_response

        token = await audible_service.exchange_code_for_token("auth_code_xyz")

        assert token.access_token == "access_token_123"
        assert token.refresh_token == "refresh_token_456"
        assert token.user_id == "audible_user_789"
        assert isinstance(token.expires_at, datetime)

        # Verify POST request to token endpoint
        audible_service.http_client.post.assert_called_once()
        call_args = audible_service.http_client.post.call_args
        assert "auth/oauth2/token" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_exchange_code_for_token_failure(self, audible_service):
        """Test OAuth code exchange failure."""
        audible_service.http_client.post.side_effect = httpx.HTTPError(
            "Token exchange failed"
        )

        with pytest.raises(AudibleAPIError) as exc_info:
            await audible_service.exchange_code_for_token("invalid_code")

        assert "Failed to exchange code for token" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_refresh_access_token_success(self, audible_service):
        """Test successful token refresh."""
        mock_response = AsyncMock()
        mock_response.json.return_value = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600,
            "user_id": "audible_user_789",
        }
        audible_service.http_client.post.return_value = mock_response

        token = await audible_service.refresh_access_token("old_refresh_token")

        assert token.access_token == "new_access_token"
        assert token.refresh_token == "new_refresh_token"

    @pytest.mark.asyncio
    async def test_refresh_access_token_failure(self, audible_service):
        """Test token refresh failure."""
        audible_service.http_client.post.side_effect = httpx.HTTPError(
            "Refresh failed"
        )

        with pytest.raises(AudibleAPIError) as exc_info:
            await audible_service.refresh_access_token("invalid_token")

        assert "Failed to refresh access token" in str(exc_info.value)


class TestLibrarySyncing:
    """Tests for user library syncing."""

    @pytest.mark.asyncio
    async def test_get_user_library_success(self, audible_service):
        """Test fetching user's Audible library."""
        mock_response = AsyncMock()
        mock_response.json.return_value = {
            "items": [
                {
                    "product": {
                        "asin": "B001ASIN1",
                        "title": "Test Audiobook 1",
                        "author_name": "Test Author",
                        "narrators": [{"name": "Test Narrator"}],
                        "language": "en-US",
                        "runtime_length_ms": 3600000,  # 1 hour
                        "product_images": {"500": "https://image.url/1"},
                        "product_desc": "Test description",
                        "rating": 4.5,
                    }
                },
                {
                    "product": {
                        "asin": "B001ASIN2",
                        "title": "Test Audiobook 2",
                        "author_name": "Another Author",
                        "narrators": [],
                        "language": "en-US",
                        "runtime_length_ms": 7200000,  # 2 hours
                        "product_images": {"500": "https://image.url/2"},
                        "product_desc": "Another description",
                        "rating": 4.0,
                    }
                },
            ]
        }
        audible_service.http_client.get.return_value = mock_response

        books = await audible_service.get_user_library("test_token", limit=20)

        assert len(books) == 2
        assert books[0].title == "Test Audiobook 1"
        assert books[0].author == "Test Author"
        assert books[0].asin == "B001ASIN1"
        assert books[1].title == "Test Audiobook 2"
        assert books[1].is_owned is True

        # Verify API call parameters
        call_args = audible_service.http_client.get.call_args
        assert "/1.0/library" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_get_user_library_empty(self, audible_service):
        """Test fetching empty library."""
        mock_response = AsyncMock()
        mock_response.json.return_value = {"items": []}
        audible_service.http_client.get.return_value = mock_response

        books = await audible_service.get_user_library("test_token")

        assert len(books) == 0

    @pytest.mark.asyncio
    async def test_get_user_library_api_error(self, audible_service):
        """Test library fetch API error."""
        audible_service.http_client.get.side_effect = httpx.HTTPError(
            "API error"
        )

        with pytest.raises(AudibleAPIError) as exc_info:
            await audible_service.get_user_library("test_token")

        assert "Failed to fetch library" in str(exc_info.value)


class TestCatalogSearch:
    """Tests for Audible catalog search."""

    @pytest.mark.asyncio
    async def test_search_catalog_success(self, audible_service):
        """Test successful catalog search."""
        mock_response = AsyncMock()
        mock_response.json.return_value = {
            "products": [
                {
                    "asin": "B0SEARCH1",
                    "title": "Search Result 1",
                    "author_name": "Author A",
                    "narrators": [{"name": "Narrator A"}],
                    "language": "en-US",
                    "runtime_length_ms": 3600000,
                    "product_images": {"500": "https://image.url/search1"},
                    "product_desc": "Search result description",
                    "rating": 4.8,
                },
                {
                    "asin": "B0SEARCH2",
                    "title": "Search Result 2",
                    "author_name": "Author B",
                    "narrators": [],
                    "language": "en-US",
                    "runtime_length_ms": 5400000,
                    "product_images": {"500": "https://image.url/search2"},
                    "product_desc": "Another search result",
                    "rating": 4.2,
                },
            ]
        }
        audible_service.http_client.get.return_value = mock_response

        results = await audible_service.search_catalog("fantasy books", limit=20)

        assert len(results) == 2
        assert results[0].title == "Search Result 1"
        assert results[0].is_owned is False  # Search results are not owned
        assert results[1].asin == "B0SEARCH2"

    @pytest.mark.asyncio
    async def test_search_catalog_no_results(self, audible_service):
        """Test catalog search with no results."""
        mock_response = AsyncMock()
        mock_response.json.return_value = {"products": []}
        audible_service.http_client.get.return_value = mock_response

        results = await audible_service.search_catalog("nonexistent query")

        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_search_catalog_api_error(self, audible_service):
        """Test catalog search API error."""
        audible_service.http_client.get.side_effect = httpx.HTTPError(
            "Search failed"
        )

        with pytest.raises(AudibleAPIError) as exc_info:
            await audible_service.search_catalog("test")

        assert "Search failed" in str(exc_info.value)


class TestAudiobookDetails:
    """Tests for audiobook detail retrieval."""

    @pytest.mark.asyncio
    async def test_get_audiobook_details_success(self, audible_service):
        """Test fetching audiobook details."""
        mock_response = AsyncMock()
        mock_response.json.return_value = {
            "product": {
                "asin": "B0DETAIL1",
                "title": "Detailed Audiobook",
                "author_name": "Detail Author",
                "narrators": [{"name": "Detail Narrator"}],
                "language": "en-US",
                "runtime_length_ms": 36000000,  # 10 hours
                "product_images": {"500": "https://image.url/detail"},
                "product_desc": "Very detailed description",
                "rating": 4.9,
                "publication_date": "2023-01-15",
                "num_pages": 400,
            }
        }
        audible_service.http_client.get.return_value = mock_response

        book = await audible_service.get_audiobook_details("B0DETAIL1")

        assert book.title == "Detailed Audiobook"
        assert book.author == "Detail Author"
        assert book.duration_minutes == 600  # 10 hours = 600 minutes
        assert book.rating == 4.9

    @pytest.mark.asyncio
    async def test_get_audiobook_details_not_found(self, audible_service):
        """Test audiobook not found."""
        mock_response = AsyncMock()
        mock_response.json.return_value = {"product": {}}
        audible_service.http_client.get.return_value = mock_response

        book = await audible_service.get_audiobook_details("B0NOTFOUND")

        assert book is None

    @pytest.mark.asyncio
    async def test_get_audiobook_details_api_error(self, audible_service):
        """Test audiobook detail fetch API error."""
        audible_service.http_client.get.side_effect = httpx.HTTPError(
            "Detail fetch failed"
        )

        with pytest.raises(AudibleAPIError) as exc_info:
            await audible_service.get_audiobook_details("B0ERROR")

        assert "Failed to fetch details" in str(exc_info.value)


class TestAudibleAppURLGeneration:
    """Tests for Audible app URL generation."""

    def test_get_audible_app_url(self, audible_service):
        """Test generating Audible app URL."""
        asin = "B0TEST123"
        url = audible_service.get_audible_app_url(asin)

        assert "B0TEST123" in url
        assert "audible.com" in url
        assert url.startswith("https://")


class TestServiceCleanup:
    """Tests for service lifecycle management."""

    @pytest.mark.asyncio
    async def test_close_http_client(self, audible_service):
        """Test proper HTTP client closure."""
        # Mock the aclose method
        audible_service.http_client.aclose = AsyncMock()

        await audible_service.close()

        audible_service.http_client.aclose.assert_called_once()

    def test_destructor(self, mock_settings):
        """Test destructor cleanup."""
        service = AudibleService()
        service.http_client = AsyncMock()

        # Destructor should be called when object is deleted
        del service
        # If no exception is raised, cleanup worked
