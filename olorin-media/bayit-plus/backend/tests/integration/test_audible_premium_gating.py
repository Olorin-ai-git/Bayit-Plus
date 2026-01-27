"""Integration tests for Audible premium feature gating.

Tests that Audible endpoints properly enforce premium subscription tier
requirements and properly handle missing configuration.
"""

import pytest
from datetime import datetime, timedelta
from fastapi import status
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from beanie import PydanticObjectId

from app.api.dependencies.premium_features import (
    require_premium_or_family,
    require_audible_configured,
)
from app.models.user import User
from app.models.user_audible_account import UserAudibleAccount
from app.services.audible_service import AudibleAudiobook, AudibleAPIError


@pytest.fixture
def basic_tier_user():
    """Create a basic tier user."""
    return User(
        id="user_basic",
        email="basic@example.com",
        subscription_tier="basic",
        is_active=True,
    )


@pytest.fixture
def premium_tier_user():
    """Create a premium tier user."""
    return User(
        id="user_premium",
        email="premium@example.com",
        subscription_tier="premium",
        is_active=True,
    )


@pytest.fixture
def family_tier_user():
    """Create a family tier user."""
    return User(
        id="user_family",
        email="family@example.com",
        subscription_tier="family",
        is_active=True,
    )


@pytest.fixture
def admin_user():
    """Create an admin user (should bypass tier checks)."""
    admin = User(
        id="user_admin",
        email="admin@example.com",
        subscription_tier="basic",  # Basic tier, but admin
        is_active=True,
    )
    admin.roles = ["admin"]  # Grant admin role
    return admin


class TestPremiumGating:
    """Tests for premium subscription tier requirement."""

    @pytest.mark.asyncio
    async def test_require_premium_blocks_basic_tier(self, basic_tier_user):
        """Test that basic tier users cannot access premium features."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await require_premium_or_family(basic_tier_user)

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "audible_requires_premium" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_require_premium_allows_premium_tier(self, premium_tier_user):
        """Test that premium tier users can access features."""
        user = await require_premium_or_family(premium_tier_user)
        assert user.id == "user_premium"
        assert user.subscription_tier == "premium"

    @pytest.mark.asyncio
    async def test_require_premium_allows_family_tier(self, family_tier_user):
        """Test that family tier users can access features."""
        user = await require_premium_or_family(family_tier_user)
        assert user.id == "user_family"
        assert user.subscription_tier == "family"

    @pytest.mark.asyncio
    async def test_require_premium_allows_admin(self, admin_user):
        """Test that admin users bypass tier checks."""
        user = await require_premium_or_family(admin_user)
        assert user.id == "user_admin"
        # Admin should bypass subscription check


class TestAudibleConfigurationCheck:
    """Tests for Audible configuration requirement."""

    @pytest.mark.asyncio
    async def test_require_configured_allows_when_configured(self):
        """Test that configured Audible integration passes check."""
        with patch("app.core.config.settings") as mock_settings:
            mock_settings.is_audible_configured = True

            result = await require_audible_configured()
            assert result is True

    @pytest.mark.asyncio
    async def test_require_configured_blocks_when_not_configured(self):
        """Test that missing Audible configuration is rejected."""
        from fastapi import HTTPException

        with patch("app.core.config.settings") as mock_settings:
            mock_settings.is_audible_configured = False

            with pytest.raises(HTTPException) as exc_info:
                await require_audible_configured()

            assert exc_info.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            assert "audible_integration_not_configured" in str(exc_info.value.detail)


class TestAudibleEndpointGating:
    """Integration tests for Audible API endpoints with gating."""

    @pytest.mark.asyncio
    async def test_oauth_authorize_requires_premium(self, client, basic_tier_user):
        """Test that OAuth authorize endpoint requires premium subscription."""
        with patch("app.core.security.get_current_active_user", return_value=basic_tier_user):
            response = client.post(
                "/api/v1/user/audible/oauth/authorize",
                json={"redirect_uri": "http://localhost:3000/callback"},
            )
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert response.json()["detail"] == "audible_requires_premium"

    @pytest.mark.asyncio
    async def test_oauth_authorize_requires_configured(self, client, premium_tier_user):
        """Test that OAuth authorize endpoint requires configuration."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.is_audible_configured = False
                response = client.post(
                    "/api/v1/user/audible/oauth/authorize",
                    json={"redirect_uri": "http://localhost:3000/callback"},
                )
                assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
                assert response.json()["detail"] == "audible_integration_not_configured"

    @pytest.mark.asyncio
    async def test_library_sync_requires_premium(self, client, basic_tier_user):
        """Test that library sync endpoint requires premium subscription."""
        with patch("app.core.security.get_current_active_user", return_value=basic_tier_user):
            response = client.post("/api/v1/user/audible/library/sync")
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert response.json()["detail"] == "audible_requires_premium"

    @pytest.mark.asyncio
    async def test_get_library_requires_premium(self, client, basic_tier_user):
        """Test that get library endpoint requires premium subscription."""
        with patch("app.core.security.get_current_active_user", return_value=basic_tier_user):
            response = client.get("/api/v1/user/audible/library")
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert response.json()["detail"] == "audible_requires_premium"

    @pytest.mark.asyncio
    async def test_search_catalog_requires_premium(self, client, basic_tier_user):
        """Test that search endpoint requires premium subscription."""
        with patch("app.core.security.get_current_active_user", return_value=basic_tier_user):
            response = client.get("/api/v1/user/audible/search?q=test")
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert response.json()["detail"] == "audible_requires_premium"


