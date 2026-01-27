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
from app.services.audible_token_crypto import AudibleTokenCrypto
from app.services.audible_oauth_helpers import generate_pkce_pair, generate_state_token
from app.services.audible_state_manager import store_state_token, validate_state_token


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


class TestPKCEGeneration:
    """Tests for PKCE code generation."""

    def test_generate_pkce_pair(self):
        """Test PKCE pair generation."""
        code_verifier, code_challenge = generate_pkce_pair()

        # Verify format
        assert isinstance(code_verifier, str)
        assert isinstance(code_challenge, str)
        assert len(code_verifier) > 40  # Min 43 characters
        assert len(code_challenge) > 40  # Base64 encoded SHA256
        assert "=" not in code_verifier  # Should be unpadded base64
        assert "=" not in code_challenge  # Should be unpadded base64

    def test_generate_state_token(self):
        """Test state token generation."""
        state = generate_state_token()

        assert isinstance(state, str)
        assert len(state) > 30  # URL-safe random string
        assert state.isalnum() or "-" in state or "_" in state  # URL-safe characters


class TestTokenEncryption:
    """Tests for token encryption and decryption."""

    @pytest.fixture
    def crypto_with_key(self):
        """Create crypto instance with test encryption key."""
        with patch("app.core.config.settings") as mock_settings:
            from cryptography.fernet import Fernet
            # Generate a test key
            test_key = Fernet.generate_key()
            mock_settings.AUDIBLE_TOKEN_ENCRYPTION_KEY = test_key.decode()
            crypto = AudibleTokenCrypto()
            yield crypto

    @pytest.fixture
    def crypto_without_key(self):
        """Create crypto instance without encryption key."""
        with patch("app.core.config.settings") as mock_settings:
            mock_settings.AUDIBLE_TOKEN_ENCRYPTION_KEY = ""
            crypto = AudibleTokenCrypto()
            yield crypto

    def test_encrypt_token(self, crypto_with_key):
        """Test token encryption."""
        plaintext_token = "test_access_token_12345"
        encrypted = crypto_with_key.encrypt_token(plaintext_token)

        assert encrypted != plaintext_token
        assert isinstance(encrypted, str)
        # Fernet encrypted data starts with "gAAAAAA"
        assert encrypted.startswith("gAAAAAA")

    def test_decrypt_token(self, crypto_with_key):
        """Test token decryption."""
        plaintext_token = "test_access_token_12345"
        encrypted = crypto_with_key.encrypt_token(plaintext_token)
        decrypted = crypto_with_key.decrypt_token(encrypted)

        assert decrypted == plaintext_token

    def test_encrypt_empty_token(self, crypto_with_key):
        """Test encrypting empty token returns as-is."""
        result = crypto_with_key.encrypt_token("")
        assert result == ""

    def test_decrypt_empty_token(self, crypto_with_key):
        """Test decrypting empty token returns as-is."""
        result = crypto_with_key.decrypt_token("")
        assert result == ""

    def test_plaintext_fallback(self, crypto_without_key):
        """Test that crypto returns plaintext when key not configured."""
        plaintext_token = "test_access_token_12345"
        encrypted = crypto_without_key.encrypt_token(plaintext_token)
        assert encrypted == plaintext_token

        decrypted = crypto_without_key.decrypt_token(plaintext_token)
        assert decrypted == plaintext_token

    def test_decrypt_invalid_ciphertext(self, crypto_with_key):
        """Test decrypting invalid ciphertext returns as-is (fallback)."""
        invalid_ciphertext = "not_a_valid_fernet_string"
        result = crypto_with_key.decrypt_token(invalid_ciphertext)
        # Should return the invalid input as fallback
        assert result == invalid_ciphertext


