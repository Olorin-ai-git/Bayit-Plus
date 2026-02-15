"""Tests for Zeh Ani mesh generation service."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.zeh_ani.mesh_generation_service import mesh_generation_service
from app.models.avatar_mesh import AvatarMesh, MeshStatus
from app.models.child_avatar import ChildAvatar


@pytest.mark.asyncio
class TestMeshGenerationService:
    """Test mesh generation service logic."""

    async def test_generate_mesh_from_selfie(self):
        """Test full mesh generation pipeline."""
        mock_avatar = MagicMock(spec=ChildAvatar)
        mock_avatar.id = "avatar_123"
        mock_avatar.video_selfie_gcs_path = "gs://bucket/video.mp4"

        with patch("app.services.zeh_ani.mesh_generation_service.AvatarMesh") as mock_mesh_class, \
             patch("app.services.zeh_ani.mesh_generation_service.submit_to_rpm") as mock_submit, \
             patch("app.services.zeh_ani.mesh_generation_service.poll_rpm_status") as mock_poll, \
             patch("app.services.zeh_ani.mesh_generation_service.download_glb") as mock_download, \
             patch("app.services.zeh_ani.mesh_generation_service.upload_glb_to_gcs") as mock_upload:

            # Mock mesh doesn't exist
            mock_mesh_class.find_one = AsyncMock(return_value=None)

            # Mock RPM submission
            mock_submit.return_value = "rpm_render_123"

            # Mock polling returns success
            mock_poll.return_value = {"status": "completed", "url": "https://rpm.com/mesh.glb"}

            # Mock GLB download
            mock_download.return_value = b"GLB_DATA"

            # Mock GCS upload
            mock_upload.return_value = "gs://bucket/mesh.glb"

            # Execute
            result = await mesh_generation_service.generate_mesh_from_selfie(mock_avatar)

            # Verify
            assert mock_submit.called
            assert mock_poll.called
            assert mock_download.called

    async def test_mesh_already_exists(self):
        """Test when mesh already exists and is ready."""
        mock_avatar = MagicMock(spec=ChildAvatar)
        mock_avatar.id = "avatar_123"

        mock_existing_mesh = MagicMock(spec=AvatarMesh)
        mock_existing_mesh.is_ready = True

        with patch("app.services.zeh_ani.mesh_generation_service.AvatarMesh.find_one") as mock_find:
            mock_find.return_value = mock_existing_mesh

            result = await mesh_generation_service.generate_mesh_from_selfie(mock_avatar)

            assert result == mock_existing_mesh

    async def test_mesh_generation_failure(self):
        """Test handling of mesh generation failure."""
        mock_avatar = MagicMock(spec=ChildAvatar)
        mock_avatar.id = "avatar_123"

        with patch("app.services.zeh_ani.mesh_generation_service.AvatarMesh.find_one") as mock_find, \
             patch("app.services.zeh_ani.mesh_generation_service.submit_to_rpm") as mock_submit:

            mock_find.return_value = None
            mock_submit.side_effect = Exception("RPM API error")

            with pytest.raises(Exception):
                await mesh_generation_service.generate_mesh_from_selfie(mock_avatar)
