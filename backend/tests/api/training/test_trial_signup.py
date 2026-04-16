"""Tests for POST /api/v1/training/auth/signup-with-trial endpoint."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

_MOD = "app.api.routes.training.trial_signup"


def _stripe_mocks():
    """Return a configured stripe mock context manager."""
    m = patch(f"{_MOD}.stripe")
    return m


def _mock_platform_config():
    """Return a PlatformConfig mock with trial defaults and plans."""
    from app.models.platform_config import SubscriptionPlan, TrialDefaults

    cfg = MagicMock()
    cfg.trial_defaults = TrialDefaults()
    cfg.subscription_plans = [
        SubscriptionPlan(
            id="team", name="Team", price_monthly=349,
            price_annual=279, stripe_price_id_monthly="price_team",
            stripe_price_id_annual="price_team_yr",
        ),
        SubscriptionPlan(
            id="organization", name="Organization", price_monthly=599,
            price_annual=479, stripe_price_id_monthly="price_org",
            stripe_price_id_annual="price_org_yr",
        ),
    ]
    cfg.seat_limits = {"team": 25, "organization": 100}
    return cfg


_VALID_BODY = {
    "email": "alice@acme.corp",
    "password": "pw12345678",
    "org_name": "Acme",
    "selected_tier": "organization",
    "stripe_payment_method_id": "pm_test",
}


@pytest.mark.asyncio
async def test_signup_creates_partner_and_stripe_sub():
    """Happy path: creates partner, user, trial history, Stripe resources."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    with _stripe_mocks() as stripe_mock:
        stripe_mock.PaymentMethod.retrieve.return_value = MagicMock(
            card=MagicMock(fingerprint="fp_test"),
        )
        stripe_mock.Customer.create.return_value = MagicMock(id="cus_x")
        stripe_mock.PaymentMethod.attach.return_value = None
        stripe_mock.Customer.modify.return_value = None
        stripe_mock.Subscription.create.return_value = MagicMock(
            id="sub_x", status="trialing",
        )

        with (
            patch(f"{_MOD}.PlatformConfig") as MockPC,
            patch(f"{_MOD}.check_duplicate", new_callable=AsyncMock, return_value=False),
            patch(f"{_MOD}.partner_service") as mock_ps,
            patch(f"{_MOD}.seed_sample_content", new_callable=AsyncMock),
            patch(f"{_MOD}.TrainingUser") as MockTU,
            patch(f"{_MOD}.TrialHistory") as MockTH,
            patch(f"{_MOD}.create_training_token", return_value="tok_access"),
            patch(f"{_MOD}.create_training_refresh_token", return_value="tok_refresh"),
        ):
            MockPC.get_singleton = AsyncMock(return_value=_mock_platform_config())

            user_inst = MagicMock()
            user_inst.id = "u1"
            user_inst.email = "alice@acme.corp"
            user_inst.role = "admin"
            user_inst.display_name = "alice"
            user_inst.partner_id = "training-acme-test"
            user_inst.insert = AsyncMock()
            MockTU.return_value = user_inst
            MockTU.find_one = AsyncMock(return_value=None)

            th_inst = MagicMock()
            th_inst.insert = AsyncMock()
            MockTH.return_value = th_inst

            partner_inst = MagicMock()
            partner_inst.save = AsyncMock()
            mock_ps.create_partner = AsyncMock(return_value=(partner_inst, "key"))
            mock_ps.get_training_tier_defaults.return_value = {}

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test",
            ) as ac:
                resp = await ac.post("/api/v1/training/auth/signup-with-trial", json=_VALID_BODY)

    assert resp.status_code == 201
    data = resp.json()
    assert data["access_token"] == "tok_access"
    assert data["organization"]["tier"] == "trial"
    assert data["organization"]["org_name"] == "Acme"
    assert data["organization"]["credits_remaining"] == 50
    assert data["organization"]["trial_config"]["state"] == "active"
    assert data["user"]["email"] == "alice@acme.corp"