class TestStateTokenManagement:
    """Tests for OAuth state token management."""

    def test_store_and_validate_state_token(self):
        """Test storing and validating state tokens."""
        state = "test_state_token_123"
        user_id = "user_456"
        code_verifier = "test_verifier_xyz"
        code_challenge = "test_challenge_abc"

        # Store the state token
        store_state_token(state, user_id, code_verifier, code_challenge)

        # Validate and retrieve
        retrieved_verifier, retrieved_challenge = validate_state_token(state, user_id)

        assert retrieved_verifier == code_verifier
        assert retrieved_challenge == code_challenge

    def test_state_token_one_time_use(self):
        """Test that state tokens can only be used once."""
        state = "one_time_state_token"
        user_id = "user_789"
        code_verifier = "verifier"
        code_challenge = "challenge"

        store_state_token(state, user_id, code_verifier, code_challenge)

        # First validation succeeds
        validate_state_token(state, user_id)

        # Second validation fails
        with pytest.raises(ValueError, match="Invalid state token"):
            validate_state_token(state, user_id)

    def test_invalid_state_token(self):
        """Test validation of invalid state tokens."""
        with pytest.raises(ValueError, match="Invalid state token"):
            validate_state_token("invalid_state", "user_id")

    def test_state_token_user_mismatch(self):
        """Test that state tokens are user-specific."""
        state = "state_mismatch"
        store_state_token(state, "user_1", "verifier", "challenge")

        with pytest.raises(ValueError, match="does not match user"):
            validate_state_token(state, "user_2")

    def test_cleanup_expired_states(self):
        """Test cleanup of expired state tokens."""
        from app.services.audible_state_manager import cleanup_expired_states, _STATE_STORE
        from datetime import datetime, timedelta

        # Clear the state store
        _STATE_STORE.clear()

        # Store an expired token (manually set creation time to past)
        state = "expired_state"
        user_id = "user_id"
        verifier = "verifier"
        challenge = "challenge"
        _STATE_STORE[state] = (user_id, datetime.utcnow() - timedelta(minutes=20), verifier, challenge)

        # Cleanup should remove expired tokens
        cleanup_expired_states()
        assert state not in _STATE_STORE

    def test_pkce_with_state_token(self):
        """Test PKCE generation and storage with state token."""
        # Generate PKCE
        code_verifier, code_challenge = generate_pkce_pair()
        state = generate_state_token()
        user_id = "user_with_pkce"

        # Store together
        store_state_token(state, user_id, code_verifier, code_challenge)

        # Validate and retrieve
        retrieved_verifier, retrieved_challenge = validate_state_token(state, user_id)

        assert retrieved_verifier == code_verifier
        assert retrieved_challenge == code_challenge
        assert len(retrieved_verifier) > 40
        assert len(retrieved_challenge) > 40


class TestOAuthURLWithPKCE:
    """Tests for OAuth URL generation with PKCE support."""

    @pytest.mark.asyncio
    async def test_get_oauth_url_with_pkce(self, audible_service):
        """Test generating OAuth URL with PKCE code challenge."""
        state = "state_with_pkce"
        code_challenge = "test_code_challenge_s256"

        url = await audible_service.get_oauth_url(state, code_challenge)

        assert f"state={state}" in url
        assert f"code_challenge={code_challenge}" in url
        assert "code_challenge_method=S256" in url

    @pytest.mark.asyncio
    async def test_get_oauth_url_without_pkce(self, audible_service):
        """Test generating OAuth URL without PKCE (backward compatibility)."""
        state = "state_no_pkce"

        url = await audible_service.get_oauth_url(state)

        assert f"state={state}" in url
        assert "code_challenge" not in url

    @pytest.mark.asyncio
    async def test_exchange_code_with_pkce(self, audible_service):
        """Test code exchange with PKCE code verifier."""
        mock_response = AsyncMock()
        mock_response.json.return_value = {
            "access_token": "access_with_pkce",
            "refresh_token": "refresh_with_pkce",
            "expires_in": 3600,
            "user_id": "user_pkce",
        }
        audible_service.http_client.post.return_value = mock_response

        # Exchange with code_verifier
        token = await audible_service.exchange_code_for_token(
            "auth_code", code_verifier="test_code_verifier"
        )

        assert token.access_token == "access_with_pkce"

        # Verify code_verifier was included in request
        call_args = audible_service.http_client.post.call_args
        assert "code_verifier" in str(call_args)
