"""
Integration tests for Device Management API.
"""

import pytest
import pytest_asyncio
from beanie import init_beanie
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.main import app
from app.models.user import User


@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_devices_api"

    # Initialize Beanie with User model
    await init_beanie(
        database=client[test_db_name],
        document_models=[User],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def test_user(db_client):
    """Create a test user and return auth token."""
    from app.core.security import create_access_token, get_password_hash

    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password=get_password_hash("password123"),
        subscription_tier="premium",
        is_active=True,
    )
    await user.insert()

    # Create access token
    token = create_access_token(data={"sub": str(user.id)})

    return {"user": user, "token": token}


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.mark.asyncio
async def test_register_device(db_client, test_user, client):
    """Test registering a new device."""
    token = test_user["token"]

    response = client.post(
        "/api/v1/devices/register",
        json={
            "device_id": "test_device_123",
            "device_name": "iPhone 15 Pro",
            "device_type": "mobile",
            "browser": "Safari",
            "os": "iOS 17.2",
            "platform": "iOS",
            "ip_address": "192.168.1.1",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["device_id"] == "test_device_123"
    assert data["device_name"] == "iPhone 15 Pro"
    assert data["device_type"] == "mobile"


@pytest.mark.asyncio
async def test_list_devices(db_client, test_user, client):
    """Test listing all devices for a user."""
    token = test_user["token"]

    # Register 2 devices first
    client.post(
        "/api/v1/devices/register",
        json={
            "device_id": "device1",
            "device_name": "iPhone",
            "device_type": "mobile",
            "platform": "iOS",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    client.post(
        "/api/v1/devices/register",
        json={
            "device_id": "device2",
            "device_name": "Chrome",
            "device_type": "desktop",
            "platform": "Web",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # List devices
    response = client.get(
        "/api/v1/devices",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["devices"]) == 2


@pytest.mark.asyncio
async def test_unregister_device(db_client, test_user, client):
    """Test unregistering a device."""
    token = test_user["token"]

    # Register device first
    client.post(
        "/api/v1/devices/register",
        json={
            "device_id": "device_to_remove",
            "device_name": "Old Device",
            "device_type": "mobile",
            "platform": "iOS",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # Unregister device
    response = client.delete(
        "/api/v1/devices/device_to_remove",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify device was removed
    list_response = client.get(
        "/api/v1/devices",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_response.json()["total"] == 0


@pytest.mark.asyncio
async def test_update_device_heartbeat(db_client, test_user, client):
    """Test updating device heartbeat."""
    token = test_user["token"]

    # Register device first
    client.post(
        "/api/v1/devices/register",
        json={
            "device_id": "device_heartbeat",
            "device_name": "Test Device",
            "device_type": "mobile",
            "platform": "iOS",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # Update heartbeat
    response = client.post(
        "/api/v1/devices/heartbeat",
        json={"device_id": "device_heartbeat"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_unregister_device_with_active_sessions(db_client, test_user, client):
    """Test that unregistering a device terminates active sessions."""
    from app.models.playback_session import PlaybackSession

    token = test_user["token"]
    user = test_user["user"]

    # Register device
    client.post(
        "/api/v1/devices/register",
        json={
            "device_id": "device_with_session",
            "device_name": "Test Device",
            "device_type": "mobile",
            "platform": "iOS",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # Create an active playback session for this device
    session = PlaybackSession(
        user_id=str(user.id),
        device_id="device_with_session",
        content_id="content123",
        content_type="vod",
    )
    await session.insert()

    # Unregister device
    response = client.delete(
        "/api/v1/devices/device_with_session",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["terminated_sessions"] == 1

    # Verify session was ended
    ended_session = await PlaybackSession.get(session.id)
    assert ended_session.ended_at is not None


@pytest.mark.asyncio
async def test_register_device_requires_auth(client):
    """Test that registering a device requires authentication."""
    response = client.post(
        "/api/v1/devices/register",
        json={
            "device_id": "test_device",
            "device_name": "Test",
            "device_type": "mobile",
            "platform": "iOS",
        },
    )

    assert response.status_code == 401  # Unauthorized
