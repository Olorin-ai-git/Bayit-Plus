"""Tests for Zeh Ani mesh generation API endpoints."""

import pytest
from fastapi import status
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.avatar_mesh import AvatarMesh, MeshStatus, MeshSource
from app.models.child_avatar import ChildAvatar


@pytest.mark.asyncio
class TestMeshGeneration:
    """Test mesh generation endpoints."""

    async def test_generate_mesh_success(self, client, auth_headers, mock_user):
        """Test successful mesh generation request."""
        # Setup
        profile_id = "test_profile_123"
        pin = "123456"

        with patch("app.api.routes.zeh_ani.mesh_routes.ChildAvatar.find_one") as mock_find, \
             patch("app.api.routes.zeh_ani.mesh_routes.AvatarMesh.find_one") as mock_mesh_find, \
             patch("app.api.routes.zeh_ani.mesh_routes.biometric_consent_service") as mock_consent:

            # Mock avatar exists
            mock_avatar = MagicMock(spec=ChildAvatar)
            mock_avatar.id = "avatar_123"
            mock_avatar.video_selfie_gcs_path = "gs://bucket/video.mp4"
            mock_find.return_value = mock_avatar

            # Mock no existing mesh
            mock_mesh_find.return_value = None

            # Mock consent verification
            mock_consent.verify_pin = AsyncMock()
            mock_consent.has_biometric_consent = AsyncMock(return_value=True)

            # Make request
            response = await client.post(
                "/api/v1/zeh-ani/mesh/generate",
                json={"profile_id": profile_id, "pin": pin},
                headers=auth_headers
            )

        # Assertions
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["avatar_id"] == "avatar_123"
        assert data["status"] in ["pending", "generating"]

    async def test_generate_mesh_no_avatar(self, client, auth_headers):
        """Test mesh generation when avatar doesn't exist."""
        with patch("app.api.routes.zeh_ani.mesh_routes.ChildAvatar.find_one") as mock_find:
            mock_find.return_value = None

            response = await client.post(
                "/api/v1/zeh-ani/mesh/generate",
                json={"profile_id": "invalid", "pin": "123456"},
                headers=auth_headers
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()

    async def test_generate_mesh_no_consent(self, client, auth_headers):
        """Test mesh generation without biometric consent."""
        with patch("app.api.routes.zeh_ani.mesh_routes.ChildAvatar.find_one") as mock_find, \
             patch("app.api.routes.zeh_ani.mesh_routes.biometric_consent_service") as mock_consent:

            mock_avatar = MagicMock(spec=ChildAvatar)
            mock_avatar.video_selfie_gcs_path = "gs://bucket/video.mp4"
            mock_find.return_value = mock_avatar

            mock_consent.verify_pin = AsyncMock()
            mock_consent.has_biometric_consent = AsyncMock(return_value=False)

            response = await client.post(
                "/api/v1/zeh-ani/mesh/generate",
                json={"profile_id": "profile_123", "pin": "123456"},
                headers=auth_headers
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "consent" in response.json()["detail"].lower()

    async def test_get_mesh_status(self, client, auth_headers, mock_user):
        """Test getting mesh status."""
        avatar_id = "avatar_123"

        with patch("app.api.routes.zeh_ani.mesh_routes.AvatarMesh.find_one") as mock_find:
            mock_mesh = MagicMock(spec=AvatarMesh)
            mock_mesh.id = "mesh_123"
            mock_mesh.avatar_id = avatar_id
            mock_mesh.user_id = str(mock_user.id)
            mock_mesh.status = MeshStatus.READY
            mock_mesh.source = MeshSource.RPM
            mock_mesh.glb_gcs_path = "gs://bucket/mesh.glb"
            mock_mesh.blend_shapes = []
            mock_mesh.credits_charged = 100
            mock_find.return_value = mock_mesh

            response = await client.get(
                f"/api/v1/zeh-ani/mesh/{avatar_id}",
                headers=auth_headers
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["avatar_id"] == avatar_id
        assert data["status"] == "ready"

    async def test_get_glb_url(self, client, auth_headers, mock_user):
        """Test getting GLB download URL."""
        avatar_id = "avatar_123"

        with patch("app.api.routes.zeh_ani.mesh_routes.AvatarMesh.find_one") as mock_find, \
             patch("app.api.routes.zeh_ani.mesh_routes.storage_service") as mock_storage:

            mock_mesh = MagicMock(spec=AvatarMesh)
            mock_mesh.user_id = str(mock_user.id)
            mock_mesh.is_ready = True
            mock_mesh.glb_gcs_path = "gs://bucket/mesh.glb"
            mock_find.return_value = mock_mesh

            mock_storage.generate_signed_url = AsyncMock(
                return_value="https://signed-url.com/mesh.glb"
            )

            response = await client.get(
                f"/api/v1/zeh-ani/mesh/{avatar_id}/glb",
                headers=auth_headers
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "signed_url" in data
        assert data["avatar_id"] == avatar_id
        assert data["expires_in_seconds"] > 0


@pytest.mark.asyncio
class TestMeshUpload:
    """Test on-device mesh upload."""

    async def test_upload_glb_success(self, client, auth_headers, mock_user):
        """Test successful GLB mesh upload."""
        # This would test the multipart upload endpoint
        # Implementation depends on test client's multipart support
        pass

    async def test_upload_glb_invalid_format(self, client, auth_headers):
        """Test upload with invalid GLB file."""
        pass
