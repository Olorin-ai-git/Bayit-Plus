"""
Integration tests for Household API.

Tests household creation, invitations, and member management endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.models.household import Household, HouseholdMember, HouseholdRole
from app.models.user import User


@pytest.fixture
def client():
    """Test client for API requests."""
    return TestClient(app)


@pytest.fixture
async def authenticated_user(db_session):
    """Create authenticated user for testing."""
    user = User(
        email="test@example.com",
        name="Test User",
        is_active=True,
    )
    await user.save()
    return user


@pytest.mark.asyncio
class TestHouseholdAPI:
    """Integration tests for Household API endpoints."""

    async def test_create_household(
        self, client, authenticated_user, db_session
    ):
        """Test POST /api/v1/household/create."""
        with patch("app.core.security.get_current_active_user") as mock_auth:
            mock_auth.return_value = authenticated_user

            response = client.post(
                "/api/v1/household/create",
                json={"name": "Test Family"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Family"
        assert data["owner_id"] == str(authenticated_user.id)
        assert len(data["members"]) == 1

    async def test_get_household(
        self, client, authenticated_user, db_session
    ):
        """Test GET /api/v1/household."""
        # Create household
        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id=str(authenticated_user.id),
            members=[
                HouseholdMember(
                    user_id=str(authenticated_user.id),
                    role=HouseholdRole.PARENT,
                )
            ],
        )
        await household.insert()

        with patch("app.core.security.get_current_active_user") as mock_auth:
            mock_auth.return_value = authenticated_user

            response = client.get("/api/v1/household")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Household"
        assert data["household_id"] == "hh123"

    async def test_invite_member(
        self, client, authenticated_user, db_session
    ):
        """Test POST /api/v1/household/{household_id}/invite."""
        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id=str(authenticated_user.id),
            members=[
                HouseholdMember(
                    user_id=str(authenticated_user.id),
                    role=HouseholdRole.PARENT,
                )
            ],
        )
        await household.insert()

        with patch("app.core.security.get_current_active_user") as mock_auth:
            mock_auth.return_value = authenticated_user

            # Mock email service
            with patch(
                "app.services.household_membership_service.send_household_invitation",
                new_callable=AsyncMock,
            ) as mock_email:
                mock_email.return_value = True

                response = client.post(
                    "/api/v1/household/hh123/invite",
                    json={
                        "email": "child@example.com",
                        "role": "CHILD",
                    },
                )

        assert response.status_code == 200
        data = response.json()
        assert "invitation_id" in data
        assert "expires_at" in data

    async def test_delete_household(
        self, client, authenticated_user, db_session
    ):
        """Test DELETE /api/v1/household/{household_id}."""
        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id=str(authenticated_user.id),
            members=[
                HouseholdMember(
                    user_id=str(authenticated_user.id),
                    role=HouseholdRole.PARENT,
                )
            ],
        )
        await household.insert()

        with patch("app.core.security.get_current_active_user") as mock_auth:
            mock_auth.return_value = authenticated_user

            response = client.delete("/api/v1/household/hh123")

        assert response.status_code == 200

        # Verify household deleted
        deleted = await Household.find_one(
            Household.household_id == "hh123"
        )
        assert deleted is None


@pytest.mark.asyncio
class TestProfileControlsAPI:
    """Integration tests for Profile Controls API endpoints."""

    async def test_get_profile_controls(
        self, client, authenticated_user, db_session
    ):
        """Test GET /api/v1/profile-controls/{profile_id}."""
        from app.models.profile import Profile
        from app.models.family_controls import FamilyControls

        # Create controls
        controls = FamilyControls(
            user_id=str(authenticated_user.id),
            kids_enabled=True,
            kids_age_limit=10,
        )
        await controls.insert()

        # Create profile with custom controls
        profile = Profile(
            user_id=str(authenticated_user.id),
            name="Test Profile",
            inherit_household_controls=False,
            custom_controls_id=str(controls.id),
        )
        await profile.insert()

        with patch("app.core.security.get_current_active_user") as mock_auth:
            mock_auth.return_value = authenticated_user

            response = client.get(
                f"/api/v1/profile-controls/{str(profile.id)}"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["kids_enabled"] is True
        assert data["kids_age_limit"] == 10

    async def test_set_custom_controls(
        self, client, authenticated_user, db_session
    ):
        """Test POST /api/v1/profile-controls/{profile_id}/set-custom."""
        from app.models.profile import Profile
        from app.models.family_controls import FamilyControls

        controls = FamilyControls(
            user_id=str(authenticated_user.id),
            kids_enabled=True,
        )
        await controls.insert()

        profile = Profile(
            user_id=str(authenticated_user.id),
            name="Test Profile",
        )
        await profile.insert()

        with patch("app.core.security.get_current_active_user") as mock_auth:
            mock_auth.return_value = authenticated_user

            response = client.post(
                f"/api/v1/profile-controls/{str(profile.id)}/set-custom",
                json={"controls_id": str(controls.id)},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["custom_controls_id"] == str(controls.id)
        assert data["inherit_household_controls"] is False

    async def test_inherit_household_controls(
        self, client, authenticated_user, db_session
    ):
        """Test POST /api/v1/profile-controls/{profile_id}/inherit-household."""
        from app.models.profile import Profile
        from app.models.family_controls import FamilyControls

        controls = FamilyControls(
            user_id=str(authenticated_user.id)
        )
        await controls.insert()

        profile = Profile(
            user_id=str(authenticated_user.id),
            name="Test Profile",
            inherit_household_controls=False,
            custom_controls_id=str(controls.id),
        )
        await profile.insert()

        with patch("app.core.security.get_current_active_user") as mock_auth:
            mock_auth.return_value = authenticated_user

            response = client.post(
                f"/api/v1/profile-controls/{str(profile.id)}/inherit-household"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["inherit_household_controls"] is True
        assert data["custom_controls_id"] is None

    async def test_get_controls_source(
        self, client, authenticated_user, db_session
    ):
        """Test GET /api/v1/profile-controls/{profile_id}/source."""
        from app.models.profile import Profile

        profile = Profile(
            user_id=str(authenticated_user.id),
            name="Test Profile",
            inherit_household_controls=True,
        )
        await profile.insert()

        with patch("app.core.security.get_current_active_user") as mock_auth:
            mock_auth.return_value = authenticated_user

            response = client.get(
                f"/api/v1/profile-controls/{str(profile.id)}/source"
            )

        assert response.status_code == 200
        data = response.json()
        assert "source" in data
        assert "controls_id" in data
        assert "inherit_household_controls" in data
