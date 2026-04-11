"""Tests for superadmin role gating and CRUD routes — Tasks 3, 4 & 5."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient

from app.models.platform_config import PlatformConfig


# ── Auth gating (Task 3) ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_superadmin_route_requires_superadmin_role(training_admin_client: AsyncClient):
    """Regular admin must get 403 on superadmin routes."""
    response = await training_admin_client.get("/api/v1/training/superadmin/config")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_superadmin_route_allows_superadmin_role(training_superadmin_client: AsyncClient):
    """Superadmin gets 200 on superadmin config route."""
    response = await training_superadmin_client.get("/api/v1/training/superadmin/config")
    assert response.status_code == 200


# ── Config CRUD (Task 4) ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_config_returns_defaults(training_superadmin_client: AsyncClient):
    """GET /superadmin/config returns full config with default values."""
    response = await training_superadmin_client.get("/api/v1/training/superadmin/config")
    assert response.status_code == 200
    data = response.json()
    assert data["tier_limits"]["team"] == 500
    assert len(data["format_costs"]) == 6
    assert len(data["feature_costs"]) == 8
    assert len(data["subscription_plans"]) == 2


@pytest.mark.asyncio
async def test_put_config_updates_tier_limits(training_superadmin_client: AsyncClient):
    """PUT /superadmin/config persists updated tier limits."""
    response = await training_superadmin_client.put(
        "/api/v1/training/superadmin/config",
        json={"tier_limits": {"free": 50, "team": 600, "organization": 2000, "enterprise": 10000}},
    )
    assert response.status_code == 200
    assert response.json()["tier_limits"]["team"] == 600


@pytest.mark.asyncio
async def test_put_config_rejects_negative_credits(training_superadmin_client: AsyncClient):
    """PUT /superadmin/config rejects negative tier_limits values."""
    response = await training_superadmin_client.put(
        "/api/v1/training/superadmin/config",
        json={"tier_limits": {"team": -1}},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_put_config_rejects_invalid_stripe_id(training_superadmin_client: AsyncClient):
    """PUT /superadmin/config rejects malformed Stripe Price IDs."""
    response = await training_superadmin_client.put(
        "/api/v1/training/superadmin/config",
        json={
            "subscription_plans": [
                {
                    "id": "team",
                    "name": "Team",
                    "price_monthly": 349,
                    "price_annual": 279,
                    "stripe_price_id_monthly": "bad_id",
                    "stripe_price_id_annual": "",
                }
            ]
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_public_credits_omits_stripe_ids(async_client: AsyncClient):
    """GET /config/credits returns plan display prices but no Stripe IDs."""
    response = await async_client.get("/api/v1/training/config/credits")
    assert response.status_code == 200
    data = response.json()
    for plan in data["subscription_plans"]:
        assert "stripe_price_id_monthly" not in plan
        assert "stripe_price_id_annual" not in plan
    assert len(data["feature_costs"]) == 8


# ── Checkout reads from PlatformConfig (Task 5) ───────────────────────────────


@pytest.mark.asyncio
async def test_checkout_uses_platform_config_price_id(
    training_admin_client: AsyncClient,
):
    """After setting a Stripe Price ID in PlatformConfig, checkout must use it."""
    import app.api.routes.training.checkout as checkout_module

    captured_price_ids: list[str] = []

    def fake_create_stripe_session(**kwargs):
        line_items = kwargs.get("line_items", [{}])
        captured_price_ids.append(line_items[0].get("price") if line_items else None)
        session = MagicMock()
        session.url = "https://stripe.com/fake-session"
        return session

    fake_partner = MagicMock()
    fake_partner.partner_id = "training-testorg-abc12345"
    fake_partner.training_config = {"stripe_customer_id": "cus_existing123"}

    fake_cfg = MagicMock(spec=PlatformConfig)
    team_plan = MagicMock()
    team_plan.id = "team"
    team_plan.stripe_price_id_monthly = "price_test_team_monthly"
    team_plan.stripe_price_id_annual = "price_test_team_annual"
    fake_cfg.subscription_plans = [team_plan]

    with (
        patch(
            "app.api.routes.training.checkout.PlatformConfig.get_singleton",
            new=AsyncMock(return_value=fake_cfg),
        ),
        patch(
            "app.api.routes.training.checkout.IntegrationPartner.find_one",
            new=AsyncMock(return_value=fake_partner),
        ),
        patch.object(
            checkout_module.stripe.checkout.Session,
            "create",
            side_effect=fake_create_stripe_session,
        ),
    ):
        response = await training_admin_client.post(
            "/api/v1/training/checkout/create-session",
            json={"tier": "team", "billing_period": "monthly"},
        )

    assert response.status_code == 200
    assert response.json()["checkout_url"] == "https://stripe.com/fake-session"
    assert captured_price_ids == ["price_test_team_monthly"]


# ── _CostAccumulator (Task 6) ──────────────────────────────────────────────────


def test_cost_accumulator_total():
    """_CostAccumulator.total() sums all provider costs with Decimal precision."""
    from decimal import Decimal
    from app.services.olorin.pipeline_cost_tracker import _CostAccumulator

    acc = _CostAccumulator(
        elevenlabs=Decimal("0.14"),
        claude=Decimal("0.03"),
        openai=Decimal("0.01"),
    )
    assert abs(acc.total() - Decimal("0.18")) < Decimal("0.0001")


def test_cost_accumulator_add_elevenlabs_stt():
    """add_elevenlabs_stt accumulates cost proportional to duration."""
    from decimal import Decimal
    from unittest.mock import patch
    from app.services.olorin.pipeline_cost_tracker import _CostAccumulator

    acc = _CostAccumulator()
    with patch(
        "app.services.olorin.pipeline_cost_tracker.settings"
    ) as mock_settings:
        mock_settings.ELEVENLABS_STT_COST_PER_SECOND = 0.0004
        acc.add_elevenlabs_stt(100.0)  # 100 seconds * $0.0004 = $0.04

    assert abs(acc.elevenlabs - Decimal("0.04")) < Decimal("0.0001")
    assert acc.claude == Decimal("0.0")
    assert acc.openai == Decimal("0.0")


def test_cost_accumulator_starts_at_zero():
    """_CostAccumulator initialises all providers at zero."""
    from decimal import Decimal
    from app.services.olorin.pipeline_cost_tracker import _CostAccumulator

    acc = _CostAccumulator()
    assert acc.elevenlabs == Decimal("0.0")
    assert acc.claude == Decimal("0.0")
    assert acc.openai == Decimal("0.0")
    assert acc.total() == Decimal("0.0")


@pytest.mark.asyncio
async def test_checkout_falls_back_to_settings_when_no_platform_config_price(
    training_admin_client: AsyncClient,
):
    """When PlatformConfig has empty Stripe IDs, checkout falls back to settings."""
    import app.api.routes.training.checkout as checkout_module
    from app.core.config import settings

    captured_price_ids: list[str] = []

    def fake_create_stripe_session(**kwargs):
        line_items = kwargs.get("line_items", [{}])
        captured_price_ids.append(line_items[0].get("price") if line_items else None)
        session = MagicMock()
        session.url = "https://stripe.com/fake-session"
        return session

    fake_partner = MagicMock()
    fake_partner.partner_id = "training-testorg-abc12345"
    fake_partner.training_config = {"stripe_customer_id": "cus_existing123"}

    fake_cfg = MagicMock(spec=PlatformConfig)
    team_plan = MagicMock()
    team_plan.id = "team"
    team_plan.stripe_price_id_monthly = ""
    team_plan.stripe_price_id_annual = ""
    fake_cfg.subscription_plans = [team_plan]

    with (
        patch(
            "app.api.routes.training.checkout.PlatformConfig.get_singleton",
            new=AsyncMock(return_value=fake_cfg),
        ),
        patch(
            "app.api.routes.training.checkout.IntegrationPartner.find_one",
            new=AsyncMock(return_value=fake_partner),
        ),
        patch.object(
            checkout_module.stripe.checkout.Session,
            "create",
            side_effect=fake_create_stripe_session,
        ),
    ):
        response = await training_admin_client.post(
            "/api/v1/training/checkout/create-session",
            json={"tier": "team", "billing_period": "monthly"},
        )

    assert response.status_code == 200
    assert captured_price_ids == [settings.STRIPE_PRICE_TRAINING_TEAM]
