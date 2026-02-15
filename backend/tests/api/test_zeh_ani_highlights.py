"""Tests for Zeh Ani Highlight Reels API endpoints."""

import pytest
from fastapi import status
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_create_highlight_reel_success(client, mock_auth_user):
    """Test creating a new highlight reel."""
    profile_id = "profile-123"
    avatar_id = "avatar-456"

    mock_reel = {
        "id": "reel-789",
        "profile_id": profile_id,
        "avatar_id": avatar_id,
        "title": "Weekly Highlights",
        "status": "generating",
        "video_url": None
    }

    with patch("app.services.zeh_ani.highlight_reel_service.highlight_reel_service.create_reel") as mock_create:
        mock_create.return_value = mock_reel

        response = client.post(
            f"/api/zeh-ani/highlights/create",
            json={
                "profile_id": profile_id,
                "avatar_id": avatar_id,
                "title": "Weekly Highlights",
                "clips": ["clip1", "clip2", "clip3"]
            }
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["status"] == "generating"
        assert data["title"] == "Weekly Highlights"


@pytest.mark.asyncio
async def test_get_highlight_reel_status(client, mock_auth_user):
    """Test checking highlight reel generation status."""
    reel_id = "reel-123"

    mock_status = {
        "id": reel_id,
        "status": "ready",
        "video_url": "https://example.com/reel.mp4",
        "thumbnail_url": "https://example.com/thumb.jpg",
        "duration": 120
    }

    with patch("app.services.zeh_ani.highlight_reel_service.highlight_reel_service.get_status") as mock_get:
        mock_get.return_value = mock_status

        response = client.get(f"/api/zeh-ani/highlights/{reel_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "ready"
        assert data["video_url"] is not None


@pytest.mark.asyncio
async def test_list_highlight_reels(client, mock_auth_user):
    """Test listing all highlight reels for a profile."""
    profile_id = "profile-123"

    mock_reels = [
        {
            "id": "reel-1",
            "title": "January Highlights",
            "status": "ready",
            "created_at": "2026-01-31T00:00:00Z"
        },
        {
            "id": "reel-2",
            "title": "February Week 1",
            "status": "ready",
            "created_at": "2026-02-07T00:00:00Z"
        }
    ]

    with patch("app.api.routes.zeh_ani.highlight_routes.list_reels") as mock_list:
        mock_list.return_value = mock_reels

        response = client.get(f"/api/zeh-ani/highlights/profile/{profile_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2
        assert data[0]["title"] == "January Highlights"


@pytest.mark.asyncio
async def test_generate_share_token(client, mock_auth_user):
    """Test generating a shareable link for a highlight reel."""
    reel_id = "reel-123"

    mock_token = {
        "share_token": "abc123xyz",
        "share_url": "https://bayit.tv/share/abc123xyz",
        "expires_at": "2026-03-15T00:00:00Z"
    }

    with patch("app.services.zeh_ani.highlight_reel_service.highlight_reel_service.generate_share_token") as mock_gen:
        mock_gen.return_value = mock_token

        response = client.post(f"/api/zeh-ani/highlights/{reel_id}/share")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "share_token" in data
        assert "share_url" in data


@pytest.mark.asyncio
async def test_delete_highlight_reel(client, mock_auth_user):
    """Test deleting a highlight reel."""
    reel_id = "reel-123"

    with patch("app.services.zeh_ani.highlight_reel_service.highlight_reel_service.delete_reel") as mock_delete:
        mock_delete.return_value = True

        response = client.delete(f"/api/zeh-ani/highlights/{reel_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
