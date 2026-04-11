"""TDD tests for superadmin role and auth gating — Task 3."""

import pytest
from httpx import AsyncClient


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
