"""Tests for superadmin role gating and CRUD routes — Tasks 3 & 4."""

import pytest
from httpx import AsyncClient


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
