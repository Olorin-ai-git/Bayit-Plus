"""
Unit tests for PlaybackSession model and functionality.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models.playback_session import (
    PlaybackSession,
    PlaybackSessionCreate,
    PlaybackSessionResponse,
)


@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_playback_sessions"

    # Initialize Beanie with PlaybackSession model
    await init_beanie(
        database=client[test_db_name],
        document_models=[PlaybackSession],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest.mark.asyncio
async def test_playback_session_create(db_client):
    """Test creating a playback session."""
    session = PlaybackSession(
        user_id="user123",
        device_id="device456",
        content_id="content789",
        content_type="vod",
        device_name="iPhone 15 Pro",
        ip_address="192.168.1.1",
    )
    await session.insert()

    # Verify session was created
    assert session.id is not None
    assert session.user_id == "user123"
    assert session.device_id == "device456"
    assert session.content_id == "content789"
    assert session.content_type == "vod"
    assert session.device_name == "iPhone 15 Pro"
    assert session.ip_address == "192.168.1.1"
    assert session.ended_at is None
    assert isinstance(session.started_at, datetime)
    assert isinstance(session.last_heartbeat, datetime)


@pytest.mark.asyncio
async def test_playback_session_is_active_with_recent_heartbeat(db_client):
    """Test session is active with recent heartbeat."""
    session = PlaybackSession(
        user_id="user123",
        device_id="device456",
        content_id="content789",
        content_type="vod",
    )
    await session.insert()

    # Session should be active (heartbeat is recent)
    assert session.is_active() is True


@pytest.mark.asyncio
async def test_playback_session_is_active_with_stale_heartbeat(db_client):
    """Test session is inactive with stale heartbeat."""
    # Create session with heartbeat 3 minutes ago (stale)
    past_time = datetime.now(timezone.utc) - timedelta(minutes=3)
    session = PlaybackSession(
        user_id="user123",
        device_id="device456",
        content_id="content789",
        content_type="vod",
        started_at=past_time,
        last_heartbeat=past_time,
    )
    await session.insert()

    # Session should be inactive (heartbeat timeout is 2 minutes)
    assert session.is_active(timeout_seconds=120) is False


@pytest.mark.asyncio
async def test_playback_session_is_active_with_ended_session(db_client):
    """Test session is inactive when ended."""
    session = PlaybackSession(
        user_id="user123",
        device_id="device456",
        content_id="content789",
        content_type="vod",
    )
    await session.insert()
    await session.end_session()

    # Session should be inactive (ended)
    assert session.is_active() is False


@pytest.mark.asyncio
async def test_playback_session_update_heartbeat(db_client):
    """Test updating session heartbeat."""
    session = PlaybackSession(
        user_id="user123",
        device_id="device456",
        content_id="content789",
        content_type="vod",
    )
    await session.insert()

    # Get original heartbeat time
    original_heartbeat = session.last_heartbeat

    # Wait a moment and update heartbeat
    import asyncio

    await asyncio.sleep(0.1)
    await session.update_heartbeat()

    # Verify heartbeat was updated
    assert session.last_heartbeat > original_heartbeat


@pytest.mark.asyncio
async def test_playback_session_end_session(db_client):
    """Test ending a playback session."""
    session = PlaybackSession(
        user_id="user123",
        device_id="device456",
        content_id="content789",
        content_type="vod",
    )
    await session.insert()

    # End the session
    await session.end_session()

    # Verify session was ended
    assert session.ended_at is not None
    assert isinstance(session.ended_at, datetime)
    assert session.is_active() is False


@pytest.mark.asyncio
async def test_playback_session_to_response(db_client):
    """Test converting session to response model."""
    session = PlaybackSession(
        user_id="user123",
        device_id="device456",
        content_id="content789",
        content_type="vod",
        device_name="iPhone 15 Pro",
        ip_address="192.168.1.1",
    )
    await session.insert()

    response = session.to_response()

    # Verify response model
    assert isinstance(response, PlaybackSessionResponse)
    assert response.id == str(session.id)
    assert response.user_id == "user123"
    assert response.device_id == "device456"
    assert response.content_id == "content789"
    assert response.content_type == "vod"
    assert response.device_name == "iPhone 15 Pro"
    assert response.ip_address == "192.168.1.1"


@pytest.mark.asyncio
async def test_playback_session_query_active_sessions(db_client):
    """Test querying active sessions for a user."""
    # Create 2 active sessions
    session1 = PlaybackSession(
        user_id="user123",
        device_id="device1",
        content_id="content1",
        content_type="vod",
    )
    await session1.insert()

    session2 = PlaybackSession(
        user_id="user123",
        device_id="device2",
        content_id="content2",
        content_type="live",
    )
    await session2.insert()

    # Create 1 ended session
    session3 = PlaybackSession(
        user_id="user123",
        device_id="device3",
        content_id="content3",
        content_type="vod",
    )
    await session3.insert()
    await session3.end_session()

    # Query active sessions (ended_at is None)
    active_sessions = await PlaybackSession.find(
        PlaybackSession.user_id == "user123", PlaybackSession.ended_at == None
    ).to_list()

    # Should return 2 active sessions
    assert len(active_sessions) == 2
    assert all(s.ended_at is None for s in active_sessions)


@pytest.mark.asyncio
async def test_playback_session_query_stale_sessions(db_client):
    """Test querying stale sessions for cleanup."""
    # Create session with stale heartbeat (5 minutes ago)
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    stale_session = PlaybackSession(
        user_id="user123",
        device_id="device1",
        content_id="content1",
        content_type="vod",
        started_at=stale_time,
        last_heartbeat=stale_time,
    )
    await stale_session.insert()

    # Create session with recent heartbeat
    recent_session = PlaybackSession(
        user_id="user123",
        device_id="device2",
        content_id="content2",
        content_type="vod",
    )
    await recent_session.insert()

    # Query sessions with heartbeat older than 2 minutes
    cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=2)
    stale_sessions = await PlaybackSession.find(
        PlaybackSession.ended_at == None,
        PlaybackSession.last_heartbeat < cutoff_time,
    ).to_list()

    # Should return 1 stale session
    assert len(stale_sessions) == 1
    assert stale_sessions[0].device_id == "device1"