class TestAudibleErrorHandling:
    """Tests for error handling in Audible endpoints."""

    @pytest.mark.asyncio
    async def test_api_error_returns_503(self, client, premium_tier_user):
        """Test that API errors return 503 Service Unavailable."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.services.audible_service.audible_service.search_catalog") as mock_search:
                mock_search.side_effect = AudibleAPIError("API connection failed")
                response = client.get("/api/v1/user/audible/search?q=test")
                assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
                assert response.json()["detail"] == "audible_service_unavailable"

    @pytest.mark.asyncio
    async def test_missing_audible_account_returns_400(self, client, premium_tier_user):
        """Test that missing Audible account returns 400."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.models.user_audible_account.UserAudibleAccount.find_one", return_value=None):
                response = client.post("/api/v1/user/audible/library/sync")
                assert response.status_code == status.HTTP_400_BAD_REQUEST
                assert "not connected" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_invalid_asin_returns_404(self, client, premium_tier_user):
        """Test that invalid ASIN returns 404."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.services.audible_service.audible_service.get_audiobook_details", return_value=None):
                response = client.get("/api/v1/user/audible/invalid-asin/details")
                assert response.status_code == status.HTTP_404_NOT_FOUND
                assert response.json()["detail"] == "audiobook_not_found"


class TestAudibleAuthorizationFlow:
    """Tests for OAuth authorization flow with gating."""

    @pytest.mark.asyncio
    async def test_premium_user_can_start_oauth(self, client, premium_tier_user):
        """Test that premium user can initiate OAuth flow."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.is_audible_configured = True
                mock_settings.AUDIBLE_AUTH_URL = "https://auth.audible.com"
                mock_settings.AUDIBLE_REDIRECT_URI = "http://localhost:8000/callback"
                mock_settings.AUDIBLE_CLIENT_ID = "test_client"

                with patch("app.services.audible_oauth_helpers.generate_pkce_pair") as mock_pkce:
                    with patch("app.services.audible_oauth_helpers.generate_state_token") as mock_state:
                        with patch("app.services.audible_state_manager.store_state_token"):
                            mock_pkce.return_value = ("verifier123", "challenge123")
                            mock_state.return_value = "state456"

                            response = client.post(
                                "/api/v1/user/audible/oauth/authorize",
                                json={"redirect_uri": "http://localhost:3000/callback"},
                            )
                            assert response.status_code == status.HTTP_200_OK
                            data = response.json()
                            assert "auth_url" in data
                            assert data["state"] == "state456"
                            assert data["code_challenge"] == "challenge123"

    @pytest.mark.asyncio
    async def test_premium_user_can_exchange_code(self, client, premium_tier_user):
        """Test that premium user can exchange OAuth code."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.is_audible_configured = True

                with patch("app.services.audible_state_manager.validate_state_token") as mock_validate:
                    with patch("app.services.audible_service.audible_service.exchange_code_for_token") as mock_exchange:
                        with patch("app.models.user_audible_account.UserAudibleAccount.find_one", return_value=None):
                            with patch("app.models.user_audible_account.UserAudibleAccount") as mock_account:
                                mock_validate.return_value = ("verifier", "challenge")
                                mock_exchange.return_value = MagicMock(
                                    user_id="audible_user_123",
                                    access_token="access_token",
                                    refresh_token="refresh_token",
                                    expires_at=datetime.utcnow() + timedelta(hours=1),
                                )
                                mock_account_instance = AsyncMock()
                                mock_account.return_value = mock_account_instance

                                response = client.post(
                                    "/api/v1/user/audible/oauth/callback",
                                    json={"code": "auth_code", "state": "state_token"},
                                )
                                assert response.status_code == status.HTTP_200_OK
                                data = response.json()
                                assert data["status"] == "connected"
                                assert data["audible_user_id"] == "audible_user_123"

    @pytest.mark.asyncio
    async def test_premium_user_can_disconnect(self, client, premium_tier_user):
        """Test that premium user can disconnect account."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.models.user_audible_account.UserAudibleAccount.find_one") as mock_find:
                mock_account = AsyncMock()
                mock_account.delete = AsyncMock()
                mock_find.return_value = mock_account

                response = client.post("/api/v1/user/audible/disconnect")
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert data["status"] == "disconnected"
                mock_account.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_basic_user_blocked_from_oauth(self, client, basic_tier_user):
        """Test that basic tier user cannot start OAuth."""
        with patch("app.core.security.get_current_active_user", return_value=basic_tier_user):
            response = client.post(
                "/api/v1/user/audible/oauth/authorize",
                json={"redirect_uri": "http://localhost:3000/callback"},
            )
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert response.json()["detail"] == "audible_requires_premium"


