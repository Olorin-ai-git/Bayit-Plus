"""
Integration tests for Playback Session API.
"""

import pytest
import pytest_asyncio
from beanie import init_beanie
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.main import app
from app.models.playback_session import PlaybackSession
from app.models.user import User


@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_playback_session_api"

    # Initialize Beanie with models
    await init_beanie(
        database=client[test_db_name],
        document_models=[User, PlaybackSession],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def basic_user(db_client):
    """Create a basic plan user (1 stream) and return auth token."""
    from app.core.security import create_access_token, get_password_hash

    user = User(
        email="basic@example.com",
        name="Basic User",
        hashed_password=get_password_hash("password123"),
        subscription_tier="basic",
        is_active=True,
    )
    await user.insert()

    token = create_access_token(data={"sub": str(user.id)})
    return {"user": user, "token": token}


@pytest_asyncio.fixture
async def premium_user(db_client):
    """Create a premium plan user (2 streams) and return auth token."""
    from app.core.security import create_access_token, get_password_hash

    user = User(
        email="premium@example.com",
        name="Premium User",
        hashed_password=get_password_hash("password123"),
        subscription_tier="premium",
        is_active=True,
    )
    await user.insert()

    token = create_access_token(data={"sub": str(user.id)})
    return {"user": user, "token": token}


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.mark.asyncio
async def test_start_session(db_client, premium_user, client):
    """Test starting a playback session."""
    token = premium_user["token"]

    response = client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device123",
            "content_id": "content456",
            "content_type": "vod",
            "device_name": "iPhone 15 Pro",
            "ip_address": "192.168.1.1",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["device_id"] == "device123"
    assert data["content_id"] == "content456"
    assert data["content_type"] == "vod"


@pytest.mark.asyncio
async def test_basic_user_concurrent_limit(db_client, basic_user, client):
    """Test that basic user (1 stream) is blocked on 2nd stream."""
    token = basic_user["token"]

    # Start first session (should succeed)
    response1 = client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device1",
            "content_id": "content1",
            "content_type": "vod",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response1.status_code == 200

    # Try to start second session (should fail with 403)
    response2 = client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device2",
            "content_id": "content2",
            "content_type": "vod",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response2.status_code == 403

    # Verify error details
    error_data = response2.json()["detail"]
    assert error_data["code"] == "CONCURRENT_STREAM_LIMIT_EXCEEDED"
    assert error_data["max_streams"] == 1
    assert error_data["active_sessions"] == 1
    assert len(error_data["active_devices"]) == 1


@pytest.mark.asyncio
async def test_premium_user_allows_2_streams(db_client, premium_user, client):
    """Test that premium user can start 2 concurrent streams."""
    token = premium_user["token"]

    # Start first session
    response1 = client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device1",
            "content_id": "content1",
            "content_type": "vod",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response1.status_code == 200

    # Start second session (should succeed)
    response2 = client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device2",
            "content_id": "content2",
            "content_type": "live",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response2.status_code == 200

    # Try to start third session (should fail)
    response3 = client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device3",
            "content_id": "content3",
            "content_type": "vod",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response3.status_code == 403


@pytest.mark.asyncio
async def test_end_session(db_client, premium_user, client):
    """Test ending a playback session."""
    token = premium_user["token"]

    # Start session
    start_response = client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device1",
            "content_id": "content1",
            "content_type": "vod",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    session_id = start_response.json()["id"]

    # End session
    end_response = client.post(
        "/api/v1/playback/session/end",
        json={"session_id": session_id},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert end_response.status_code == 200
    data = end_response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_end_session_frees_slot(db_client, basic_user, client):
    """Test that ending a session frees up a stream slot."""
    token = basic_user["token"]

    # Start first session
    start_response = client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device1",
            "content_id": "content1",
            "content_type": "vod",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    session_id = start_response.json()["id"]

    # Second session should fail (basic user limit)
    response2 = client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device2",
            "content_id": "content2",
            "content_type": "vod",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response2.status_code == 403

    # End first session
    client.post(
        "/api/v1/playback/session/end",
        json={"session_id": session_id},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Now second session should succeed
    response3 = client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device2",
            "content_id": "content2",
            "content_type": "vod",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response3.status_code == 200


@pytest.mark.asyncio
async def test_update_heartbeat(db_client, premium_user, client):
    """Test updating session heartbeat."""
    token = premium_user["token"]

    # Start session
    start_response = client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device1",
            "content_id": "content1",
            "content_type": "vod",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    session_id = start_response.json()["id"]

    # Update heartbeat
    heartbeat_response = client.post(
        "/api/v1/playback/session/heartbeat",
        json={"session_id": session_id},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert heartbeat_response.status_code == 200
    data = heartbeat_response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_get_active_sessions(db_client, premium_user, client):
    """Test getting all active sessions for a user."""
    token = premium_user["token"]

    # Start 2 sessions
    client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device1",
            "content_id": "content1",
            "content_type": "vod",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device2",
            "content_id": "content2",
            "content_type": "live",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # Get active sessions
    response = client.get(
        "/api/v1/playback/session/active",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 2
    assert data["max_streams"] == 2
    assert data["available_streams"] == 0
    assert len(data["sessions"]) == 2


@pytest.mark.asyncio
async def test_get_session_summary(db_client, premium_user, client):
    """Test getting session summary."""
    token = premium_user["token"]

    # Start 1 session
    client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device1",
            "content_id": "content1",
            "content_type": "vod",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # Get summary
    response = client.get(
        "/api/v1/playback/session/summary",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["subscription_tier"] == "premium"
    assert data["max_concurrent_streams"] == 2
    assert data["active_sessions_count"] == 1
    assert data["available_streams"] == 1


@pytest.mark.asyncio
async def test_start_session_requires_auth(client):
    """Test that starting a session requires authentication."""
    response = client.post(
        "/api/v1/playback/session/start",
        json={
            "device_id": "device1",
            "content_id": "content1",
            "content_type": "vod",
        },
    )

    assert response.status_code == 401  # Unauthorized
