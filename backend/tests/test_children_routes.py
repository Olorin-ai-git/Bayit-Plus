"""
Comprehensive Tests for Children API Routes

Tests cover:
- GET /categories - List kids categories
- GET /content - List kids content with filters
- GET /featured - Featured kids content
- GET /by-category/{category_id} - Content by category
- GET /subcategories - List kids subcategories
- GET /subcategory/{slug} - Content by subcategory
- GET /age-groups - List age groups
- GET /age-group/{group} - Content by age group
- POST /admin/refresh - Admin cache refresh
- POST /parental-controls - Update parental controls
- POST /verify-parent-pin - Verify parent PIN
"""

import pytest
import pytest_asyncio
from datetime import datetime
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.main import app
from app.models.user import User
from app.models.content import Content
from app.models.content_taxonomy import ContentSection, SectionSubcategory
from app.models.kids_content import (
    KidsContentAggregatedResponse,
    KidsFeaturedResponse,
    KidsSubcategoriesResponse,
    KidsAgeGroupsResponse,
    KidsSubcategory,
    KidsAgeGroup,
)
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash


# Test Fixtures

@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[f"{settings.MONGODB_DB_NAME}_test_routes"],
        document_models=[Content, ContentSection, SectionSubcategory, User]
    )
    yield client
    # Cleanup
    await client.drop_database(f"{settings.MONGODB_DB_NAME}_test_routes")
    client.close()


