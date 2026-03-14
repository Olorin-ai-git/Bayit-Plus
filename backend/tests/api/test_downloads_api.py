"""
Integration tests for Downloads API endpoints.

Tests cover:
- GET /api/v1/downloads (owner check)
- POST /api/v1/downloads (register)
- DELETE /api/v1/downloads/{id}
- GET /api/v1/downloads/check/{content_id}
"""

import pytest
import pytest_asyncio
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
from unittest.mock import MagicMock

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
    test_db_name = "test_downloads_api"
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
        household_id="test-household-1",
        name="Test Family",
        owner_id=str(user.id),
        members=[HouseholdMember(user_id=str(user.id), role=HouseholdRole.PARENT)],
    )
    await household.insert()
    return user


@pytest_asyncio.fixture
async def non_owner_user(db_client):
    """Create a non-owner user (no household)."""
    user = User(
        email="member@example.com",
        name="Member User",
        hashed_password="hashed_test",
        role="user",
        is_active=True,
        email_verified=True,
        phone_verified=True,
        is_verified=True,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def sample_download(owner_user):
    """Create a sample download for the owner user."""
    dl = Download(
        user_id=str(owner_user.id),
        content_id="movie-001",
        content_type=DownloadContentType.MOVIE,
        status=DownloadStatus.DOWNLOADING,
        progress=50,
        file_size=1_500_000_000,
    )
    await dl.insert()
    return dl


@pytest_asyncio.fixture
async def owner_client(owner_user):
    """AsyncClient with auth overridden to owner_user."""
    app.dependency_overrides[get_current_user] = lambda: owner_user
    app.dependency_overrides[get_current_active_user] = lambda: owner_user
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test",
    ) as ac:
        yield ac
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_active_user, None)


@pytest_asyncio.fixture
async def non_owner_client(non_owner_user):
    """AsyncClient with auth overridden to non_owner_user."""
    app.dependency_overrides[get_current_user] = lambda: non_owner_user
    app.dependency_overrides[get_current_active_user] = lambda: non_owner_user
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test",
    ) as ac:
        yield ac
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_get_downloads_owner(owner_client):
    """Owner can list downloads."""
    response = await owner_client.get("/api/v1/downloads")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_get_downloads_non_owner_forbidden(non_owner_client):
    """Non-owner gets 403."""
    response = await non_owner_client.get("/api/v1/downloads")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_register_download(owner_client):
    """Register a new download."""
    response = await owner_client.post(
        "/api/v1/downloads",
        json={
            "content_id": "movie-new",
            "content_type": "movie",
            "quality": "hd",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["id"]


@pytest.mark.asyncio
async def test_register_duplicate_download(owner_client, sample_download):
    """Duplicate download returns 409."""
    response = await owner_client.post(
        "/api/v1/downloads",
        json={
            "content_id": "movie-001",
            "content_type": "movie",
            "quality": "hd",
        },
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_delete_download(owner_client, sample_download):
    """Delete a download."""
    response = await owner_client.delete(
        f"/api/v1/downloads/{sample_download.id}",
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_check_download(owner_client, sample_download):
    """Check if content is downloaded."""
    response = await owner_client.get("/api/v1/downloads/check/movie-001")
    assert response.status_code == 200
    data = response.json()
    assert data["is_downloaded"] is False


@pytest.mark.asyncio
async def test_expanded_content_types(owner_client):
    """All 4 content types accepted."""
    for ct in ["movie", "episode", "podcast", "audiobook"]:
        response = await owner_client.post(
            "/api/v1/downloads",
            json={
                "content_id": f"test-{ct}-001",
                "content_type": ct,
                "quality": "sd",
            },
        )
        assert response.status_code == 201, f"Failed for {ct}"
