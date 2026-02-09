"""
Integration tests for Content/VOD API endpoints.

Tests cover:
- GET /api/v1/content/featured
- GET /api/v1/content/all
- GET /api/v1/content/categories
- GET /api/v1/content/{id}
- GET /api/v1/content/{id}/stream
- GET /api/v1/content/{id}/preview
"""

from datetime import datetime, timezone

import pytest
import pytest_asyncio
from beanie import init_beanie
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.content import Content, LiveChannel, RadioStation, EPGEntry, Podcast
from app.models.content_taxonomy import ContentSection, SectionSubcategory
from app.models.user import User


@pytest_asyncio.fixture
async def db_client():
    """Create test database client with content models."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_content_api"

    await init_beanie(
        database=client[test_db_name],
        document_models=[User, Content, ContentSection, SectionSubcategory, Podcast],
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
    """Create a basic subscription user."""
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
async def sample_content(db_client):
    """Create sample content items for testing."""
    movie = Content(
        title="Test Movie",
        description="A test movie description",
        category_name="Movies",
        is_published=True,
        is_featured=True,
        stream_url="https://cdn.example.com/movie.m3u8",
        stream_type="hls",
        duration=7200,
        year=2025,
        rating="PG-13",
        requires_subscription="basic",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    await movie.insert()

    unpublished = Content(
        title="Unpublished Movie",
        description="Not published yet",
        category_name="Movies",
        is_published=False,
        stream_url="https://cdn.example.com/unpub.m3u8",
        stream_type="hls",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    await unpublished.insert()

    premium_content = Content(
        title="Premium Documentary",
        description="Premium only content",
        category_name="Documentary",
        is_published=True,
        is_featured=False,
        stream_url="https://cdn.example.com/premium.m3u8",
        stream_type="hls",
        requires_subscription="premium",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    await premium_content.insert()

    return {
        "movie": movie,
        "unpublished": unpublished,
        "premium": premium_content,
    }


@pytest_asyncio.fixture
async def sample_section(db_client):
    """Create a content section for testing."""
    section = ContentSection(
        slug="movies",
        name_key="sections.movies",
        is_active=True,
        show_on_homepage=True,
        show_on_nav=True,
        order=0,
    )
    await section.insert()
    return section


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestFeatured:
    """Tests for GET /api/v1/content/featured."""

    @pytest.mark.asyncio
    async def test_featured_returns_200(self, db_client, sample_content, client):
        """Test featured endpoint returns 200 with expected structure."""
        response = client.get("/api/v1/content/featured")

        assert response.status_code == 200
        data = response.json()
        assert "hero" in data
        assert "spotlight" in data
        assert "categories" in data

    @pytest.mark.asyncio
    async def test_featured_hero_has_content(self, db_client, sample_content, client):
        """Test featured endpoint includes a hero item when content exists."""
        response = client.get("/api/v1/content/featured")

        data = response.json()
        if data["hero"]:
            assert "id" in data["hero"]
            assert "title" in data["hero"]


class TestGetAllContent:
    """Tests for GET /api/v1/content/all."""

    @pytest.mark.asyncio
    async def test_all_content_returns_published(self, db_client, sample_content, client):
        """Test all content returns only published items."""
        response = client.get("/api/v1/content/all")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data

        titles = [item["title"] for item in data["items"]]
        assert "Unpublished Movie" not in titles

    @pytest.mark.asyncio
    async def test_all_content_pagination(self, db_client, sample_content, client):
        """Test content pagination parameters."""
        response = client.get("/api/v1/content/all?page=1&limit=1")

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert len(data["items"]) <= 1

    @pytest.mark.asyncio
    async def test_all_content_limit_validation(self, db_client, client):
        """Test content rejects invalid limit."""
        response = client.get("/api/v1/content/all?limit=999")

        assert response.status_code == 422


class TestGetContentDetail:
    """Tests for GET /api/v1/content/{id}."""

    @pytest.mark.asyncio
    async def test_get_content_detail(self, db_client, sample_content, client):
        """Test getting content detail by ID."""
        content_id = str(sample_content["movie"].id)

        response = client.get(f"/api/v1/content/{content_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == content_id
        assert data["title"] == "Test Movie"
        assert "description" in data
        assert "category" in data
        assert "related" in data

    @pytest.mark.asyncio
    async def test_get_content_not_found(self, db_client, client):
        """Test getting non-existent content returns 404."""
        response = client.get("/api/v1/content/000000000000000000000000")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_unpublished_content(self, db_client, sample_content, client):
        """Test getting unpublished content returns 404."""
        content_id = str(sample_content["unpublished"].id)

        response = client.get(f"/api/v1/content/{content_id}")

        assert response.status_code == 404


class TestGetContentStream:
    """Tests for GET /api/v1/content/{id}/stream."""

    @pytest.mark.asyncio
    async def test_stream_requires_auth(self, db_client, sample_content, client):
        """Test stream endpoint requires authentication."""
        content_id = str(sample_content["movie"].id)

        response = client.get(f"/api/v1/content/{content_id}/stream")

        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_stream_returns_url(self, db_client, sample_content, premium_user, client):
        """Test stream endpoint returns URL for authenticated user."""
        token = premium_user["token"]
        content_id = str(sample_content["movie"].id)

        response = client.get(
            f"/api/v1/content/{content_id}/stream",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "url" in data or "direct_url" in data
        assert "type" in data

    @pytest.mark.asyncio
    async def test_stream_not_found(self, db_client, premium_user, client):
        """Test stream for non-existent content returns 404."""
        token = premium_user["token"]

        response = client.get(
            "/api/v1/content/000000000000000000000000/stream",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404


class TestGetContentPreview:
    """Tests for GET /api/v1/content/{id}/preview."""

    @pytest.mark.asyncio
    async def test_preview_returns_urls(self, db_client, sample_content, client):
        """Test preview endpoint returns preview URLs."""
        content_id = str(sample_content["movie"].id)

        response = client.get(f"/api/v1/content/{content_id}/preview")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == content_id
        assert "preview_url" in data
        assert "thumbnail" in data

    @pytest.mark.asyncio
    async def test_preview_not_found(self, db_client, client):
        """Test preview for non-existent content returns 404."""
        response = client.get("/api/v1/content/000000000000000000000000/preview")

        assert response.status_code == 404


class TestGetCategories:
    """Tests for GET /api/v1/content/categories."""

    @pytest.mark.asyncio
    async def test_categories_returns_list(self, db_client, sample_section, client):
        """Test categories endpoint returns sections."""
        response = client.get("/api/v1/content/categories")

        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) >= 1

    @pytest.mark.asyncio
    async def test_categories_vod_filter(self, db_client, sample_section, client):
        """Test categories with VOD filter."""
        response = client.get("/api/v1/content/categories?content_type=vod")

        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
