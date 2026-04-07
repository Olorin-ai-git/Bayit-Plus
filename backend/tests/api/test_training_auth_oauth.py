"""Tests for training OAuth registration flow."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

pytest_plugins = ["conftest_training"]

pytestmark = pytest.mark.asyncio


@pytest.fixture
def _no_existing_user():
    """Patch TrainingUser.find_one to return None (no existing user)."""
    with patch(
        "app.api.routes.training.auth.TrainingUser"
    ) as mock_cls:
        mock_cls.find_one = AsyncMock(return_value=None)
        # The constructor returns a mock user with async insert and
        # string attributes so _user_response / create_training_token work.
        mock_instance = MagicMock()
        mock_instance.insert = AsyncMock()
        mock_instance.id = "new_user_id"
        mock_instance.email = "newuser@company.com"
        mock_instance.role = "admin"
        mock_instance.display_name = "New User"
        mock_instance.partner_id = "training-test-company-abcd1234"
        mock_instance.department = None
        mock_cls.return_value = mock_instance
        yield mock_cls


class TestGoogleOAuthRegister:
    """POST /api/v1/training/auth/google with mode=register."""

    async def test_register_mode_creates_org_and_user(
        self, training_public_client, _no_existing_user
    ):
        """Google OAuth with mode=register should create a new org."""
        with (
            patch(
                "app.api.routes.training.auth.httpx.AsyncClient"
            ) as mock_httpx,
            patch(
                "app.api.routes.training.auth.partner_service"
            ) as mock_ps,
        ):
            # Mock Google token validation
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "email": "newuser@company.com",
                "name": "New User",
            }
            mock_client_instance = AsyncMock()
            mock_client_instance.get = AsyncMock(return_value=mock_resp)
            mock_client_instance.__aenter__ = AsyncMock(
                return_value=mock_client_instance
            )
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            mock_httpx.return_value = mock_client_instance

            # Mock partner creation
            mock_partner = MagicMock()
            mock_partner.save = AsyncMock()
            mock_ps.create_partner = AsyncMock(
                return_value=(mock_partner, "api-key-123")
            )
            mock_ps.get_training_tier_defaults.return_value = {}

            resp = await training_public_client.post(
                "/api/v1/training/auth/google",
                json={
                    "id_token": "valid-google-token",
                    "mode": "register",
                    "org_name": "Test Company",
                    "display_name": "New User",
                },
            )

        assert resp.status_code == 201
        body = resp.json()
        assert "token" in body
        assert body["user"]["email"] == "newuser@company.com"
        assert "organization" in body
        assert body["organization"]["org_name"] == "Test Company"

    async def test_register_mode_requires_org_name(
        self, training_public_client
    ):
        """Google OAuth register without org_name should 400."""
        with patch(
            "app.api.routes.training.auth.httpx.AsyncClient"
        ) as mock_httpx:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {"email": "user@co.com"}
            mock_client_instance = AsyncMock()
            mock_client_instance.get = AsyncMock(return_value=mock_resp)
            mock_client_instance.__aenter__ = AsyncMock(
                return_value=mock_client_instance
            )
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            mock_httpx.return_value = mock_client_instance

            resp = await training_public_client.post(
                "/api/v1/training/auth/google",
                json={
                    "id_token": "valid-token",
                    "mode": "register",
                },
            )

        assert resp.status_code == 400
        assert "org_name" in resp.json()["detail"].lower()

    async def test_login_mode_still_works(
        self, training_public_client
    ):
        """Default mode=login should behave as before."""
        mock_user = MagicMock()
        mock_user.id = "existing_user_id"
        mock_user.email = "existing@co.com"
        mock_user.role = "admin"
        mock_user.display_name = "Existing"
        mock_user.partner_id = "training-co-1234"
        mock_user.department = None
        mock_user.status = "active"
        mock_user.save = AsyncMock()

        with (
            patch(
                "app.api.routes.training.auth.httpx.AsyncClient"
            ) as mock_httpx,
            patch(
                "app.api.routes.training.auth.TrainingUser"
            ) as mock_cls,
        ):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {"email": "existing@co.com"}
            mock_client_instance = AsyncMock()
            mock_client_instance.get = AsyncMock(return_value=mock_resp)
            mock_client_instance.__aenter__ = AsyncMock(
                return_value=mock_client_instance
            )
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            mock_httpx.return_value = mock_client_instance

            mock_cls.find_one = AsyncMock(return_value=mock_user)

            resp = await training_public_client.post(
                "/api/v1/training/auth/google",
                json={"id_token": "valid-token"},
            )

        assert resp.status_code == 200
        assert resp.json()["user"]["email"] == "existing@co.com"
