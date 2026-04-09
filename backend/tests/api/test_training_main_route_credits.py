"""Tests for training user auth and credit deduction in main app routes."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from jose import jwt

from app.api.dependencies.training_context import (
    deduct_training_credits_if_applicable,
    get_training_partner_id,
)
from app.core.auth_client import DualModeAuthClient
from app.models.user import User


# ── get_training_partner_id ──────────────────────────────────────────


def test_get_training_partner_id_returns_partner_for_training_user():
    """Training user proxy carries _training_partner_id."""
    user = MagicMock(spec=User)
    user._training_partner_id = "org-abc"
    assert get_training_partner_id(user) == "org-abc"


def test_get_training_partner_id_returns_none_for_b2c_user():
    """B2C User objects have no _training_partner_id attribute."""
    user = MagicMock(spec=User)
    # MagicMock spec=User won't have _training_partner_id
    if hasattr(user, "_training_partner_id"):
        delattr(user, "_training_partner_id")
    assert get_training_partner_id(user) is None


# ── deduct_training_credits_if_applicable ────────────────────────────


@pytest.mark.asyncio
async def test_deduct_training_credits_deducts_for_training_user():
    """Deducts credits when user is a training portal user."""
    user = MagicMock(spec=User)
    user._training_partner_id = "org-xyz"

    with patch(
        "app.api.dependencies.training_context._get_credit_service"
    ) as mock_get:
        svc = AsyncMock()
        svc.deduct = AsyncMock(return_value=(True, 38))
        mock_get.return_value = svc

        await deduct_training_credits_if_applicable(user, "search")

    svc.deduct.assert_awaited_once_with(partner_id="org-xyz", feature="search")


@pytest.mark.asyncio
async def test_deduct_training_credits_noop_for_b2c_user():
    """No deduction attempt for B2C users (no _training_partner_id)."""
    user = MagicMock(spec=User)
    if hasattr(user, "_training_partner_id"):
        delattr(user, "_training_partner_id")

    with patch(
        "app.api.dependencies.training_context._get_credit_service"
    ) as mock_get:
        svc = AsyncMock()
        mock_get.return_value = svc

        await deduct_training_credits_if_applicable(user, "search")

    svc.deduct.assert_not_awaited()


@pytest.mark.asyncio
async def test_deduct_training_credits_raises_402_on_insufficient():
    """Raises HTTP 402 when training org has no credits left."""
    user = MagicMock(spec=User)
    user._training_partner_id = "org-broke"

    with patch(
        "app.api.dependencies.training_context._get_credit_service"
    ) as mock_get:
        svc = AsyncMock()
        svc.deduct = AsyncMock(return_value=(False, 0))
        mock_get.return_value = svc

        with pytest.raises(HTTPException) as exc_info:
            await deduct_training_credits_if_applicable(user, "talk_back")

    assert exc_info.value.status_code == 402
    assert "Insufficient AI credits" in exc_info.value.detail


# ── _verify_training_hs256 ──────────────────────────────────────────


def test_verify_training_hs256_accepts_valid_token():
    """Valid HS256 token with correct issuer is accepted."""
    secret = "test-secret-key-long-enough-for-validation-32chars"
    token = jwt.encode(
        {
            "sub": "abc123",
            "partner_id": "org-edu",
            "role": "viewer",
            "email": "t@example.com",
            "iss": "training.olorin.ai",
        },
        secret,
        algorithm="HS256",
    )

    client = DualModeAuthClient()
    with patch("app.core.auth_client.settings") as mock_settings:
        mock_settings.SECRET_KEY = secret
        mock_settings.AUTH_SERVICE_URL = "https://auth.olorin.ai"
        result = client._verify_training_hs256(token)

    assert result is not None
    assert result["sub"] == "abc123"
    assert result["partner_id"] == "org-edu"
    assert result["iss"] == "training.olorin.ai"


def test_verify_training_hs256_rejects_wrong_issuer():
    """HS256 token with wrong issuer is rejected."""
    secret = "test-secret-key-long-enough-for-validation-32chars"
    token = jwt.encode(
        {
            "sub": "abc123",
            "iss": "https://evil.example.com",
        },
        secret,
        algorithm="HS256",
    )

    client = DualModeAuthClient()
    with patch("app.core.auth_client.settings") as mock_settings:
        mock_settings.SECRET_KEY = secret
        mock_settings.AUTH_SERVICE_URL = "https://auth.olorin.ai"
        result = client._verify_training_hs256(token)

    assert result is None


def test_verify_training_hs256_rejects_wrong_secret():
    """HS256 token signed with a different secret is rejected."""
    token = jwt.encode(
        {
            "sub": "abc123",
            "iss": "training.olorin.ai",
        },
        "wrong-secret-key-long-enough-for-32",
        algorithm="HS256",
    )

    client = DualModeAuthClient()
    with patch("app.core.auth_client.settings") as mock_settings:
        mock_settings.SECRET_KEY = "correct-secret-key-long-enough-32chars"
        mock_settings.AUTH_SERVICE_URL = "https://auth.olorin.ai"
        result = client._verify_training_hs256(token)

    assert result is None
