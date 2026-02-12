"""
Mesh Generation Service.

Orchestrates 3D mesh generation from child video selfies via Ready Player Me.
Pipeline: download encrypted video -> extract frames -> RPM API -> poll -> download .glb
-> upload to GCS -> parse blend shapes/bones -> update ChildAvatar.
"""

import asyncio
import struct
from datetime import datetime, timezone
from typing import List, Optional, Tuple

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.avatar_mesh import AvatarMesh, MeshBlendShape, MeshStatus
from app.models.child_avatar import ChildAvatar

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
            render_id = await self._submit_to_rpm(video_bytes)
            mesh.rpm_render_id = render_id
            await mesh.save()

            rpm_result = await self._poll_rpm_status(render_id)
            glb_url = rpm_result.get("glb_url", "")

            glb_bytes = await self._download_glb(glb_url)
            blend_shapes, bone_count, vertex_count = (
                self._parse_mesh_metadata(glb_bytes)
            )

            mesh.status = MeshStatus.RIGGING
            mesh.updated_at = datetime.now(timezone.utc)
            await mesh.save()

            gcs_path = await self._upload_to_gcs(
                str(avatar.id), glb_bytes
            )
            thumbnail_path = await self._generate_thumbnail(
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

    async def _submit_to_rpm(self, video_bytes: bytes) -> str:
        """Submit video frames to Ready Player Me for mesh generation."""
        timeout = settings.READY_PLAYER_ME_TIMEOUT
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{settings.READY_PLAYER_ME_BASE_URL}/v1/avatars",
                headers={
                    "Authorization": f"Bearer {settings.READY_PLAYER_ME_API_KEY}",
                    "X-App-Id": settings.READY_PLAYER_ME_APP_ID,
                },
                files={"video": ("selfie.mp4", video_bytes, "video/mp4")},
                data={"output_format": "glb", "quality": "high"},
            )
            response.raise_for_status()
            data = response.json()
            render_id = data.get("id", "")
            logger.info(
                "RPM render submitted",
                extra={"render_id": render_id},
            )
            return render_id

    async def _poll_rpm_status(self, render_id: str) -> dict:
        """Poll RPM until mesh is ready or max polls exceeded."""
        interval = settings.READY_PLAYER_ME_POLL_INTERVAL
        max_polls = settings.READY_PLAYER_ME_MAX_POLLS
        timeout = settings.READY_PLAYER_ME_TIMEOUT

        async with httpx.AsyncClient(timeout=timeout) as client:
            for attempt in range(max_polls):
                response = await client.get(
                    f"{settings.READY_PLAYER_ME_BASE_URL}/v1/avatars/{render_id}",
                    headers={
                        "Authorization": (
                            f"Bearer {settings.READY_PLAYER_ME_API_KEY}"
                        ),
                    },
                )
                response.raise_for_status()
                data = response.json()
                status = data.get("status", "")

                if status == "completed":
                    return data
                if status == "failed":
                    raise ValueError(
                        f"RPM render failed: {data.get('error', 'unknown')}"
                    )

                logger.debug(
                    "RPM poll",
                    extra={
                        "render_id": render_id,
                        "attempt": attempt + 1,
                        "status": status,
                    },
                )
                await asyncio.sleep(interval)

        raise TimeoutError(
            f"RPM render did not complete after {max_polls} polls"
        )

    async def _download_glb(self, glb_url: str) -> bytes:
        """Download the generated .glb file from RPM."""
        timeout = settings.READY_PLAYER_ME_TIMEOUT
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(glb_url)
            response.raise_for_status()
            return response.content

    def _parse_mesh_metadata(
        self, glb_bytes: bytes,
    ) -> Tuple[List[MeshBlendShape], int, int]:
        """
        Parse blend shapes, bone count, and vertex count from glTF binary.

        glb format: 12-byte header + JSON chunk + binary chunk.
        We parse the JSON chunk for mesh metadata.
        """
        import json

        if len(glb_bytes) < 20:
            return [], 0, 0

        json_length = struct.unpack_from("<I", glb_bytes, 12)[0]
        json_data = glb_bytes[20: 20 + json_length].decode("utf-8")
        gltf = json.loads(json_data)

        blend_shapes: List[MeshBlendShape] = []
        meshes = gltf.get("meshes", [])
        for mesh_def in meshes:
            for primitive in mesh_def.get("primitives", []):
                targets = primitive.get("targets", [])
                extras = mesh_def.get("extras", {})
                target_names = extras.get("targetNames", [])
                for idx, _target in enumerate(targets):
                    name = (
                        target_names[idx]
                        if idx < len(target_names)
                        else f"target_{idx}"
                    )
                    blend_shapes.append(
                        MeshBlendShape(name=name, default_weight=0.0)
                    )

        bone_count = len(gltf.get("skins", [{}])[0].get("joints", [])
                        ) if gltf.get("skins") else 0

        vertex_count = 0
        accessors = gltf.get("accessors", [])
        for mesh_def in meshes:
            for primitive in mesh_def.get("primitives", []):
                pos_idx = primitive.get("attributes", {}).get("POSITION")
                if pos_idx is not None and pos_idx < len(accessors):
                    vertex_count += accessors[pos_idx].get("count", 0)

        return blend_shapes, bone_count, vertex_count

    async def _upload_to_gcs(
        self, avatar_id: str, glb_bytes: bytes,
    ) -> str:
        """Upload .glb to GCS and return the path."""
        from app.services.olorin.storage_service import storage_service

        gcs_path = f"zeh-ani/meshes/{avatar_id}/avatar.glb"
        await storage_service.upload_bytes(
            glb_bytes, gcs_path, content_type="model/gltf-binary",
        )
        return gcs_path

    async def _generate_thumbnail(
        self, avatar_id: str, glb_bytes: bytes,
    ) -> Optional[str]:
        """Generate a thumbnail preview of the 3D mesh."""
        import io

        import trimesh

        from app.services.olorin.storage_service import storage_service

        thumbnail_path = f"zeh-ani/meshes/{avatar_id}/thumbnail.png"

        try:
            scene = trimesh.load(io.BytesIO(glb_bytes), file_type="glb")
            png_bytes = scene.save_image(resolution=(512, 512))
            await storage_service.upload_bytes(
                png_bytes, thumbnail_path, content_type="image/png",
            )
        except Exception as exc:
            logger.warning(
                "Mesh thumbnail generation failed, using fallback",
                extra={"avatar_id": avatar_id, "error": str(exc)},
            )
            minimal_png = (
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
                b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00"
                b"\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00"
                b"\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
            )
            await storage_service.upload_bytes(
                minimal_png, thumbnail_path, content_type="image/png",
            )

        return thumbnail_path


mesh_generation_service = MeshGenerationService()
