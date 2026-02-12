"""
Mesh Generation Service.

Orchestrates 3D mesh generation from child video selfies via Ready Player Me.
Pipeline: download encrypted video -> extract frames -> RPM API -> poll -> download .glb
-> upload to GCS -> parse blend shapes/bones -> update ChildAvatar.
"""

from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.avatar_mesh import AvatarMesh, MeshStatus
from app.models.child_avatar import ChildAvatar
from app.services.zeh_ani.mesh_generation_helpers import (
    download_glb,
    generate_mesh_thumbnail,
    parse_mesh_metadata,
    poll_rpm_status,
    submit_to_rpm,
    upload_glb_to_gcs,
)

logger = get_logger(__name__)


class MeshGenerationService:
    """Generates 3D rigged meshes from child video selfies via RPM."""

    async def generate_mesh_from_selfie(
        self, avatar: ChildAvatar,
    ) -> AvatarMesh:
        """
        Full pipeline: video selfie -> RPM mesh -> GCS upload.

        Returns the AvatarMesh document with status tracking.
        """
        mesh = await AvatarMesh.find_one(
            AvatarMesh.avatar_id == str(avatar.id)
        )
        if mesh and mesh.is_ready:
            logger.info(
                "Mesh already exists",
                extra={"avatar_id": str(avatar.id), "mesh_id": str(mesh.id)},
            )
            return mesh

        if not mesh:
            mesh = AvatarMesh(
                avatar_id=str(avatar.id),
                user_id=avatar.user_id,
                profile_id=avatar.profile_id,
                status=MeshStatus.PENDING,
                credits_charged=settings.CREDIT_RATE_3D_MESH,
            )
            await mesh.insert()

        mesh.status = MeshStatus.GENERATING
        mesh.updated_at = datetime.now(timezone.utc)
        await mesh.save()

        try:
            video_bytes = await self._download_selfie_video(avatar)
            render_id = await submit_to_rpm(video_bytes)
            mesh.rpm_render_id = render_id
            await mesh.save()

            rpm_result = await poll_rpm_status(render_id)
            glb_url = rpm_result.get("glb_url", "")

            glb_bytes = await download_glb(glb_url)
            blend_shapes, bone_count, vertex_count = (
                parse_mesh_metadata(glb_bytes)
            )

            mesh.status = MeshStatus.RIGGING
            mesh.updated_at = datetime.now(timezone.utc)
            await mesh.save()

            gcs_path = await upload_glb_to_gcs(str(avatar.id), glb_bytes)
            thumbnail_path = await generate_mesh_thumbnail(
                str(avatar.id), glb_bytes
            )

            mesh.glb_gcs_path = gcs_path
            mesh.thumbnail_gcs_path = thumbnail_path
            mesh.blend_shapes = blend_shapes
            mesh.bone_count = bone_count
            mesh.vertex_count = vertex_count
            mesh.status = MeshStatus.READY
            mesh.updated_at = datetime.now(timezone.utc)
            await mesh.save()

            from app.services.zeh_ani import deduct_zeh_ani_credits

            await deduct_zeh_ani_credits(
                user_id=avatar.user_id,
                feature="3d_mesh",
                usage_amount=1.0,
                metadata={
                    "mesh_id": str(mesh.id),
                    "avatar_id": str(avatar.id),
                },
            )

            avatar.mesh_id = str(mesh.id)
            avatar.mesh_status = "ready"
            avatar.has_3d_mesh = True
            avatar.updated_at = datetime.now(timezone.utc)
            await avatar.save()

            logger.info(
                "Mesh generation complete",
                extra={
                    "avatar_id": str(avatar.id),
                    "mesh_id": str(mesh.id),
                    "blend_shapes": len(blend_shapes),
                    "bone_count": bone_count,
                },
            )
            return mesh

        except Exception as exc:
            mesh.status = MeshStatus.FAILED
            mesh.error_message = str(exc)[:500]
            mesh.updated_at = datetime.now(timezone.utc)
            await mesh.save()
            avatar.mesh_status = "failed"
            avatar.updated_at = datetime.now(timezone.utc)
            await avatar.save()
            logger.error(
                "Mesh generation failed",
                extra={"avatar_id": str(avatar.id), "error": str(exc)},
            )
            raise

    async def _download_selfie_video(
        self, avatar: ChildAvatar,
    ) -> bytes:
        """Download and decrypt the child's video selfie from GCS."""
        from app.services.olorin.storage_service import storage_service

        if not avatar.video_selfie_gcs_path:
            raise ValueError("No video selfie uploaded for this avatar")
        return await storage_service.download_bytes(
            avatar.video_selfie_gcs_path
        )


mesh_generation_service = MeshGenerationService()
