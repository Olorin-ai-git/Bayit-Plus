"""
Unit tests for SessionManager service.
"""

from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models.playback_session import PlaybackSession
from app.models.user import User
from app.services.session_manager import (
    ConcurrentStreamLimitError,
    SessionManager,
    session_manager,
)


@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_session_manager"

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
    """Create a test user with basic plan (1 stream)."""
    user = User(
        email="basic@example.com",
        name="Basic User",
        hashed_password="hashed",
        subscription_tier="basic",
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def premium_user(db_client):
    """Create a test user with premium plan (2 streams)."""
    user = User(
        email="premium@example.com",
        name="Premium User",
        hashed_password="hashed",
        subscription_tier="premium",
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def family_user(db_client):
    """Create a test user with family plan (4 streams)."""
    user = User(
        email="family@example.com",
        name="Family User",
        hashed_password="hashed",
        subscription_tier="family",
    )
    await user.insert()
    return user


@pytest.mark.asyncio
async def test_start_session_basic_user(db_client, basic_user):
    """Test starting a session for a basic user."""
    manager = SessionManager()

    session = await manager.start_session(
        user_id=str(basic_user.id),
        device_id="device1",
        content_id="content123",
        content_type="vod",
        device_name="iPhone",
    )

    # Verify session was created
    assert session.id is not None
    assert session.user_id == str(basic_user.id)
    assert session.device_id == "device1"
    assert session.content_id == "content123"
    assert session.content_type == "vod"
    assert session.device_name == "iPhone"
    assert session.ended_at is None


@pytest.mark.asyncio
async def test_basic_user_exceeds_limit(db_client, basic_user):
    """Test that basic user (1 stream) is blocked when trying 2nd stream."""
    manager = SessionManager()

    # Start first session (should succeed)
    await manager.start_session(
        user_id=str(basic_user.id),
        device_id="device1",
        content_id="content1",
        content_type="vod",
    )

    # Try to start second session (should fail)
    with pytest.raises(ConcurrentStreamLimitError) as exc_info:
        await manager.start_session(
            user_id=str(basic_user.id),
            device_id="device2",
            content_id="content2",
            content_type="vod",
        )

    # Verify error details
    error = exc_info.value
    assert error.max_streams == 1
    assert error.active_sessions == 1
    assert len(error.active_devices) == 1
    assert error.active_devices[0]["device_id"] == "device1"


@pytest.mark.asyncio
async def test_premium_user_allows_2_streams(db_client, premium_user):
    """Test that premium user can have 2 concurrent streams."""
    manager = SessionManager()

    # Start first session
    session1 = await manager.start_session(
        user_id=str(premium_user.id),
        device_id="device1",
        content_id="content1",
        content_type="vod",
    )

    # Start second session (should succeed)
    session2 = await manager.start_session(
        user_id=str(premium_user.id),
        device_id="device2",
        content_id="content2",
        content_type="live",
    )

    # Both sessions should be active
    assert session1.id != session2.id
    active_sessions = await manager.get_active_sessions(str(premium_user.id))
    assert len(active_sessions) == 2


@pytest.mark.asyncio
async def test_premium_user_exceeds_limit(db_client, premium_user):
    """Test that premium user (2 streams) is blocked when trying 3rd stream."""
    manager = SessionManager()

    # Start 2 sessions (should succeed)
    await manager.start_session(
        user_id=str(premium_user.id),
        device_id="device1",
        content_id="content1",
        content_type="vod",
    )
    await manager.start_session(
        user_id=str(premium_user.id),
        device_id="device2",
        content_id="content2",
        content_type="vod",
    )

    # Try to start third session (should fail)
    with pytest.raises(ConcurrentStreamLimitError) as exc_info:
        await manager.start_session(
            user_id=str(premium_user.id),
            device_id="device3",
            content_id="content3",
            content_type="vod",
        )

    error = exc_info.value
    assert error.max_streams == 2
    assert error.active_sessions == 2


@pytest.mark.asyncio
async def test_family_user_allows_4_streams(db_client, family_user):
    """Test that family user can have 4 concurrent streams."""
    manager = SessionManager()

    # Start 4 sessions (should all succeed)
    for i in range(4):
        await manager.start_session(
            user_id=str(family_user.id),
            device_id=f"device{i+1}",
            content_id=f"content{i+1}",
            content_type="vod",
        )

    # All 4 sessions should be active
    active_sessions = await manager.get_active_sessions(str(family_user.id))
    assert len(active_sessions) == 4


@pytest.mark.asyncio
async def test_end_session(db_client, premium_user):
    """Test ending a session."""
    manager = SessionManager()

    # Start session
    session = await manager.start_session(
        user_id=str(premium_user.id),
        device_id="device1",
        content_id="content1",
        content_type="vod",
    )

    # End session
    result = await manager.end_session(str(session.id))
    assert result is True

    # Verify session was ended
    ended_session = await PlaybackSession.get(session.id)
    assert ended_session.ended_at is not None
    assert not ended_session.is_active()


@pytest.mark.asyncio
async def test_end_session_frees_slot(db_client, basic_user):
    """Test that ending a session frees up a stream slot."""
    manager = SessionManager()

    # Start first session
    session1 = await manager.start_session(
        user_id=str(basic_user.id),
        device_id="device1",
        content_id="content1",
        content_type="vod",
    )

    # Second session should fail (basic user has 1 stream limit)
    with pytest.raises(ConcurrentStreamLimitError):
        await manager.start_session(
            user_id=str(basic_user.id),
            device_id="device2",
            content_id="content2",
            content_type="vod",
        )

    # End first session
    await manager.end_session(str(session1.id))

    # Now second session should succeed
    session2 = await manager.start_session(
        user_id=str(basic_user.id),
        device_id="device2",
        content_id="content2",
        content_type="vod",
    )
    assert session2.id is not None


@pytest.mark.asyncio
async def test_update_heartbeat(db_client, premium_user):
    """Test updating session heartbeat."""
    manager = SessionManager()

    # Start session
    session = await manager.start_session(
        user_id=str(premium_user.id),
        device_id="device1",
        content_id="content1",
        content_type="vod",
    )

    # Get original heartbeat time
    original_heartbeat = session.last_heartbeat

    # Wait and update heartbeat
    import asyncio

    await asyncio.sleep(0.1)
    result = await manager.update_heartbeat(str(session.id))
    assert result is True

    # Verify heartbeat was updated
    updated_session = await PlaybackSession.get(session.id)
    assert updated_session.last_heartbeat > original_heartbeat


@pytest.mark.asyncio
async def test_get_active_sessions_excludes_stale(db_client, premium_user):
    """Test that get_active_sessions excludes stale sessions."""
    # Create session with stale heartbeat (5 minutes ago)
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    stale_session = PlaybackSession(
        user_id=str(premium_user.id),
        device_id="device1",
        content_id="content1",
        content_type="vod",
        started_at=stale_time,
        last_heartbeat=stale_time,
    )
    await stale_session.insert()

    # Create session with recent heartbeat
    recent_session = PlaybackSession(
        user_id=str(premium_user.id),
        device_id="device2",
        content_id="content2",
        content_type="vod",
    )
    await recent_session.insert()

    # Get active sessions (2-minute timeout)
    manager = SessionManager()
    active_sessions = await manager.get_active_sessions(str(premium_user.id))

    # Should only return recent session
    assert len(active_sessions) == 1
    assert active_sessions[0].device_id == "device2"


@pytest.mark.asyncio
async def test_terminate_device_sessions(db_client, premium_user):
    """Test terminating all sessions on a specific device."""
    manager = SessionManager()

    # Start 2 sessions on different devices
    await manager.start_session(
        user_id=str(premium_user.id),
        device_id="device1",
        content_id="content1",
        content_type="vod",
    )
    await manager.start_session(
        user_id=str(premium_user.id),
        device_id="device2",
        content_id="content2",
        content_type="vod",
    )

    # Terminate sessions on device1
    terminated = await manager.terminate_device_sessions(
        str(premium_user.id), "device1"
    )
    assert terminated == 1

    # Only device2 session should remain active
    active_sessions = await manager.get_active_sessions(str(premium_user.id))
    assert len(active_sessions) == 1
    assert active_sessions[0].device_id == "device2"


@pytest.mark.asyncio
async def test_cleanup_stale_sessions(db_client, premium_user):
    """Test cleanup of stale sessions."""
    # Create stale session (5 minutes ago)
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    stale_session = PlaybackSession(
        user_id=str(premium_user.id),
        device_id="device1",
        content_id="content1",
        content_type="vod",
        started_at=stale_time,
        last_heartbeat=stale_time,
    )
    await stale_session.insert()

    # Create recent session
    recent_session = PlaybackSession(
        user_id=str(premium_user.id),
        device_id="device2",
        content_id="content2",
        content_type="vod",
    )
    await recent_session.insert()

    # Run cleanup (2-minute timeout)
    manager = SessionManager()
    cleaned = await manager.cleanup_stale_sessions(timeout_seconds=120)
    assert cleaned == 1

    # Verify stale session was ended
    stale = await PlaybackSession.get(stale_session.id)
    assert stale.ended_at is not None

    # Verify recent session was not affected
    recent = await PlaybackSession.get(recent_session.id)
    assert recent.ended_at is None


@pytest.mark.asyncio
async def test_get_session_summary(db_client, premium_user):
    """Test getting session summary for a user."""
    manager = SessionManager()

    # Start 1 session (premium user has limit of 2)
    await manager.start_session(
        user_id=str(premium_user.id),
        device_id="device1",
        content_id="content1",
        content_type="vod",
    )

    # Get summary
    summary = await manager.get_session_summary(str(premium_user.id))

    assert summary["user_id"] == str(premium_user.id)
    assert summary["subscription_tier"] == "premium"
    assert summary["max_concurrent_streams"] == 2
    assert summary["active_sessions_count"] == 1
    assert summary["available_streams"] == 1
    assert len(summary["active_sessions"]) == 1


@pytest.mark.asyncio
async def test_get_active_sessions_count(db_client, premium_user):
    """Test getting count of active sessions."""
    manager = SessionManager()

    # Start 2 sessions
    await manager.start_session(
        user_id=str(premium_user.id),
        device_id="device1",
        content_id="content1",
        content_type="vod",
    )
    await manager.start_session(
        user_id=str(premium_user.id),
        device_id="device2",
        content_id="content2",
        content_type="vod",
    )

    # Get count
    count = await manager.get_active_sessions_count(str(premium_user.id))
    assert count == 2
