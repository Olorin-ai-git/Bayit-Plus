"""
Integration tests for Radio API endpoints.

Tests cover:
- GET /api/v1/radio/stations
- GET /api/v1/radio/{stationId}
- GET /api/v1/radio/{stationId}/stream
"""

import pytest
import pytest_asyncio
from beanie import init_beanie
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.main import app
from app.models.content import RadioStation
from app.models.user import User


@pytest_asyncio.fixture
async def db_client():
    """Create test database client with radio models."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_radio_api"

    await init_beanie(
        database=client[test_db_name],
        document_models=[User, RadioStation],
    )

    yield client

    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def sample_stations(db_client):
    """Create sample radio stations for testing."""
    station1 = RadioStation(
        name="Galatz",
        description="Israeli Army Radio",
        is_active=True,
        stream_url="https://cdn.example.com/galatz.m3u8",
        stream_type="hls",
        genre="news",
        culture_id="israeli",
        order=1,
    )
    await station1.insert()

    station2 = RadioStation(
        name="Galgalatz",
        description="Israeli pop music radio",
        is_active=True,
        stream_url="https://cdn.example.com/galgalatz.m3u8",
        stream_type="hls",
        genre="music",
        culture_id="israeli",
        order=2,
    )
    await station2.insert()

    inactive_station = RadioStation(
        name="Offline Station",
        description="This station is offline",
        is_active=False,
        stream_url="https://cdn.example.com/offline.m3u8",
        stream_type="hls",
        order=99,
    )
    await inactive_station.insert()

    return {
        "galatz": station1,
        "galgalatz": station2,
        "inactive": inactive_station,
    }


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestGetStations:
    """Tests for GET /api/v1/radio/stations."""

    @pytest.mark.asyncio
    async def test_get_stations_returns_active(self, db_client, sample_stations, client):
        """Test listing stations returns only active stations."""
        response = client.get("/api/v1/radio/stations")

        assert response.status_code == 200
        data = response.json()
        assert "stations" in data
        assert "total" in data

        names = [s["name"] for s in data["stations"]]
        assert "Galatz" in names
        assert "Galgalatz" in names
        assert "Offline Station" not in names

    @pytest.mark.asyncio
    async def test_get_stations_filter_by_culture(self, db_client, sample_stations, client):
        """Test filtering stations by culture ID."""
        response = client.get("/api/v1/radio/stations?culture_id=israeli")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 2

    @pytest.mark.asyncio
    async def test_get_stations_filter_by_genre(self, db_client, sample_stations, client):
        """Test filtering stations by genre."""
        response = client.get("/api/v1/radio/stations?genre=news")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        for station in data["stations"]:
            assert station["genre"] == "news"

    @pytest.mark.asyncio
    async def test_get_stations_empty_genre(self, db_client, sample_stations, client):
        """Test filtering by non-existent genre returns empty list."""
        response = client.get("/api/v1/radio/stations?genre=jazz")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["stations"] == []


class TestGetStation:
    """Tests for GET /api/v1/radio/{stationId}."""

    @pytest.mark.asyncio
    async def test_get_station_detail(self, db_client, sample_stations, client):
        """Test getting station detail."""
        station_id = str(sample_stations["galatz"].id)

        response = client.get(f"/api/v1/radio/{station_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Galatz"
        assert data["genre"] == "news"
        assert "description" in data

    @pytest.mark.asyncio
    async def test_get_station_not_found(self, db_client, client):
        """Test getting non-existent station returns 404."""
        response = client.get("/api/v1/radio/000000000000000000000000")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_inactive_station(self, db_client, sample_stations, client):
        """Test getting inactive station returns 404."""
        station_id = str(sample_stations["inactive"].id)

        response = client.get(f"/api/v1/radio/{station_id}")

        assert response.status_code == 404


class TestGetStationStream:
    """Tests for GET /api/v1/radio/{stationId}/stream."""

    @pytest.mark.asyncio
    async def test_stream_returns_url(self, db_client, sample_stations, client):
        """Test stream endpoint returns URL and type."""
        station_id = str(sample_stations["galatz"].id)

        response = client.get(f"/api/v1/radio/{station_id}/stream")

        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "type" in data
        assert data["type"] == "hls"

    @pytest.mark.asyncio
    async def test_stream_not_found(self, db_client, client):
        """Test stream for non-existent station returns 404."""
        response = client.get("/api/v1/radio/000000000000000000000000/stream")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_stream_inactive_station(self, db_client, sample_stations, client):
        """Test stream for inactive station returns 404."""
        station_id = str(sample_stations["inactive"].id)

        response = client.get(f"/api/v1/radio/{station_id}/stream")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_stream_with_validation(self, db_client, sample_stations, client):
        """Test stream endpoint with validation parameter."""
        station_id = str(sample_stations["galatz"].id)

        response = client.get(f"/api/v1/radio/{station_id}/stream?validate=false")

        assert response.status_code == 200
        data = response.json()
        assert "url" in data