class TestAudibleLibrarySyncGating:
    """Tests for library sync with proper gating."""

    @pytest.mark.asyncio
    async def test_premium_user_can_sync_library(self, client, premium_tier_user):
        """Test that premium user can sync Audible library."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.models.user_audible_account.UserAudibleAccount.find_one") as mock_find:
                mock_account = AsyncMock()
                mock_account.expires_at = datetime.utcnow() + timedelta(hours=1)
                mock_account.access_token = "valid_token"
                mock_find.return_value = mock_account

                with patch("app.services.audible_service.audible_service.get_user_library") as mock_lib:
                    mock_lib.return_value = [
                        AudibleAudiobook(
                            asin="B001",
                            title="Book 1",
                            author="Author 1",
                            is_owned=True,
                        ),
                    ]

                    response = client.post("/api/v1/user/audible/library/sync")
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert data["status"] == "synced"
                    assert data["audiobooks_count"] == 1

    @pytest.mark.asyncio
    async def test_premium_user_can_view_library(self, client, premium_tier_user):
        """Test that premium user can view synced library."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.models.user_audible_account.UserAudibleAccount.find_one") as mock_find:
                mock_account = AsyncMock()
                mock_account.expires_at = datetime.utcnow() + timedelta(hours=1)
                mock_account.access_token = "valid_token"
                mock_find.return_value = mock_account

                with patch("app.services.audible_service.audible_service.get_user_library") as mock_lib:
                    mock_lib.return_value = [
                        AudibleAudiobook(
                            asin="B001",
                            title="Book 1",
                            author="Author 1",
                            is_owned=True,
                        ),
                    ]

                    response = client.get("/api/v1/user/audible/library")
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert len(data) == 1
                    assert data[0]["asin"] == "B001"

    @pytest.mark.asyncio
    async def test_basic_user_blocked_from_sync(self, client, basic_tier_user):
        """Test that basic tier user cannot sync."""
        with patch("app.core.security.get_current_active_user", return_value=basic_tier_user):
            response = client.post("/api/v1/user/audible/library/sync")
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert response.json()["detail"] == "audible_requires_premium"

    @pytest.mark.asyncio
    async def test_basic_user_blocked_from_viewing_library(self, client, basic_tier_user):
        """Test that basic tier user cannot view library."""
        with patch("app.core.security.get_current_active_user", return_value=basic_tier_user):
            response = client.get("/api/v1/user/audible/library")
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert response.json()["detail"] == "audible_requires_premium"


