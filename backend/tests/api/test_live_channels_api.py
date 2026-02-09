"""
Integration tests for Live TV API endpoints.

Tests cover:
- GET /api/v1/live/channels
- GET /api/v1/live/{channelId}
- GET /api/v1/live/{channelId}/stream
- GET /api/v1/live/{channelId}/epg
"""

from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from beanie import init_beanie
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.content import LiveChannel, EPGEntry
from app.models.user import User


@pytest_asyncio.fixture
async def db_client():
    """Create test database client with live TV models."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_live_api"

    await init_beanie(
        database=client[test_db_name],
        document_models=[User, LiveChannel, EPGEntry],
    )

    yield client

    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def premium_user(db_client):
    """Create a premium user with auth token."""
    user = User(
        email="premium@example.com",
        name="Premium User",
        hashed_password=get_password_hash("Test@1234"),
        role="user",
        is_active=True,
        email_verified=True,
        phone_verified=True,
        is_verified=True,
        subscription_tier="premium",
    )
    await user.insert()
    token = create_access_token(data={"sub": str(user.id)})
    return {"user": user, "token": token}


@pytest_asyncio.fixture
async def basic_user(db_client):
    """Create a basic user with auth token."""
    user = User(
        email="basic@example.com",
        name="Basic User",
        hashed_password=get_password_hash("Test@1234"),
        role="user",
        is_active=True,
        email_verified=True,
        phone_verified=True,
        is_verified=True,
        subscription_tier="basic",
    )
    await user.insert()
    token = create_access_token(data={"sub": str(user.id)})
    return {"user": user, "token": token}


@pytest_asyncio.fixture
async def sample_channels(db_client):
    """Create sample live channels for testing."""
    channel1 = LiveChannel(
        name="Channel 12",
        description="Israeli news channel",
        is_active=True,
        stream_url="https://cdn.example.com/ch12.m3u8",
        stream_type="hls",
        category="news",
        culture_id="israeli",
        order=1,
        requires_subscription="basic",
        supports_live_subtitles=True,
        primary_language="he",
        available_translation_languages=["en", "es"],
    )
    await channel1.insert()

    channel2 = LiveChannel(
        name="Premium Sports",
        description="Premium sports channel",
        is_active=True,
        stream_url="https://cdn.example.com/sports.m3u8",
        stream_type="hls",
        category="sports",
        culture_id="israeli",
        order=2,
        requires_subscription="premium",
    )
    await channel2.insert()

    inactive_channel = LiveChannel(
        name="Offline Channel",
        description="This channel is offline",
        is_active=False,
        stream_url="https://cdn.example.com/offline.m3u8",
        stream_type="hls",
        order=99,
    )
    await inactive_channel.insert()

    return {
        "news": channel1,
        "sports": channel2,
        "inactive": inactive_channel,
    }


@pytest_asyncio.fixture
async def sample_epg(db_client, sample_channels):
    """Create sample EPG entries for testing."""
    now = datetime.now(timezone.utc)
    channel_id = str(sample_channels["news"].id)

    current_show = EPGEntry(
        channel_id=channel_id,
        title="Morning News",
        description="Daily morning news broadcast",
        start_time=now - timedelta(minutes=30),
        end_time=now + timedelta(minutes=30),
        category="news",
    )
    await current_show.insert()

    next_show = EPGEntry(
        channel_id=channel_id,
        title="Weather Report",
        description="Today's weather forecast",
        start_time=now + timedelta(minutes=30),
        end_time=now + timedelta(hours=1),
        category="weather",
    )
    await next_show.insert()

    return {"current": current_show, "next": next_show}


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestGetChannels:
    """Tests for GET /api/v1/live/channels."""

    @pytest.mark.asyncio
    async def test_get_channels_returns_active(self, db_client, sample_channels, client):
        """Test listing channels returns only active channels."""
        response = client.get("/api/v1/live/channels")

        assert response.status_code == 200
        data = response.json()
        assert "channels" in data
        assert "total" in data

        names = [ch["name"] for ch in data["channels"]]
        assert "Channel 12" in names
        assert "Offline Channel" not in names

    @pytest.mark.asyncio
    async def test_get_channels_filter_by_culture(self, db_client, sample_channels, client):
        """Test filtering channels by culture ID."""
        response = client.get("/api/v1/live/channels?culture_id=israeli")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_get_channels_filter_by_category(self, db_client, sample_channels, client):
        """Test filtering channels by category."""
        response = client.get("/api/v1/live/channels?category=news")

        assert response.status_code == 200
        data = response.json()
        for ch in data["channels"]:
            assert ch["category"] == "news"


class TestGetChannel:
    """Tests for GET /api/v1/live/{channelId}."""

    @pytest.mark.asyncio
    async def test_get_channel_detail(self, db_client, sample_channels, sample_epg, client):
        """Test getting channel detail with schedule."""
        channel_id = str(sample_channels["news"].id)

        response = client.get(f"/api/v1/live/{channel_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Channel 12"
        assert "stream_url" in data
        assert "schedule" in data
        assert data["supports_live_subtitles"] is True

    @pytest.mark.asyncio
    async def test_get_channel_not_found(self, db_client, client):
        """Test getting non-existent channel returns 404."""
        response = client.get("/api/v1/live/000000000000000000000000")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_inactive_channel(self, db_client, sample_channels, client):
        """Test getting inactive channel returns 404."""
        channel_id = str(sample_channels["inactive"].id)

        response = client.get(f"/api/v1/live/{channel_id}")

        assert response.status_code == 404


class TestGetChannelStream:
    """Tests for GET /api/v1/live/{channelId}/stream."""

    @pytest.mark.asyncio
    async def test_stream_requires_auth(self, db_client, sample_channels, client):
        """Test stream endpoint requires authentication."""
        channel_id = str(sample_channels["news"].id)

        response = client.get(f"/api/v1/live/{channel_id}/stream")

        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_stream_returns_url(self, db_client, sample_channels, premium_user, client):
        """Test stream returns URL for authorized user."""
        token = premium_user["token"]
        channel_id = str(sample_channels["news"].id)

        response = client.get(
            f"/api/v1/live/{channel_id}/stream",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "stream_url" in data
        assert "stream_type" in data

    @pytest.mark.asyncio
    async def test_stream_subscription_check(self, db_client, sample_channels, basic_user, client):
        """Test premium channel requires premium subscription."""
        token = basic_user["token"]
        channel_id = str(sample_channels["sports"].id)

        response = client.get(
            f"/api/v1/live/{channel_id}/stream",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_stream_not_found(self, db_client, premium_user, client):
        """Test stream for non-existent channel returns 404."""
        token = premium_user["token"]

        response = client.get(
            "/api/v1/live/000000000000000000000000/stream",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404


class TestGetEPG:
    """Tests for GET /api/v1/live/{channelId}/epg."""

    @pytest.mark.asyncio
    async def test_epg_returns_schedule(self, db_client, sample_channels, sample_epg, client):
        """Test EPG returns today's schedule entries."""
        channel_id = str(sample_channels["news"].id)

        response = client.get(f"/api/v1/live/{channel_id}/epg")

        assert response.status_code == 200
        data = response.json()
        assert data["channel_id"] == channel_id
        assert "entries" in data
        assert "date" in data
        assert len(data["entries"]) >= 1

    @pytest.mark.asyncio
    async def test_epg_with_date(self, db_client, sample_channels, client):
        """Test EPG with specific date parameter."""
        channel_id = str(sample_channels["news"].id)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        response = client.get(f"/api/v1/live/{channel_id}/epg?date={today}")

        assert response.status_code == 200
        data = response.json()
        assert data["date"] == today

    @pytest.mark.asyncio
    async def test_epg_not_found(self, db_client, client):
        """Test EPG for non-existent channel returns 404."""
        response = client.get("/api/v1/live/000000000000000000000000/epg")

        assert response.status_code == 404
