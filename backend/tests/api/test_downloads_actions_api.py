"""
Integration tests for Downloads Actions API (pause, resume, batch, stats).
"""

import pytest
import pytest_asyncio
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.security import get_current_active_user, get_current_user
from app.main import app
from app.models.download import Download, DownloadContentType, DownloadStatus
from app.models.household import Household, HouseholdMember, HouseholdRole
from app.models.user import User


@pytest_asyncio.fixture
async def db_client():
    """Create test database client on Atlas."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    test_db_name = "test_downloads_actions_api"
    await init_beanie(
        database=client[test_db_name],
        document_models=[User, Download, Household],
    )
    yield client
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def owner_user(db_client):
    """Create a household owner user."""
    user = User(
        email="owner@example.com",
        name="Owner User",
        hashed_password="hashed_test",
        role="user",
        is_active=True,
        email_verified=True,
        phone_verified=True,
        is_verified=True,
    )
    await user.insert()
    household = Household(
        household_id="test-household-actions",
        name="Test Family",
        owner_id=str(user.id),
        members=[HouseholdMember(user_id=str(user.id), role=HouseholdRole.PARENT)],
    )
    await household.insert()
    return user


@pytest_asyncio.fixture
async def downloading_item(owner_user):
    """Download in DOWNLOADING state."""
    dl = Download(
        user_id=str(owner_user.id),
        content_id="movie-dl-001",
        content_type=DownloadContentType.MOVIE,
        status=DownloadStatus.DOWNLOADING,
        progress=50,
        file_size=1_000_000_000,
    )
    await dl.insert()
    return dl


@pytest_asyncio.fixture
async def paused_item(owner_user):
    """Download in PAUSED state."""
    dl = Download(
        user_id=str(owner_user.id),
        content_id="movie-paused-001",
        content_type=DownloadContentType.MOVIE,
        status=DownloadStatus.PAUSED,
        progress=30,
    )
    await dl.insert()
    return dl


@pytest_asyncio.fixture
async def completed_item(owner_user):
    """Download in COMPLETED state."""
    dl = Download(
        user_id=str(owner_user.id),
        content_id="movie-done-001",
        content_type=DownloadContentType.MOVIE,
        status=DownloadStatus.COMPLETED,
        progress=100,
        file_size=2_000_000_000,
    )
    await dl.insert()
    return dl


@pytest_asyncio.fixture
async def client(owner_user):
    """AsyncClient with auth overridden to owner_user."""
    app.dependency_overrides[get_current_user] = lambda: owner_user
    app.dependency_overrides[get_current_active_user] = lambda: owner_user
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test",
    ) as ac:
        yield ac
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_pause_downloading(client, downloading_item):
    """Pause an active download."""
    response = await client.patch(
        f"/api/v1/downloads/{downloading_item.id}/pause",
    )
    assert response.status_code == 200
    assert response.json()["status"] == "paused"


@pytest.mark.asyncio
async def test_pause_completed_fails(client, completed_item):
    """Cannot pause a completed download."""
    response = await client.patch(
        f"/api/v1/downloads/{completed_item.id}/pause",
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_resume_paused(client, paused_item):
    """Resume a paused download."""
    response = await client.patch(
        f"/api/v1/downloads/{paused_item.id}/resume",
    )
    assert response.status_code == 200
    assert response.json()["status"] == "downloading"


@pytest.mark.asyncio
async def test_resume_downloading_fails(client, downloading_item):
    """Cannot resume a non-paused download."""
    response = await client.patch(
        f"/api/v1/downloads/{downloading_item.id}/resume",
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_batch_download(client):
    """Batch register multiple downloads."""
    response = await client.post(
        "/api/v1/downloads/batch",
        json={
            "items": [
                {"content_id": "batch-1", "content_type": "movie", "quality": "hd"},
                {"content_id": "batch-2", "content_type": "episode", "quality": "sd"},
                {"content_id": "batch-3", "content_type": "podcast", "quality": "hd"},
            ]
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data["created"]) == 3
    assert len(data["skipped"]) == 0


@pytest.mark.asyncio
async def test_batch_deduplicates(client, downloading_item):
    """Batch skips existing downloads."""
    response = await client.post(
        "/api/v1/downloads/batch",
        json={
            "items": [
                {"content_id": "movie-dl-001", "content_type": "movie", "quality": "hd"},
                {"content_id": "new-movie", "content_type": "movie", "quality": "hd"},
            ]
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data["created"]) == 1
    assert len(data["skipped"]) == 1
    assert data["skipped"][0]["reason"] == "already_exists"


@pytest.mark.asyncio
async def test_stats(client, downloading_item, completed_item):
    """Get download statistics."""
    response = await client.get("/api/v1/downloads/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 2
    assert data["total_size_bytes"] == 3_000_000_000
    assert data["by_status"]["downloading"] == 1
    assert data["by_status"]["completed"] == 1


@pytest.mark.asyncio
async def test_pause_not_found(client):
    """Pause non-existent download returns 404."""
    response = await client.patch(
        "/api/v1/downloads/000000000000000000000000/pause",
    )
    assert response.status_code == 404
