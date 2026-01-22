"""
Unit Tests for Profile Service
Tests profile creation, QR code generation, and contact forms
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from bson import ObjectId


def create_mock_profile(
    profile_id: str = None,
    user_id: str = None,
    cv_id: str = None,
    slug: str = "test-profile",
    visibility: str = "public"
):
    """Create a mock profile object."""
    mock = MagicMock()
    mock.id = ObjectId(profile_id) if profile_id else ObjectId()
    mock.user_id = user_id or str(ObjectId())
    mock.cv_id = cv_id or str(ObjectId())
    mock.slug = slug
    mock.public_url = f"https://cvplus.olorin.ai/cv/{slug}"
    mock.visibility = visibility
    mock.show_contact_form = True
    mock.qr_code_url = None
    return mock


def create_mock_cv(cv_id: str = None, user_id: str = None):
    """Create a mock CV object."""
    mock = MagicMock()
    mock.id = ObjectId(cv_id) if cv_id else ObjectId()
    mock.user_id = user_id or str(ObjectId())
    mock.filename = "test.pdf"
    mock.status = "completed"
    return mock


@pytest.mark.asyncio
async def test_create_profile_validates_cv_ownership():
    """Test that create_profile validates CV ownership"""
    with patch('app.services.profile_service.CV') as mock_cv_class:
        mock_cv_class.get = AsyncMock(return_value=None)

        from app.services.profile_service import ProfileService
        service = ProfileService()

        with pytest.raises(PermissionError, match="CV not found"):
            await service.create_profile(
                cv_id="507f1f77bcf86cd799439011",
                user_id="user123",
                visibility="public"
            )


@pytest.mark.asyncio
async def test_update_profile_validates_ownership():
    """Test that update_profile validates ownership"""
    with patch('app.services.profile_service.Profile') as mock_profile_class:
        # update_profile uses Profile.get(), not find_one
        mock_profile_class.get = AsyncMock(return_value=None)

        from app.services.profile_service import ProfileService
        service = ProfileService()

        with pytest.raises(PermissionError, match="Profile not found"):
            await service.update_profile(
                profile_id="507f1f77bcf86cd799439011",
                user_id="wrong_user",
                visibility="private"
            )


@pytest.mark.asyncio
async def test_delete_profile_validates_ownership():
    """Test that delete_profile validates ownership"""
    with patch('app.services.profile_service.Profile') as mock_profile_class:
        # delete_profile uses Profile.get(), not find_one
        mock_profile_class.get = AsyncMock(return_value=None)

        from app.services.profile_service import ProfileService
        service = ProfileService()

        with pytest.raises(PermissionError, match="Profile not found"):
            await service.delete_profile(
                profile_id="507f1f77bcf86cd799439011",
                user_id="wrong_user"
            )
