"""Tests for Zeh Ani Magic Mirror API endpoints."""

import pytest
from fastapi import status
from unittest.mock import AsyncMock, patch
from datetime import datetime


@pytest.mark.asyncio
async def test_get_daily_greeting_success(client, mock_auth_user):
    """Test retrieving daily Magic Mirror greeting."""
    profile_id = "profile-123"

    mock_greeting = {
        "id": "greeting-456",
        "profile_id": profile_id,
        "greeting_hebrew": "בוקר טוב, חבר!",
        "greeting_english": "Good morning, friend!",
        "vocabulary_word": "חבר",
        "vocabulary_translation": "friend",
        "date": datetime.utcnow().isoformat(),
        "avatar_pose_url": "https://example.com/avatar.glb"
    }

    with patch("app.services.zeh_ani.magic_mirror_service.magic_mirror_service.get_daily_greeting") as mock_get:
        mock_get.return_value = mock_greeting

        response = client.get(f"/api/zeh-ani/magic-mirror/{profile_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["profile_id"] == profile_id
        assert "בוקר טוב" in data["greeting_hebrew"]
        assert "vocabulary_word" in data


@pytest.mark.asyncio
async def test_generate_new_greeting_success(client, mock_auth_user):
    """Test generating a fresh Magic Mirror greeting."""
    profile_id = "profile-123"

    mock_new_greeting = {
        "id": "greeting-789",
        "profile_id": profile_id,
        "greeting_hebrew": "ערב טוב!",
        "greeting_english": "Good evening!",
        "vocabulary_word": "ערב",
        "vocabulary_translation": "evening",
        "date": datetime.utcnow().isoformat()
    }

    with patch("app.services.zeh_ani.magic_mirror_service.magic_mirror_service.generate_greeting") as mock_gen:
        mock_gen.return_value = mock_new_greeting

        response = client.post(
            f"/api/zeh-ani/magic-mirror/{profile_id}/generate",
            json={"force_new": True}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["greeting_hebrew"] == "ערב טוב!"
        assert data["vocabulary_word"] == "ערב"


@pytest.mark.asyncio
async def test_get_greeting_history(client, mock_auth_user):
    """Test retrieving Magic Mirror greeting history."""
    profile_id = "profile-123"

    mock_history = [
        {"date": "2026-02-15", "greeting_hebrew": "בוקר טוב", "vocabulary_word": "חבר"},
        {"date": "2026-02-14", "greeting_hebrew": "שלום", "vocabulary_word": "משפחה"},
        {"date": "2026-02-13", "greeting_hebrew": "להתראות", "vocabulary_word": "יום"}
    ]

    with patch("app.api.routes.zeh_ani.mirror_routes.get_greeting_history") as mock_history_fn:
        mock_history_fn.return_value = mock_history

        response = client.get(f"/api/zeh-ani/magic-mirror/{profile_id}/history")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 3
        assert data[0]["vocabulary_word"] == "חבר"


@pytest.mark.asyncio
async def test_mark_greeting_as_viewed(client, mock_auth_user):
    """Test marking greeting as viewed for analytics."""
    greeting_id = "greeting-123"

    with patch("app.services.zeh_ani.magic_mirror_service.magic_mirror_service.mark_viewed") as mock_mark:
        mock_mark.return_value = True

        response = client.post(
            f"/api/zeh-ani/magic-mirror/greeting/{greeting_id}/viewed"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
