"""
Unit Tests for Profile Service
Tests profile creation, QR code generation, and contact forms
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch

from app.services.profile_service import ProfileService
from app.models import Profile, CV


@pytest.fixture
def profile_service():
    """Create profile service instance"""
    return ProfileService()


@pytest.mark.asyncio
async def test_create_profile(profile_service, test_cv, test_user):
    """Test profile creation"""
    with patch('app.services.profile_service.StorageService') as mock_storage:
        mock_storage.return_value.upload_file = AsyncMock(
            return_value="https://storage.googleapis.com/test/qr.png"
        )

        profile = await profile_service.create_profile(
            cv_id=str(test_cv.id),
            user_id=str(test_user.id),
            slug="my-profile",
            visibility="public"
        )

        assert profile is not None
        assert profile.cv_id == str(test_cv.id)
        assert profile.user_id == str(test_user.id)
        assert profile.slug == "my-profile"
        assert profile.visibility == "public"
        assert "cvplus.olorin.ai/cv/my-profile" in profile.public_url


@pytest.mark.asyncio
async def test_create_profile_wrong_cv_owner(profile_service, test_cv):
    """Test profile creation with wrong CV owner"""
    with pytest.raises(PermissionError, match="CV not found or access denied"):
        await profile_service.create_profile(
            cv_id=str(test_cv.id),
            user_id="wrong_user_id",
            visibility="public"
        )


@pytest.mark.asyncio
async def test_create_profile_duplicate_slug(profile_service, test_cv, test_user, test_profile):
    """Test profile creation with duplicate slug"""
    with pytest.raises(ValueError, match="already taken"):
        await profile_service.create_profile(
            cv_id=str(test_cv.id),
            user_id=str(test_user.id),
            slug="test-profile",  # Already exists from fixture
            visibility="public"
        )


@pytest.mark.asyncio
async def test_generate_unique_slug(profile_service, test_user):
    """Test unique slug generation"""
    slug = await profile_service._generate_unique_slug(str(test_user.id))

    assert slug is not None
    assert "profile_" in slug
    assert len(slug) > 8


@pytest.mark.asyncio
async def test_generate_qr_code(profile_service, test_profile):
    """Test QR code generation"""
    with patch('app.services.profile_service.StorageService') as mock_storage:
        mock_storage.return_value.upload_file = AsyncMock(
            return_value="https://storage.googleapis.com/test/qr.png"
        )

        qr_url = await profile_service._generate_qr_code(test_profile)

        assert qr_url is not None
        assert "https://storage.googleapis.com" in qr_url
        mock_storage.return_value.upload_file.assert_called_once()


@pytest.mark.asyncio
async def test_get_profile_by_slug(profile_service, test_profile):
    """Test get profile by slug"""
    profile = await profile_service.get_profile_by_slug("test-profile")

    assert profile is not None
    assert profile.id == test_profile.id
    assert profile.slug == "test-profile"


@pytest.mark.asyncio
async def test_get_profile_by_slug_not_found(profile_service):
    """Test get profile by slug that doesn't exist"""
    profile = await profile_service.get_profile_by_slug("nonexistent")
    assert profile is None


@pytest.mark.asyncio
async def test_get_profile_private(profile_service, test_profile):
    """Test get private profile returns None"""
    test_profile.visibility = "private"
    await test_profile.save()

    profile = await profile_service.get_profile_by_slug("test-profile")
    assert profile is None


@pytest.mark.asyncio
async def test_update_profile(profile_service, test_profile, test_user):
    """Test profile update"""
    updated = await profile_service.update_profile(
        profile_id=str(test_profile.id),
        user_id=str(test_user.id),
        visibility="unlisted",
        show_contact_form=False
    )

    assert updated.visibility == "unlisted"
    assert updated.show_contact_form is False


@pytest.mark.asyncio
async def test_update_profile_wrong_owner(profile_service, test_profile):
    """Test profile update with wrong owner"""
    with pytest.raises(PermissionError, match="Profile not found or access denied"):
        await profile_service.update_profile(
            profile_id=str(test_profile.id),
            user_id="wrong_user_id",
            visibility="private"
        )


@pytest.mark.asyncio
async def test_submit_contact_request(profile_service, test_profile):
    """Test contact form submission"""
    contact = await profile_service.submit_contact_request(
        slug="test-profile",
        sender_name="Jane Doe",
        sender_email="jane@example.com",
        message="I'd like to connect",
        sender_phone="+1234567890",
        company="ACME Corp"
    )

    assert contact is not None
    assert contact.sender_name == "Jane Doe"
    assert contact.sender_email == "jane@example.com"
    assert contact.message == "I'd like to connect"


@pytest.mark.asyncio
async def test_submit_contact_profile_not_found(profile_service):
    """Test contact form for nonexistent profile"""
    with pytest.raises(ValueError, match="Profile not found"):
        await profile_service.submit_contact_request(
            slug="nonexistent",
            sender_name="Jane Doe",
            sender_email="jane@example.com",
            message="Hello"
        )


@pytest.mark.asyncio
async def test_submit_contact_form_disabled(profile_service, test_profile):
    """Test contact form when disabled"""
    test_profile.show_contact_form = False
    await test_profile.save()

    with pytest.raises(ValueError, match="Contact form is disabled"):
        await profile_service.submit_contact_request(
            slug="test-profile",
            sender_name="Jane Doe",
            sender_email="jane@example.com",
            message="Hello"
        )


@pytest.mark.asyncio
async def test_delete_profile(profile_service, test_profile, test_user):
    """Test profile deletion"""
    with patch('app.services.profile_service.StorageService') as mock_storage:
        mock_storage.return_value.delete_file = AsyncMock()

        await profile_service.delete_profile(
            profile_id=str(test_profile.id),
            user_id=str(test_user.id)
        )

        # Verify profile deleted
        deleted = await Profile.get(test_profile.id)
        assert deleted is None


@pytest.mark.asyncio
async def test_delete_profile_wrong_owner(profile_service, test_profile):
    """Test profile deletion with wrong owner"""
    with pytest.raises(PermissionError, match="Profile not found or access denied"):
        await profile_service.delete_profile(
            profile_id=str(test_profile.id),
            user_id="wrong_user_id"
        )
