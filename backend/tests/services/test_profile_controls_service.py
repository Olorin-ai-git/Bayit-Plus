"""
Unit tests for Profile Controls Service.

Tests profile-aware family controls with household inheritance.
"""

import pytest
from datetime import datetime, timezone

from app.models.profile import Profile
from app.models.family_controls import FamilyControls
from app.models.household import Household, HouseholdMember, HouseholdRole
from app.services.profile_controls_service import profile_controls_service


@pytest.mark.asyncio
class TestProfileControlsService:
    """Test suite for ProfileControlsService."""

    async def test_get_effective_controls_custom(self, db_session):
        """Test getting custom profile controls."""
        # Create family controls
        controls = FamilyControls(
            user_id="user123",
            kids_enabled=True,
            kids_age_limit=10,
            youngsters_enabled=True,
            youngsters_age_limit=15,
            max_content_rating="PG",
        )
        await controls.insert()

        # Create profile with custom controls
        profile = Profile(
            user_id="user123",
            name="Test Profile",
            inherit_household_controls=False,
            custom_controls_id=str(controls.id),
        )
        await profile.insert()

        # Get effective controls
        result = await profile_controls_service.get_effective_controls(
            str(profile.id)
        )

        assert result is not None
        assert str(result.id) == str(controls.id)
        assert result.kids_age_limit == 10
        assert result.max_content_rating == "PG"

    async def test_get_effective_controls_household(self, db_session):
        """Test getting household-inherited controls."""
        # Create household shared controls
        shared_controls = FamilyControls(
            user_id="parent123",
            kids_enabled=True,
            kids_age_limit=12,
            max_content_rating="PG-13",
        )
        await shared_controls.insert()

        # Create household
        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id="parent123",
            members=[
                HouseholdMember(
                    user_id="parent123", role=HouseholdRole.PARENT
                )
            ],
            shared_controls_id=str(shared_controls.id),
        )
        await household.insert()

        # Create profile that inherits household controls
        profile = Profile(
            user_id="parent123",
            name="Kid Profile",
            inherit_household_controls=True,
        )
        await profile.insert()

        # Get effective controls
        result = await profile_controls_service.get_effective_controls(
            str(profile.id)
        )

        assert result is not None
        assert str(result.id) == str(shared_controls.id)
        assert result.kids_age_limit == 12
        assert result.max_content_rating == "PG-13"

    async def test_get_effective_controls_none(self, db_session):
        """Test getting controls when none are set."""
        profile = Profile(
            user_id="user123",
            name="Test Profile",
            inherit_household_controls=True,
        )
        await profile.insert()

        result = await profile_controls_service.get_effective_controls(
            str(profile.id)
        )

        assert result is None

    async def test_set_custom_controls(self, db_session):
        """Test setting custom controls for a profile."""
        controls = FamilyControls(
            user_id="user123",
            kids_enabled=True,
            kids_age_limit=8,
        )
        await controls.insert()

        profile = Profile(
            user_id="user123",
            name="Test Profile",
            inherit_household_controls=True,
        )
        await profile.insert()

        # Set custom controls
        updated = await profile_controls_service.set_custom_controls(
            str(profile.id), str(controls.id)
        )

        assert updated.custom_controls_id == str(controls.id)
        assert updated.inherit_household_controls is False

    async def test_inherit_household_controls(self, db_session):
        """Test switching profile to inherit household controls."""
        controls = FamilyControls(user_id="user123")
        await controls.insert()

        profile = Profile(
            user_id="user123",
            name="Test Profile",
            inherit_household_controls=False,
            custom_controls_id=str(controls.id),
        )
        await profile.insert()

        # Switch to inherit household
        updated = await profile_controls_service.inherit_household_controls(
            str(profile.id)
        )

        assert updated.inherit_household_controls is True
        assert updated.custom_controls_id is None

    async def test_get_controls_source_custom(self, db_session):
        """Test getting controls source info for custom controls."""
        controls = FamilyControls(user_id="user123")
        await controls.insert()

        profile = Profile(
            user_id="user123",
            name="Test Profile",
            inherit_household_controls=False,
            custom_controls_id=str(controls.id),
        )
        await profile.insert()

        source = await profile_controls_service.get_controls_source(
            str(profile.id)
        )

        assert source["source"] == "custom"
        assert source["controls_id"] == str(controls.id)
        assert source["inherit_household_controls"] is False

    async def test_get_controls_source_household(self, db_session):
        """Test getting controls source info for household controls."""
        shared_controls = FamilyControls(user_id="parent123")
        await shared_controls.insert()

        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id="parent123",
            members=[
                HouseholdMember(
                    user_id="parent123", role=HouseholdRole.PARENT
                )
            ],
            shared_controls_id=str(shared_controls.id),
        )
        await household.insert()

        profile = Profile(
            user_id="parent123",
            name="Profile",
            inherit_household_controls=True,
        )
        await profile.insert()

        source = await profile_controls_service.get_controls_source(
            str(profile.id)
        )

        assert source["source"] == "household"
        assert source["controls_id"] == str(shared_controls.id)
        assert source["inherit_household_controls"] is True

    async def test_get_controls_source_none(self, db_session):
        """Test getting controls source info when no controls."""
        profile = Profile(
            user_id="user123",
            name="Profile",
            inherit_household_controls=True,
        )
        await profile.insert()

        source = await profile_controls_service.get_controls_source(
            str(profile.id)
        )

        assert source["source"] == "none"
        assert source["controls_id"] is None
        assert source["inherit_household_controls"] is True