@pytest.mark.asyncio
async def test_signup_blocked_by_dedup():
    """Dedup returns True -> 409."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    with _stripe_mocks() as stripe_mock:
        stripe_mock.PaymentMethod.retrieve.return_value = MagicMock(
            card=MagicMock(fingerprint="fp_dup"),
        )

        with (
            patch(f"{_MOD}.check_duplicate", new_callable=AsyncMock, return_value=True),
            patch(f"{_MOD}.TrainingUser") as MockTU,
        ):
            MockTU.find_one = AsyncMock(return_value=None)

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test",
            ) as ac:
                resp = await ac.post("/api/v1/training/auth/signup-with-trial", json={
                    "email": "blocked@foo.com", "password": "pw12345678",
                    "org_name": "XCorp", "selected_tier": "team",
                    "stripe_payment_method_id": "pm_test",
                })

    assert resp.status_code == 409
    assert "trial has already been used" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_signup_rejects_existing_email():
    """Email already in TrainingUser -> 409."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    with patch(f"{_MOD}.TrainingUser") as MockTU:
        MockTU.find_one = AsyncMock(return_value=MagicMock())

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test",
        ) as ac:
            resp = await ac.post("/api/v1/training/auth/signup-with-trial", json=_VALID_BODY)

    assert resp.status_code == 409
    assert "already registered" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_signup_requires_password_or_id_token():
    """Neither password nor id_token -> 400."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    body = {**_VALID_BODY, "password": None}

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test",
    ) as ac:
        resp = await ac.post("/api/v1/training/auth/signup-with-trial", json=body)

    assert resp.status_code == 400
    assert "password or id_token" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_endpoint_returns_410():
    """Old /register endpoint must return 410 Gone."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test",
    ) as ac:
        resp = await ac.post("/api/v1/training/auth/register", json={
            "email": "x@y.com", "password": "12345678",
            "org_name": "Test", "display_name": "Test User",
        })

    assert resp.status_code == 410
    assert "signup-with-trial" in resp.json()["detail"]


_OAUTH_BODY = {
    "id_token": "fake_oauth_token",
    "org_name": "OAuth Corp",
    "selected_tier": "team",
    "stripe_payment_method_id": "pm_oauth",
}


def _oauth_happy_path_patches(email: str, provider: str):
    """Return a combined context manager stack for OAuth trial signup tests."""
    from contextlib import contextmanager

    @contextmanager
    def _ctx():
        with (
            patch(f"{_MOD}.verify_oauth_email", new_callable=AsyncMock, return_value=email),
            _stripe_mocks() as stripe_mock,
            patch(f"{_MOD}.PlatformConfig") as MockPC,
            patch(f"{_MOD}.check_duplicate", new_callable=AsyncMock, return_value=False),
            patch(f"{_MOD}.partner_service") as mock_ps,
            patch(f"{_MOD}.seed_sample_content", new_callable=AsyncMock),
            patch(f"{_MOD}.TrainingUser") as MockTU,
            patch(f"{_MOD}.TrialHistory") as MockTH,
            patch(f"{_MOD}.create_training_token", return_value="tok_access"),
            patch(f"{_MOD}.create_training_refresh_token", return_value="tok_refresh"),
        ):
            stripe_mock.PaymentMethod.retrieve.return_value = MagicMock(
                card=MagicMock(fingerprint="fp_oauth"),
            )
            stripe_mock.Customer.create.return_value = MagicMock(id="cus_o")
            stripe_mock.PaymentMethod.attach.return_value = None
            stripe_mock.Customer.modify.return_value = None
            stripe_mock.Subscription.create.return_value = MagicMock(
                id="sub_o", status="trialing",
            )
            MockPC.get_singleton = AsyncMock(return_value=_mock_platform_config())
            user_inst = MagicMock()
            user_inst.id, user_inst.email = "u_o", email
            user_inst.role, user_inst.display_name = "admin", email.split("@")[0]
            user_inst.partner_id = "training-oauth-test"
            user_inst.insert = AsyncMock()
            MockTU.return_value = user_inst
            MockTU.find_one = AsyncMock(return_value=None)
            th_inst = MagicMock()
            th_inst.insert = AsyncMock()
            MockTH.return_value = th_inst
            partner_inst = MagicMock()
            partner_inst.save = AsyncMock()
            mock_ps.create_partner = AsyncMock(return_value=(partner_inst, "key"))
            mock_ps.get_training_tier_defaults.return_value = {}
            yield
    return _ctx()


@pytest.mark.asyncio
async def test_google_trial_signup():
    """Google OAuth trial signup creates partner and returns tokens."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    with _oauth_happy_path_patches("g@foo.com", "google"):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test",
        ) as ac:
            resp = await ac.post(
                "/api/v1/training/auth/signup-with-google-trial",
                json=_OAUTH_BODY,
            )

    assert resp.status_code == 201
    data = resp.json()
    assert data["access_token"] == "tok_access"
    assert data["organization"]["tier"] == "trial"
    assert data["user"]["email"] == "g@foo.com"


@pytest.mark.asyncio
async def test_apple_trial_signup():
    """Apple OAuth trial signup creates partner and returns tokens."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    with _oauth_happy_path_patches("a@bar.com", "apple"):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test",
        ) as ac:
            resp = await ac.post(
                "/api/v1/training/auth/signup-with-apple-trial",
                json=_OAUTH_BODY,
            )

    assert resp.status_code == 201
    data = resp.json()
    assert data["access_token"] == "tok_access"
    assert data["organization"]["tier"] == "trial"
    assert data["user"]["email"] == "a@bar.com"
