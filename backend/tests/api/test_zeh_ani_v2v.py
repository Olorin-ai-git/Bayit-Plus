"""Tests for Zeh Ani V2V (Voice-to-Voice) API endpoints."""

import pytest
from fastapi import status
from unittest.mock import AsyncMock, patch

from app.models.child_avatar import ChildAvatar


@pytest.mark.asyncio
async def test_start_v2v_session_success(client, mock_auth_user):
    """Test starting a V2V transformation session."""
    avatar_id = "test-avatar-123"
    profile_id = "test-profile-456"

    mock_avatar = ChildAvatar(
        id=avatar_id,
        child_profile_id=profile_id,
        avatar_name="Test Avatar",
        mesh_id="mesh-123"
    )

    with patch("app.api.routes.zeh_ani.v2v_routes.ChildAvatar.get", new=AsyncMock(return_value=mock_avatar)), \
         patch("app.services.zeh_ani.v2v_transform_service.v2v_transform_service.start_session") as mock_start:

        mock_start.return_value = {
            "session_id": "session-789",
            "avatar_id": avatar_id,
            "status": "ready"
        }

        response = client.post(
            f"/api/zeh-ani/v2v/start",
            json={
                "avatar_id": avatar_id,
                "profile_id": profile_id,
                "target_phrase": "שלום"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["session_id"] == "session-789"
        assert data["status"] == "ready"


@pytest.mark.asyncio
async def test_transform_audio_success(client, mock_auth_user):
    """Test audio transformation endpoint."""
    session_id = "session-123"

    with patch("app.services.zeh_ani.v2v_transform_service.v2v_transform_service.transform_audio") as mock_transform:
        mock_transform.return_value = {
            "transformed_audio_url": "https://example.com/audio.wav",
            "score": 0.85,
            "feedback": "Great pronunciation!"
        }

        response = client.post(
            f"/api/zeh-ani/v2v/{session_id}/transform",
            files={"audio": ("test.wav", b"fake audio data", "audio/wav")}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "transformed_audio_url" in data
        assert data["score"] == 0.85


@pytest.mark.asyncio
async def test_get_v2v_history(client, mock_auth_user):
    """Test retrieving V2V session history."""
    profile_id = "profile-123"

    with patch("app.api.routes.zeh_ani.v2v_routes.get_v2v_history") as mock_history:
        mock_history.return_value = [
            {
                "session_id": "session-1",
                "target_phrase": "שלום",
                "score": 0.90,
                "created_at": "2026-02-15T10:00:00Z"
            },
            {
                "session_id": "session-2",
                "target_phrase": "תודה",
                "score": 0.75,
                "created_at": "2026-02-15T11:00:00Z"
            }
        ]

        response = client.get(f"/api/zeh-ani/v2v/history/{profile_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2
        assert data[0]["score"] == 0.90


@pytest.mark.asyncio
async def test_v2v_without_consent_fails(client, mock_auth_user):
    """Test V2V fails without biometric consent."""
    avatar_id = "test-avatar-123"
    profile_id = "test-profile-456"

    with patch("app.services.zeh_ani.biometric_consent_service.biometric_consent_service.check_consent") as mock_check:
        mock_check.return_value = False

        response = client.post(
            f"/api/zeh-ani/v2v/start",
            json={
                "avatar_id": avatar_id,
                "profile_id": profile_id,
                "target_phrase": "שלום"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