@pytest_asyncio.fixture
async def test_user(db_client):
    """Create a test user."""
    user = User(
        email="testuser@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User",
        is_active=True,
        is_verified=True,
        preferences={},
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def admin_user(db_client):
    """Create an admin test user."""
    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("adminpassword123"),
        full_name="Admin User",
        is_active=True,
        is_verified=True,
        is_admin=True,
        preferences={},
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def user_with_pin(db_client):
    """Create a user with parental PIN set."""
    user = User(
        email="parent@example.com",
        hashed_password=get_password_hash("parentpassword123"),
        full_name="Parent User",
        is_active=True,
        is_verified=True,
        kids_pin=get_password_hash("1234"),
        preferences={"default_kids_age_limit": 8},
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
def user_token(test_user):
    """Create auth token for test user."""
    return create_access_token(data={"sub": test_user.email})


@pytest_asyncio.fixture
def admin_token(admin_user):
    """Create auth token for admin user."""
    return create_access_token(data={"sub": admin_user.email})


@pytest_asyncio.fixture
def parent_token(user_with_pin):
    """Create auth token for parent user."""
    return create_access_token(data={"sub": user_with_pin.email})


@pytest_asyncio.fixture
async def kids_section(db_client):
    """Create kids section for testing."""
    section = ContentSection(
        slug="kids",
        name_key="taxonomy.sections.kids",
        icon="baby",
        color="#FF6B35",
        order=3,
        is_active=True,
        show_on_homepage=True,
        supports_subcategories=True,
    )
    await section.insert()
    return section


@pytest_asyncio.fixture
async def kids_subcategories(db_client, kids_section):
    """Create kids subcategories for testing."""
    subcategories = [
        SectionSubcategory(
            section_id=str(kids_section.id),
            slug="learning-hebrew",
            name_key="taxonomy.subcategories.learning-hebrew",
            icon="book-open",
            order=1,
            is_active=True,
        ),
        SectionSubcategory(
            section_id=str(kids_section.id),
            slug="hebrew-songs",
            name_key="taxonomy.subcategories.hebrew-songs",
            icon="music",
            order=6,
            is_active=True,
        ),
    ]
    for sub in subcategories:
        await sub.insert()
    return subcategories


@pytest_asyncio.fixture
async def sample_kids_content(db_client):
    """Create sample kids content for testing."""
    content_items = [
        Content(
            title="לימוד עברית",
            title_en="Learning Hebrew",
            description="Learn Hebrew alphabet",
            content_type="vod",
            genres=["Educational", "Kids"],
            year=2023,
            rating=4.8,
            duration_minutes=15,
            is_kids_content=True,
            age_rating=3,
            published=True,
        ),
        Content(
            title="שירי ילדים",
            title_en="Kids Songs",
            description="Hebrew songs for children",
            content_type="vod",
            genres=["Music", "Kids"],
            year=2022,
            rating=4.5,
            duration_minutes=30,
            is_kids_content=True,
            age_rating=2,
            published=True,
        ),
    ]
    for item in content_items:
        await item.insert()
    return content_items


@pytest_asyncio.fixture
async def async_client():
    """Create async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# Categories Endpoint Tests

@pytest.mark.asyncio
async def test_get_categories_success(async_client, db_client, sample_kids_content):
    """Test GET /categories returns categories list."""
    response = await async_client.get("/api/v1/children/categories")

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_get_categories_no_auth_required(async_client, db_client):
    """Test GET /categories does not require authentication."""
    response = await async_client.get("/api/v1/children/categories")

    # Should succeed without auth token
    assert response.status_code == 200


# Content Endpoint Tests

@pytest.mark.asyncio
async def test_get_content_success(async_client, db_client, sample_kids_content):
    """Test GET /content returns kids content."""
    response = await async_client.get("/api/v1/children/content")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "items" in data
    assert "pagination" in data


@pytest.mark.asyncio
async def test_get_content_with_age_filter(async_client, db_client, sample_kids_content):
    """Test GET /content with age_max filter."""
    response = await async_client.get("/api/v1/children/content?age_max=5")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_get_content_with_pagination(async_client, db_client, sample_kids_content):
    """Test GET /content with pagination parameters."""
    response = await async_client.get("/api/v1/children/content?page=1&limit=10")

    assert response.status_code == 200
    data = response.json()
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["limit"] == 10


@pytest.mark.asyncio
async def test_get_content_pagination_validation(async_client, db_client):
    """Test GET /content validates pagination parameters."""
    # Test invalid page number
    response = await async_client.get("/api/v1/children/content?page=0")
    assert response.status_code == 422  # Validation error

    # Test limit too high
    response = await async_client.get("/api/v1/children/content?limit=100")
    assert response.status_code == 422  # Validation error (max is 50)


# Featured Endpoint Tests

@pytest.mark.asyncio
async def test_get_featured_success(async_client, db_client, sample_kids_content):
    """Test GET /featured returns featured content."""
    response = await async_client.get("/api/v1/children/featured")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "featured" in data


@pytest.mark.asyncio
async def test_get_featured_with_age_filter(async_client, db_client, sample_kids_content):
    """Test GET /featured with age_max filter."""
    response = await async_client.get("/api/v1/children/featured?age_max=5")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


# Subcategories Endpoint Tests

@pytest.mark.asyncio
async def test_get_subcategories_success(async_client, db_client, kids_subcategories):
    """Test GET /subcategories returns subcategories list."""
    response = await async_client.get("/api/v1/children/subcategories")

    assert response.status_code == 200
    data = response.json()
    assert "subcategories" in data
    assert isinstance(data["subcategories"], list)


@pytest.mark.asyncio
async def test_get_subcategories_structure(async_client, db_client, kids_subcategories):
    """Test GET /subcategories returns correct structure."""
    response = await async_client.get("/api/v1/children/subcategories")

    assert response.status_code == 200
    data = response.json()

    for subcategory in data["subcategories"]:
        assert "slug" in subcategory
        assert "name" in subcategory
        assert "icon" in subcategory


# Subcategory Content Endpoint Tests

@pytest.mark.asyncio
async def test_get_content_by_subcategory_success(
    async_client, db_client, kids_subcategories, sample_kids_content
):
    """Test GET /subcategory/{slug} returns filtered content."""
    response = await async_client.get("/api/v1/children/subcategory/learning-hebrew")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "items" in data


@pytest.mark.asyncio
async def test_get_content_by_subcategory_with_filters(
    async_client, db_client, kids_subcategories, sample_kids_content
):
    """Test GET /subcategory/{slug} with age and pagination filters."""
    response = await async_client.get(
        "/api/v1/children/subcategory/hebrew-songs?age_max=5&page=1&limit=10"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["pagination"]["page"] == 1


@pytest.mark.asyncio
async def test_get_content_by_invalid_subcategory(async_client, db_client):
    """Test GET /subcategory/{slug} with invalid slug returns empty."""
    response = await async_client.get("/api/v1/children/subcategory/non-existent")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["items"]) == 0


# Age Groups Endpoint Tests

@pytest.mark.asyncio
async def test_get_age_groups_success(async_client, db_client):
    """Test GET /age-groups returns age groups list."""
    response = await async_client.get("/api/v1/children/age-groups")

    assert response.status_code == 200
    data = response.json()
    assert "age_groups" in data
    assert len(data["age_groups"]) == 4  # toddlers, preschool, elementary, preteen


@pytest.mark.asyncio
async def test_get_age_groups_structure(async_client, db_client):
    """Test GET /age-groups returns correct structure."""
    response = await async_client.get("/api/v1/children/age-groups")

    assert response.status_code == 200
    data = response.json()

    for age_group in data["age_groups"]:
        assert "slug" in age_group
        assert "name" in age_group
        assert "min_age" in age_group
        assert "max_age" in age_group


# Age Group Content Endpoint Tests

@pytest.mark.asyncio
async def test_get_content_by_age_group_success(async_client, db_client, sample_kids_content):
    """Test GET /age-group/{group} returns filtered content."""
    response = await async_client.get("/api/v1/children/age-group/toddlers")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "items" in data


@pytest.mark.asyncio
async def test_get_content_by_age_group_preschool(async_client, db_client, sample_kids_content):
    """Test GET /age-group/preschool returns appropriate content."""
    response = await async_client.get("/api/v1/children/age-group/preschool")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_get_content_by_age_group_with_pagination(async_client, db_client, sample_kids_content):
    """Test GET /age-group/{group} with pagination."""
    response = await async_client.get("/api/v1/children/age-group/elementary?page=1&limit=5")

    assert response.status_code == 200
    data = response.json()
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["limit"] == 5


# Admin Refresh Endpoint Tests

@pytest.mark.asyncio
async def test_admin_refresh_requires_auth(async_client, db_client):
    """Test POST /admin/refresh requires authentication."""
    response = await async_client.post("/api/v1/children/admin/refresh")

    assert response.status_code == 401  # Unauthorized


@pytest.mark.asyncio
async def test_admin_refresh_requires_admin(async_client, db_client, user_token):
    """Test POST /admin/refresh requires admin role."""
    response = await async_client.post(
        "/api/v1/children/admin/refresh",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    assert response.status_code == 403  # Forbidden


@pytest.mark.asyncio
async def test_admin_refresh_success(async_client, db_client, admin_token):
    """Test POST /admin/refresh succeeds for admin."""
    response = await async_client.post(
        "/api/v1/children/admin/refresh",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "cache cleared" in data["message"].lower()


# Parental Controls Endpoint Tests

@pytest.mark.asyncio
async def test_parental_controls_requires_auth(async_client, db_client):
    """Test POST /parental-controls requires authentication."""
    response = await async_client.post(
        "/api/v1/children/parental-controls",
        json={"kids_pin": "1234"}
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_parental_controls_set_pin(async_client, db_client, test_user, user_token):
    """Test POST /parental-controls sets PIN."""
    response = await async_client.post(
        "/api/v1/children/parental-controls",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"kids_pin": "1234"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_parental_controls_set_age_limit(async_client, db_client, test_user, user_token):
    """Test POST /parental-controls sets age limit."""
    response = await async_client.post(
        "/api/v1/children/parental-controls",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"default_age_limit": 8}
    )

    assert response.status_code == 200
    data = response.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_parental_controls_set_both(async_client, db_client, test_user, user_token):
    """Test POST /parental-controls sets both PIN and age limit."""
    response = await async_client.post(
        "/api/v1/children/parental-controls",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"kids_pin": "5678", "default_age_limit": 10}
    )

    assert response.status_code == 200


# Verify Parent PIN Endpoint Tests

@pytest.mark.asyncio
async def test_verify_pin_requires_auth(async_client, db_client):
    """Test POST /verify-parent-pin requires authentication."""
    response = await async_client.post(
        "/api/v1/children/verify-parent-pin",
        params={"pin": "1234"}
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_verify_pin_no_pin_set(async_client, db_client, test_user, user_token):
    """Test POST /verify-parent-pin fails when no PIN is set."""
    response = await async_client.post(
        "/api/v1/children/verify-parent-pin",
        headers={"Authorization": f"Bearer {user_token}"},
        params={"pin": "1234"}
    )

    assert response.status_code == 400
    data = response.json()
    assert "No parental PIN set" in data["detail"]


@pytest.mark.asyncio
async def test_verify_pin_correct(async_client, db_client, user_with_pin, parent_token):
    """Test POST /verify-parent-pin succeeds with correct PIN."""
    response = await async_client.post(
        "/api/v1/children/verify-parent-pin",
        headers={"Authorization": f"Bearer {parent_token}"},
        params={"pin": "1234"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True


@pytest.mark.asyncio
async def test_verify_pin_incorrect(async_client, db_client, user_with_pin, parent_token):
    """Test POST /verify-parent-pin fails with incorrect PIN."""
    response = await async_client.post(
        "/api/v1/children/verify-parent-pin",
        headers={"Authorization": f"Bearer {parent_token}"},
        params={"pin": "9999"}
    )

    assert response.status_code == 401
    data = response.json()
    assert "Incorrect PIN" in data["detail"]


# By Category Endpoint Tests

@pytest.mark.asyncio
async def test_get_by_category_requires_auth(async_client, db_client):
    """Test GET /by-category/{category_id} requires authentication."""
    response = await async_client.get("/api/v1/children/by-category/educational")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_by_category_success(
    async_client, db_client, test_user, user_token, sample_kids_content
):
    """Test GET /by-category/{category_id} returns filtered content."""
    response = await async_client.get(
        "/api/v1/children/by-category/educational",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_get_by_category_with_filters(
    async_client, db_client, test_user, user_token, sample_kids_content
):
    """Test GET /by-category/{category_id} with filters."""
    response = await async_client.get(
        "/api/v1/children/by-category/music?age_max=5&page=1&limit=10",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["pagination"]["page"] == 1


# Edge Cases

@pytest.mark.asyncio
async def test_empty_database_content(async_client, db_client):
    """Test content endpoints handle empty database gracefully."""
    response = await async_client.get("/api/v1/children/content")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_invalid_pagination_limit(async_client, db_client):
    """Test pagination with limit=0 fails validation."""
    response = await async_client.get("/api/v1/children/content?limit=0")

    # Should fail validation (ge=1)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_content_type_validation(async_client, db_client):
    """Test that responses match expected schema."""
    response = await async_client.get("/api/v1/children/age-groups")

    assert response.status_code == 200
    data = response.json()

    # Verify age groups are in expected format
    for group in data["age_groups"]:
        assert isinstance(group["min_age"], int)
        assert isinstance(group["max_age"], int)
        assert group["min_age"] <= group["max_age"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
