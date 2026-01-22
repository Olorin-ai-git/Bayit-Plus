"""
Integration Tests for Profile API Endpoints
Tests full request/response cycle for profile operations
"""

import pytest
from unittest.mock import AsyncMock, patch


def test_create_profile_success(client, auth_headers, test_cv):
    """Test successful profile creation"""
    request_data = {
        "cv_id": str(test_cv.id),
        "slug": "my-awesome-profile",
        "visibility": "public"
    }

    with patch('app.services.profile_service.ProfileService.create_profile') as mock_create:
        from app.models import Profile
        mock_profile = Profile(
            id="profile_123",
            user_id="test_user",
            cv_id=str(test_cv.id),
            slug="my-awesome-profile",
            public_url="https://cvplus.olorin.ai/cv/my-awesome-profile",
            visibility="public"
        )
        mock_create.return_value = mock_profile

        response = client.post(
            "/api/v1/profile/create",
            json=request_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "my-awesome-profile"
        assert "public_url" in data


def test_create_profile_unauthorized(client):
    """Test profile creation without authentication"""
    request_data = {
        "cv_id": "test_cv_id",
        "slug": "my-profile"
    }

    response = client.post(
        "/api/v1/profile/create",
        json=request_data
    )

    assert response.status_code == 403


def test_view_public_profile_success(client):
    """Test viewing public profile (no auth required)"""
    slug = "test-profile"

    with patch('app.services.profile_service.ProfileService.get_profile_by_slug') as mock_get:
        with patch('app.models.CV.get') as mock_cv:
            from app.models import Profile, CV
            mock_profile = Profile(
                id="profile_123",
                user_id="test_user",
                cv_id="cv_123",
                slug=slug,
                public_url=f"https://cvplus.olorin.ai/cv/{slug}",
                visibility="public",
                theme="professional",
                show_contact_form=True,
                show_download_button=True
            )
            mock_get.return_value = mock_profile

            mock_cv.return_value = CV(
                id="cv_123",
                user_id="test_user",
                filename="test.pdf",
                original_filename="test.pdf",
                file_format="pdf",
                file_size_bytes=1024,
                storage_url="https://storage.com/cv.pdf",
                status="completed"
            )

            response = client.get(f"/api/v1/profile/{slug}")

            assert response.status_code == 200
            data = response.json()
            assert data["slug"] == slug
            assert data["show_contact_form"] is True


def test_view_public_profile_not_found(client):
    """Test viewing nonexistent profile"""
    with patch('app.services.profile_service.ProfileService.get_profile_by_slug') as mock_get:
        mock_get.return_value = None

        response = client.get("/api/v1/profile/nonexistent")

        assert response.status_code == 404


def test_update_profile_success(client, auth_headers):
    """Test profile update"""
    profile_id = "profile_123"
    request_data = {"visibility": "unlisted"}

    with patch('app.services.profile_service.ProfileService.update_profile') as mock_update:
        from app.models import Profile
        mock_profile = Profile(
            id=profile_id,
            user_id="test_user",
            cv_id="cv_123",
            slug="test-profile",
            public_url="https://cvplus.olorin.ai/cv/test-profile",
            visibility="unlisted"
        )
        mock_update.return_value = mock_profile

        response = client.put(
            f"/api/v1/profile/{profile_id}",
            params=request_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["profile_id"] == profile_id


def test_submit_contact_success(client):
    """Test contact form submission"""
    slug = "test-profile"
    request_data = {
        "sender_name": "Jane Doe",
        "sender_email": "jane@example.com",
        "message": "I'd like to connect",
        "sender_phone": "+1234567890",
        "company": "ACME Corp"
    }

    with patch('app.services.profile_service.ProfileService.submit_contact_request') as mock_submit:
        from app.models import ContactRequest
        mock_contact = ContactRequest(
            id="contact_123",
            profile_id="profile_123",
            profile_owner_id="owner_123",
            sender_name="Jane Doe",
            sender_email="jane@example.com",
            message="I'd like to connect"
        )
        mock_submit.return_value = mock_contact

        response = client.post(
            f"/api/v1/profile/{slug}/contact",
            json=request_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "sent"
        assert "contact_id" in data


def test_delete_profile_success(client, auth_headers):
    """Test profile deletion"""
    profile_id = "profile_123"

    with patch('app.services.profile_service.ProfileService.delete_profile') as mock_delete:
        mock_delete.return_value = None

        response = client.delete(
            f"/api/v1/profile/{profile_id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "deleted"
        assert data["profile_id"] == profile_id


def test_delete_profile_unauthorized(client):
    """Test profile deletion without authentication"""
    response = client.delete("/api/v1/profile/profile_123")

    assert response.status_code == 403
