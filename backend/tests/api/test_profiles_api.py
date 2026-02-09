"""
Integration tests for Profiles API endpoints.

Tests cover:
- GET /api/v1/profiles (list profiles)
- POST /api/v1/profiles (create profile)
- GET /api/v1/profiles/{id} (get single profile)
- PUT /api/v1/profiles/{id} (update profile)
- DELETE /api/v1/profiles/{id} (delete profile)
- POST /api/v1/profiles/{id}/select (select active profile)
- POST /api/v1/profiles/{id}/verify-pin (verify profile PIN)
"""

from datetime import datetime, timezone

import pytest
import pytest_asyncio
from beanie import init_beanie
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.profile import Profile
from app.models.user import User


@pytest_asyncio.fixture
async def db_client():
    """Create test database client with User and Profile models."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_profiles_api"

    await init_beanie(
        database=client[test_db_name],
        document_models=[User, Profile],
    )

    yield client

    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def basic_user(db_client):
    """Create a basic subscription user with token."""
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
async def premium_user(db_client):
    """Create a premium subscription user with token."""
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
async def family_user(db_client):
    """Create a family subscription user with token."""
    user = User(
        email="family@example.com",
        name="Family User",
        hashed_password=get_password_hash("Test@1234"),
        role="user",
        is_active=True,
        email_verified=True,
        phone_verified=True,
        is_verified=True,
        subscription_tier="family",
    )
    await user.insert()

    token = create_access_token(data={"sub": str(user.id)})
    return {"user": user, "token": token}


@pytest_asyncio.fixture
async def user_with_profiles(db_client, premium_user):
    """Create a premium user with multiple profiles."""
    user = premium_user["user"]
    user_id = str(user.id)

    profile1 = Profile(
        user_id=user_id,
        name="Main Profile",
        avatar_color="#ff0000",
    )
    await profile1.insert()

    profile2 = Profile(
        user_id=user_id,
        name="Kids Profile",
        avatar_color="#00ff00",
        is_kids_profile=True,
        kids_age_limit=7,
    )
    await profile2.insert()

    user.active_profile_id = str(profile1.id)
    await user.save()

    return {
        "user": user,
        "token": premium_user["token"],
        "profiles": [profile1, profile2],
    }


@pytest_asyncio.fixture
async def user_with_pinned_profile(db_client, premium_user):
    """Create a premium user with a PIN-protected profile."""
    user = premium_user["user"]
    user_id = str(user.id)

    profile = Profile(
        user_id=user_id,
        name="Pinned Profile",
        avatar_color="#0000ff",
        pin=get_password_hash("1234"),
    )
    await profile.insert()

    return {
        "user": user,
        "token": premium_user["token"],
        "profile": profile,
    }


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestListProfiles:
    """Tests for GET /api/v1/profiles."""

    @pytest.mark.asyncio
    async def test_list_profiles_creates_default(
        self, db_client, basic_user, client
    ):
        """Test listing profiles creates a default when none exist."""
        token = basic_user["token"]

        response = client.get(
            "/api/v1/profiles",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Basic User"

    @pytest.mark.asyncio
    async def test_list_profiles_returns_existing(
        self, db_client, user_with_profiles, client
    ):
        """Test listing profiles returns all existing profiles."""
        token = user_with_profiles["token"]

        response = client.get(
            "/api/v1/profiles",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        names = [p["name"] for p in data]
        assert "Main Profile" in names
        assert "Kids Profile" in names

    def test_list_profiles_requires_auth(self, client):
        """Test listing profiles requires authentication."""
        response = client.get("/api/v1/profiles")
        assert response.status_code in [401, 403]


class TestCreateProfile:
    """Tests for POST /api/v1/profiles."""

    @pytest.mark.asyncio
    async def test_create_profile_success(
        self, db_client, premium_user, client
    ):
        """Test creating a new profile."""
        token = premium_user["token"]

        response = client.post(
            "/api/v1/profiles",
            json={
                "name": "New Profile",
                "avatar_color": "#ff6600",
                "is_kids_profile": False,
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Profile"
        assert data["avatar_color"] == "#ff6600"
        assert data["is_kids_profile"] is False

    @pytest.mark.asyncio
    async def test_create_kids_profile(
        self, db_client, premium_user, client
    ):
        """Test creating a kids profile with age limit."""
        token = premium_user["token"]

        response = client.post(
            "/api/v1/profiles",
            json={
                "name": "Little One",
                "is_kids_profile": True,
                "kids_age_limit": 5,
                "avatar_color": "#ffcc00",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_kids_profile"] is True
        assert data["kids_age_limit"] == 5

    @pytest.mark.asyncio
    async def test_create_profile_with_pin(
        self, db_client, premium_user, client
    ):
        """Test creating a profile with PIN protection."""
        token = premium_user["token"]

        response = client.post(
            "/api/v1/profiles",
            json={
                "name": "Secret Profile",
                "pin": "4567",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["has_pin"] is True

    @pytest.mark.asyncio
    async def test_create_profile_limit_basic(
        self, db_client, basic_user, client
    ):
        """Test basic subscription has 1 profile limit."""
        token = basic_user["token"]

        # Create first profile (auto-created on list, so create manually)
        profile = Profile(
            user_id=str(basic_user["user"].id),
            name="Existing Profile",
        )
        await profile.insert()

        response = client.post(
            "/api/v1/profiles",
            json={"name": "Second Profile"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert "limit" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_create_profile_duplicate_name(
        self, db_client, user_with_profiles, client
    ):
        """Test creating a profile with duplicate name fails."""
        token = user_with_profiles["token"]

        response = client.post(
            "/api/v1/profiles",
            json={"name": "Main Profile"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()


class TestGetProfile:
    """Tests for GET /api/v1/profiles/{id}."""

    @pytest.mark.asyncio
    async def test_get_profile_success(
        self, db_client, user_with_profiles, client
    ):
        """Test getting a specific profile."""
        token = user_with_profiles["token"]
        profile_id = str(user_with_profiles["profiles"][0].id)

        response = client.get(
            f"/api/v1/profiles/{profile_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Main Profile"

    @pytest.mark.asyncio
    async def test_get_profile_not_found(
        self, db_client, basic_user, client
    ):
        """Test getting non-existent profile returns 404."""
        token = basic_user["token"]

        response = client.get(
            "/api/v1/profiles/000000000000000000000000",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code in [404, 422]

    @pytest.mark.asyncio
    async def test_get_profile_other_user(
        self, db_client, basic_user, user_with_profiles, client
    ):
        """Test getting another user's profile returns 404."""
        token = basic_user["token"]
        other_profile_id = str(user_with_profiles["profiles"][0].id)

        response = client.get(
            f"/api/v1/profiles/{other_profile_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404


class TestUpdateProfile:
    """Tests for PUT /api/v1/profiles/{id}."""

    @pytest.mark.asyncio
    async def test_update_profile_name(
        self, db_client, user_with_profiles, client
    ):
        """Test updating a profile name."""
        token = user_with_profiles["token"]
        profile_id = str(user_with_profiles["profiles"][0].id)

        response = client.put(
            f"/api/v1/profiles/{profile_id}",
            json={"name": "Renamed Profile"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Renamed Profile"

    @pytest.mark.asyncio
    async def test_update_profile_color(
        self, db_client, user_with_profiles, client
    ):
        """Test updating profile avatar color."""
        token = user_with_profiles["token"]
        profile_id = str(user_with_profiles["profiles"][0].id)

        response = client.put(
            f"/api/v1/profiles/{profile_id}",
            json={"avatar_color": "#purple"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["avatar_color"] == "#purple"

    @pytest.mark.asyncio
    async def test_update_profile_duplicate_name(
        self, db_client, user_with_profiles, client
    ):
        """Test updating profile name to duplicate fails."""
        token = user_with_profiles["token"]
        profile_id = str(user_with_profiles["profiles"][1].id)

        response = client.put(
            f"/api/v1/profiles/{profile_id}",
            json={"name": "Main Profile"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_update_profile_not_found(
        self, db_client, basic_user, client
    ):
        """Test updating non-existent profile returns 404."""
        token = basic_user["token"]

        response = client.put(
            "/api/v1/profiles/000000000000000000000000",
            json={"name": "Ghost Profile"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code in [404, 422]


class TestDeleteProfile:
    """Tests for DELETE /api/v1/profiles/{id}."""

    @pytest.mark.asyncio
    async def test_delete_profile_success(
        self, db_client, user_with_profiles, client
    ):
        """Test deleting a profile when more than one exists."""
        token = user_with_profiles["token"]
        profile_id = str(user_with_profiles["profiles"][1].id)

        response = client.delete(
            f"/api/v1/profiles/{profile_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_delete_last_profile_fails(
        self, db_client, basic_user, client
    ):
        """Test deleting the last profile is rejected."""
        token = basic_user["token"]
        user_id = str(basic_user["user"].id)

        # Create single profile
        profile = Profile(user_id=user_id, name="Only Profile")
        await profile.insert()

        response = client.delete(
            f"/api/v1/profiles/{str(profile.id)}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert "last profile" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_delete_active_profile_switches(
        self, db_client, user_with_profiles, client
    ):
        """Test deleting the active profile auto-switches to another."""
        token = user_with_profiles["token"]
        active_profile_id = str(user_with_profiles["profiles"][0].id)

        response = client.delete(
            f"/api/v1/profiles/{active_profile_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200

        # Verify user switched to remaining profile
        user = await User.get(user_with_profiles["user"].id)
        assert user.active_profile_id is not None
        assert user.active_profile_id != active_profile_id

    @pytest.mark.asyncio
    async def test_delete_profile_not_found(
        self, db_client, basic_user, client
    ):
        """Test deleting non-existent profile returns 404."""
        token = basic_user["token"]

        response = client.delete(
            "/api/v1/profiles/000000000000000000000000",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code in [404, 422]


class TestSelectProfile:
    """Tests for POST /api/v1/profiles/{id}/select."""

    @pytest.mark.asyncio
    async def test_select_profile_success(
        self, db_client, user_with_profiles, client
    ):
        """Test selecting a profile as active."""
        token = user_with_profiles["token"]
        profile_id = str(user_with_profiles["profiles"][1].id)

        response = client.post(
            f"/api/v1/profiles/{profile_id}/select",
            json={},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Kids Profile"

        # Verify user's active profile was updated
        user = await User.get(user_with_profiles["user"].id)
        assert user.active_profile_id == profile_id

    @pytest.mark.asyncio
    async def test_select_pinned_profile_with_pin(
        self, db_client, user_with_pinned_profile, client
    ):
        """Test selecting a PIN-protected profile with correct PIN."""
        token = user_with_pinned_profile["token"]
        profile_id = str(user_with_pinned_profile["profile"].id)

        response = client.post(
            f"/api/v1/profiles/{profile_id}/select",
            json={"pin": "1234"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_select_pinned_profile_wrong_pin(
        self, db_client, user_with_pinned_profile, client
    ):
        """Test selecting a PIN-protected profile with wrong PIN fails."""
        token = user_with_pinned_profile["token"]
        profile_id = str(user_with_pinned_profile["profile"].id)

        response = client.post(
            f"/api/v1/profiles/{profile_id}/select",
            json={"pin": "9999"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_select_pinned_profile_no_pin(
        self, db_client, user_with_pinned_profile, client
    ):
        """Test selecting a PIN-protected profile without PIN fails."""
        token = user_with_pinned_profile["token"]
        profile_id = str(user_with_pinned_profile["profile"].id)

        response = client.post(
            f"/api/v1/profiles/{profile_id}/select",
            json={},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 401
        assert "pin required" in response.json()["detail"].lower()


class TestVerifyPin:
    """Tests for POST /api/v1/profiles/{id}/verify-pin."""

    @pytest.mark.asyncio
    async def test_verify_pin_correct(
        self, db_client, user_with_pinned_profile, client
    ):
        """Test verifying correct PIN returns valid=true."""
        token = user_with_pinned_profile["token"]
        profile_id = str(user_with_pinned_profile["profile"].id)

        response = client.post(
            f"/api/v1/profiles/{profile_id}/verify-pin",
            json={"pin": "1234"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["valid"] is True

    @pytest.mark.asyncio
    async def test_verify_pin_incorrect(
        self, db_client, user_with_pinned_profile, client
    ):
        """Test verifying incorrect PIN returns valid=false."""
        token = user_with_pinned_profile["token"]
        profile_id = str(user_with_pinned_profile["profile"].id)

        response = client.post(
            f"/api/v1/profiles/{profile_id}/verify-pin",
            json={"pin": "0000"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["valid"] is False

    @pytest.mark.asyncio
    async def test_verify_pin_no_pin_set(
        self, db_client, user_with_profiles, client
    ):
        """Test verifying PIN on profile without PIN returns valid=true."""
        token = user_with_profiles["token"]
        profile_id = str(user_with_profiles["profiles"][0].id)

        response = client.post(
            f"/api/v1/profiles/{profile_id}/verify-pin",
            json={"pin": "anything"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["valid"] is True