class TestAudibleSearchGating:
    """Tests for catalog search with proper gating."""

    @pytest.mark.asyncio
    async def test_premium_user_can_search(self, client, premium_tier_user):
        """Test that premium user can search Audible catalog."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.is_audible_configured = True

                with patch("app.services.audible_service.audible_service.search_catalog") as mock_search:
                    mock_search.return_value = [
                        AudibleAudiobook(
                            asin="B001",
                            title="Matching Book",
                            author="Author 1",
                            is_owned=False,
                        ),
                    ]

                    response = client.get("/api/v1/user/audible/search?q=test")
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert len(data) == 1
                    assert data[0]["title"] == "Matching Book"

    @pytest.mark.asyncio
    async def test_premium_user_can_get_details(self, client, premium_tier_user):
        """Test that premium user can get audiobook details."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.services.audible_service.audible_service.get_audiobook_details") as mock_details:
                mock_details.return_value = AudibleAudiobook(
                    asin="B001",
                    title="Detailed Book",
                    author="Author 1",
                    is_owned=False,
                )

                response = client.get("/api/v1/user/audible/B001/details")
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert data["asin"] == "B001"
                assert data["title"] == "Detailed Book"

    @pytest.mark.asyncio
    async def test_basic_user_blocked_from_search(self, client, basic_tier_user):
        """Test that basic tier user cannot search."""
        with patch("app.core.security.get_current_active_user", return_value=basic_tier_user):
            response = client.get("/api/v1/user/audible/search?q=test")
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert response.json()["detail"] == "audible_requires_premium"

    @pytest.mark.asyncio
    async def test_basic_user_blocked_from_details(self, client, basic_tier_user):
        """Test that basic tier user cannot get details."""
        with patch("app.core.security.get_current_active_user", return_value=basic_tier_user):
            response = client.get("/api/v1/user/audible/B001/details")
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert response.json()["detail"] == "audible_requires_premium"


class TestAudibleConnectionStatus:
    """Tests for checking Audible connection status with proper gating."""

    @pytest.mark.asyncio
    async def test_premium_user_can_check_status(self, client, premium_tier_user):
        """Test that premium user can check connection status."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.models.user_audible_account.UserAudibleAccount.find_one") as mock_find:
                mock_account = AsyncMock()
                mock_account.audible_user_id = "audible_123"
                mock_account.synced_at = datetime.utcnow()
                mock_account.last_sync_error = None
                mock_find.return_value = mock_account

                response = client.get("/api/v1/user/audible/connected")
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert data["connected"] is True
                assert data["audible_user_id"] == "audible_123"

    @pytest.mark.asyncio
    async def test_basic_user_blocked_from_checking_status(self, client, basic_tier_user):
        """Test that basic tier user cannot check status."""
        with patch("app.core.security.get_current_active_user", return_value=basic_tier_user):
            response = client.get("/api/v1/user/audible/connected")
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert response.json()["detail"] == "audible_requires_premium"

    @pytest.mark.asyncio
    async def test_unconnected_account_returns_false(self, client, premium_tier_user):
        """Test that unconnected account returns connected=false."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.models.user_audible_account.UserAudibleAccount.find_one", return_value=None):
                response = client.get("/api/v1/user/audible/connected")
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert data["connected"] is False

    @pytest.mark.asyncio
    async def test_connected_account_returns_true(self, client, premium_tier_user):
        """Test that connected account returns connected=true."""
        with patch("app.core.security.get_current_active_user", return_value=premium_tier_user):
            with patch("app.models.user_audible_account.UserAudibleAccount.find_one") as mock_find:
                mock_account = AsyncMock()
                mock_account.audible_user_id = "audible_user_123"
                mock_account.synced_at = datetime.utcnow()
                mock_account.last_sync_error = None
                mock_find.return_value = mock_account

                response = client.get("/api/v1/user/audible/connected")
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert data["connected"] is True
                assert data["audible_user_id"] == "audible_user_123"
