"""
Integration tests for Diagnostics API.
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone
from beanie import init_beanie
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

from app.main import app
from app.models.user import User
from app.models.diagnostics import (
    ClientHeartbeat,
    ClientHealthHistory,
    ClientAlert,
    ClientType,
    ClientStatus,
)


@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_diagnostics_api"

    # Initialize Beanie with all required models
    await init_beanie(
        database=client[test_db_name],
        document_models=[
            User,
            ClientHeartbeat,
            ClientHealthHistory,
            ClientAlert,
        ],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def test_admin_user(db_client):
    """Create a test admin user and return auth token."""
    from app.core.security import create_access_token, get_password_hash

    user = User(
        email="admin@example.com",
        name="Admin User",
        hashed_password=get_password_hash("admin123"),
        role="admin",  # Admin role automatically has all permissions
        is_active=True,
    )
    await user.insert()

    # Create access token
    token = create_access_token(data={"sub": str(user.id)})

    return {"user": user, "token": token}


@pytest_asyncio.fixture
async def test_regular_user(db_client):
    """Create a test regular user and return auth token."""
    from app.core.security import create_access_token, get_password_hash

    user = User(
        email="user@example.com",
        name="Regular User",
        hashed_password=get_password_hash("user123"),
        role="user",
        is_active=True,
    )
    await user.insert()

    # Create access token
    token = create_access_token(data={"sub": str(user.id)})

    return {"user": user, "token": token}


# ============================================
# Heartbeat Endpoint Tests
# ============================================


@pytest.mark.asyncio
async def test_submit_heartbeat(db_client, test_regular_user):
    """Test submitting client heartbeat telemetry."""
    token = test_regular_user["token"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/diagnostics/heartbeat",
            json={
                "client_type": "web",
                "client_id": "test-web-client-1",
                "client_version": "1.0.0",
                "metrics": {
                    "cpu_usage": 45.5,
                    "memory_usage": 68.2,
                    "network_latency": 120.0,
                    "error_count": 0,
                    "active_users": 1,
                },
                "api_latency": 85.5,
            },
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["message"] == "Heartbeat recorded"
    assert data["next_heartbeat_interval_seconds"] == 10


@pytest.mark.asyncio
async def test_submit_heartbeat_updates_existing(db_client, test_regular_user):
    """Test that subsequent heartbeats update existing record."""
    token = test_regular_user["token"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # First heartbeat
        response1 = await ac.post(
            "/api/v1/diagnostics/heartbeat",
            json={
                "client_type": "ios",
                "client_id": "test-ios-client-1",
                "client_version": "1.0.0",
                "metrics": {
                    "cpu_usage": 30.0,
                    "memory_usage": 50.0,
                    "error_count": 0,
                    "active_users": 1,
                },
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response1.status_code == 200

        # Second heartbeat with different metrics
        response2 = await ac.post(
            "/api/v1/diagnostics/heartbeat",
            json={
                "client_type": "ios",
                "client_id": "test-ios-client-1",
                "client_version": "1.0.1",
                "metrics": {
                    "cpu_usage": 60.0,
                    "memory_usage": 75.0,
                    "error_count": 2,
                    "active_users": 1,
                },
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response2.status_code == 200


# ============================================
# Get Clients Endpoint Tests
# ============================================


@pytest.mark.asyncio
async def test_get_clients_as_admin(db_client, test_admin_user):
    """Test getting all client statuses as admin."""
    token = test_admin_user["token"]

    # Create some test heartbeats
    await ClientHeartbeat(
        client_type=ClientType.WEB,
        client_id="web-1",
        client_version="1.0.0",
        status=ClientStatus.ONLINE,
        metrics={"cpu_usage": 40.0, "memory_usage": 60.0, "error_count": 0, "active_users": 5},
        timestamp=datetime.now(timezone.utc),
        last_seen=datetime.now(timezone.utc),
    ).insert()

    await ClientHeartbeat(
        client_type=ClientType.IOS,
        client_id="ios-1",
        client_version="1.0.0",
        status=ClientStatus.ONLINE,
        metrics={"cpu_usage": 30.0, "memory_usage": 50.0, "error_count": 0, "active_users": 2},
        timestamp=datetime.now(timezone.utc),
        last_seen=datetime.now(timezone.utc),
    ).insert()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/diagnostics/clients",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "web" in data
    assert "ios" in data
    assert len(data["web"]) == 1
    assert len(data["ios"]) == 1

    # Verify web client data
    web_client = data["web"][0]
    assert web_client["client_id"] == "web-1"
    assert web_client["status"] == "online"
    assert web_client["metrics"]["cpu_usage"] == 40.0


@pytest.mark.asyncio
async def test_get_clients_requires_admin(db_client, test_regular_user):
    """Test that regular users cannot access clients endpoint."""
    token = test_regular_user["token"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/diagnostics/clients",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 403


# ============================================
# Get Backend Services Endpoint Tests
# ============================================


@pytest.mark.asyncio
async def test_get_backend_services_as_admin(db_client, test_admin_user):
    """Test getting backend service health as admin."""
    token = test_admin_user["token"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/diagnostics/backend-services",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    data = response.json()

    # Verify MongoDB service is included
    assert "mongodb" in data
    mongodb_service = data["mongodb"]
    assert "service_name" in mongodb_service or "status" in mongodb_service


@pytest.mark.asyncio
async def test_get_backend_services_requires_admin(db_client, test_regular_user):
    """Test that regular users cannot access backend services endpoint."""
    token = test_regular_user["token"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/diagnostics/backend-services",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 403


# ============================================
# Ping Clients Endpoint Tests
# ============================================


@pytest.mark.asyncio
async def test_ping_clients_as_admin(db_client, test_admin_user):
    """Test triggering ping to specific client type."""
    token = test_admin_user["token"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/diagnostics/ping/web",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    data = response.json()

    assert data["client_type"] == "web"
    assert data["status"] == "ping_sent"
    assert "ping_sent_at" in data


@pytest.mark.asyncio
async def test_ping_clients_requires_admin_manage(db_client, test_regular_user):
    """Test that regular users cannot trigger pings."""
    token = test_regular_user["token"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/diagnostics/ping/web",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 403


# ============================================
# Analytics Endpoint Tests
# ============================================


@pytest.mark.asyncio
async def test_get_analytics_as_admin(db_client, test_admin_user):
    """Test getting aggregate analytics and trends."""
    token = test_admin_user["token"]

    # Create some test heartbeats
    for i in range(5):
        await ClientHeartbeat(
            client_type=ClientType.WEB,
            client_id=f"web-{i}",
            client_version="1.0.0",
            status=ClientStatus.ONLINE,
            metrics={
                "cpu_usage": 40.0 + i * 5,
                "memory_usage": 50.0 + i * 5,
                "error_count": i,
                "active_users": i + 1,
            },
            timestamp=datetime.now(timezone.utc),
            last_seen=datetime.now(timezone.utc),
        ).insert()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/diagnostics/analytics?time_range=1h",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    data = response.json()

    assert data["time_range"] == "1h"
    assert data["total_heartbeats"] == 5
    assert data["unique_clients"] == 5
    assert "avg_metrics" in data
    assert data["avg_metrics"]["cpu_usage"] > 0
    assert data["avg_metrics"]["memory_usage"] > 0


@pytest.mark.asyncio
async def test_get_analytics_different_time_ranges(db_client, test_admin_user):
    """Test analytics with different time ranges."""
    token = test_admin_user["token"]

    time_ranges = ["15m", "1h", "6h", "24h"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for time_range in time_ranges:
            response = await ac.get(
                f"/api/v1/diagnostics/analytics?time_range={time_range}",
                headers={"Authorization": f"Bearer {token}"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["time_range"] == time_range
