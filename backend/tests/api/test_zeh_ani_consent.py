"""Tests for Zeh Ani biometric consent API endpoints."""

import pytest
from datetime import datetime, timezone
from fastapi import status
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.biometric_consent import BiometricConsentType


@pytest.mark.asyncio
class TestBiometricConsent:
    """Test biometric consent endpoints."""

    async def test_grant_consent_success(self, client, auth_headers, mock_user):
        """Test successfully granting biometric consent."""
        profile_id = "profile_123"
        consent_type = "mesh_generation"
        pin = "123456"

        with patch(
            "app.api.routes.zeh_ani.consent_routes.biometric_consent_service"
        ) as mock_service:
            mock_consent = MagicMock()
            mock_consent.id = "consent_abc123"
            mock_consent.consent_type = BiometricConsentType.MESH_GENERATION
            mock_consent.is_active = True
            mock_consent.granted_at = datetime(
                2026, 1, 1, tzinfo=timezone.utc
            )
            mock_consent.on_device_only = True
            mock_service.grant_biometric_consent = AsyncMock(
                return_value=mock_consent
            )

            response = await client.post(
                "/api/v1/zeh-ani/consent/biometric",
                json={
                    "profile_id": profile_id,
                    "consent_type": consent_type,
                    "pin": pin,
                },
                headers=auth_headers,
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["consent_type"] == consent_type
        assert data["active"] is True

    async def test_grant_consent_invalid_pin(self, client, auth_headers):
        """Test consent grant with invalid PIN."""
        with patch(
            "app.api.routes.zeh_ani.consent_routes.biometric_consent_service"
        ) as mock_service:
            mock_service.grant_biometric_consent = AsyncMock(
                side_effect=ValueError("Invalid PIN")
            )

            response = await client.post(
                "/api/v1/zeh-ani/consent/biometric",
                json={
                    "profile_id": "profile_123",
                    "consent_type": "mesh_generation",
                    "pin": "wrong1",
                },
                headers=auth_headers,
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    async def test_get_consent_status(self, client, auth_headers, mock_user):
        """Test getting consent status for a profile."""
        profile_id = "profile_123"

        with patch(
            "app.api.routes.zeh_ani.consent_routes.biometric_consent_service"
        ) as mock_service:
            mock_service.get_consent_status = AsyncMock(
                return_value={
                    "mesh_generation": True,
                    "voice_v2v": False,
                }
            )

            response = await client.get(
                f"/api/v1/zeh-ani/consent/biometric/{profile_id}",
                headers=auth_headers,
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["profile_id"] == profile_id
        assert len(data["consents"]) >= 1
        assert any(
            c["consent_type"] == "mesh_generation" for c in data["consents"]
        )

    async def test_revoke_consent(self, client, auth_headers, mock_user):
        """Test revoking biometric consent."""
        profile_id = "profile_123"
        consent_type = "mesh_generation"

        with patch(
            "app.api.routes.zeh_ani.consent_routes.biometric_consent_service"
        ) as mock_service:
            mock_service.revoke_biometric_consent = AsyncMock(
                return_value=True
            )

            response = await client.delete(
                f"/api/v1/zeh-ani/consent/biometric/{profile_id}",
                params={"consent_type": consent_type},
                headers=auth_headers,
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["revoked"] is True
