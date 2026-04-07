"""Tests for training token refresh flow."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.api.routes.training.dependencies import (
    create_training_refresh_token,
)

pytest_plugins = ["conftest_training"]

pytestmark = pytest.mark.asyncio


class TestTokenRefresh:
    """POST /api/v1/training/auth/refresh."""

    async def test_refresh_issues_new_tokens(
        self, training_public_client, mock_training_admin
    ):
        """Valid refresh token should return new access + refresh tokens."""
        mock_training_admin.save = AsyncMock()

        with patch(
            "app.api.routes.training.auth.validate_refresh_token",
            new_callable=AsyncMock,
            return_value=mock_training_admin,
        ):
            resp = await training_public_client.post(
                "/api/v1/training/auth/refresh",
                json={"refresh_token": "valid-refresh-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert "token" in body
        assert "refresh_token" in body
        assert "user" in body

    async def test_refresh_rejects_invalid_token(
        self, training_public_client
    ):
        """Invalid refresh token should 401."""
        resp = await training_public_client.post(
            "/api/v1/training/auth/refresh",
            json={"refresh_token": "invalid.jwt.token"},
        )
        assert resp.status_code == 401
