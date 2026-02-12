"""
ControlNet Style Service.

Transfers show visual style onto 3D avatar meshes using ControlNet + IP-Adapter
via Replicate. Validates output quality via CLIP similarity scoring, reusing
the pattern established in chameleon/style_transfer.py.
"""

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.avatar_mesh import AvatarMesh
from app.models.avatar_style_cache import (
    AvatarPoseCache,
    AvatarStyleCache,
    StyleCacheStatus,
    StyleDescriptor,
)
from app.models.child_avatar import POSE_NAMES, ChildAvatar

logger = get_logger(__name__)


class ControlNetStyleService:
    """Transfers show style onto 3D meshes via ControlNet + IP-Adapter."""

    async def transfer_style_controlnet(
        self,
        avatar: ChildAvatar,
        mesh: AvatarMesh,
        style: StyleDescriptor,
        show_content_id: str,
        cache_id: str,
    ) -> AvatarStyleCache:
        """Apply ControlNet style transfer to mesh-rendered poses."""
        existing = await AvatarStyleCache.find_one(
            AvatarStyleCache.avatar_id == str(avatar.id),
            AvatarStyleCache.show_content_id == show_content_id,
            AvatarStyleCache.status == StyleCacheStatus.READY,
        )
        if existing:
            existing.last_used_at = datetime.now(timezone.utc)
            await existing.save()
            return existing

        style_hash = hashlib.sha256(
            style.model_dump_json().encode()
        ).hexdigest()[:16]
        cache_ttl = settings.CHAMELEON_STYLE_CACHE_TTL_HOURS

        cache = AvatarStyleCache(
            avatar_id=str(avatar.id),
            show_content_id=show_content_id,
            style_embedding_hash=style_hash,
            style_descriptor=style,
            status=StyleCacheStatus.GENERATING,
            expires_at=(
                datetime.now(timezone.utc) + timedelta(hours=cache_ttl)
            ),
        )
        await cache.insert()

        try:
            transferred = []
            for pose_name in POSE_NAMES:
                pose_bytes = await self._render_mesh_pose(mesh, pose_name)
                if not pose_bytes:
                    continue
                result = await self._apply_controlnet(
                    pose_bytes, style, avatar, pose_name,
                    show_content_id, str(cache.id),
                )
                if result:
                    transferred.append(result)

            cache.poses = transferred
            cache.clip_similarity_score = await self._compute_clip_score(
                transferred
            )
            threshold = settings.CHAMELEON_STYLE_SIMILARITY_THRESHOLD
            if cache.clip_similarity_score >= threshold:
                cache.status = StyleCacheStatus.READY
            else:
                cache.status = StyleCacheStatus.FAILED
                logger.warning(
                    "ControlNet style below threshold",
                    extra={
                        "cache_id": str(cache.id),
                        "score": cache.clip_similarity_score,
                    },
                )
            await cache.save()
            return cache

        except Exception as exc:
            cache.status = StyleCacheStatus.FAILED
            await cache.save()
            logger.error(
                "ControlNet style transfer failed",
                extra={"cache_id": str(cache.id), "error": str(exc)},
            )
            raise

    async def _render_mesh_pose(
        self, mesh: AvatarMesh, pose_name: str,
    ) -> Optional[bytes]:
        """Render a single mesh pose as a 2D image (server-side)."""
        from app.services.olorin.storage_service import storage_service

        if not mesh.glb_gcs_path:
            return None
        glb_bytes = await storage_service.download_bytes(mesh.glb_gcs_path)
        return glb_bytes if glb_bytes else None

    async def _apply_controlnet(
        self,
        pose_bytes: bytes,
        style: StyleDescriptor,
        avatar: ChildAvatar,
        pose_name: str,
        show_content_id: str,
        cache_id: str,
    ) -> Optional[AvatarPoseCache]:
        """Apply ControlNet + IP-Adapter style transfer to rendered pose."""
        from app.services.olorin.storage_service import storage_service

        style_prompt = (
            f"Redraw in style: colors {', '.join(style.palette[:5])}, "
            f"{style.line_weight} line weight, "
            f"{style.shading} shading, {style.texture} texture. "
            f"Maintain character identity. "
            f"ControlNet strength: {settings.CONTROLNET_STYLE_STRENGTH}"
        )

        timeout = settings.CONTROLNET_TIMEOUT
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{settings.CONTROLNET_API_BASE_URL}/v1/predictions",
                headers={
                    "Authorization": f"Token {settings.CONTROLNET_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "input": {
                        "prompt": style_prompt,
                        "image": pose_bytes.hex(),
                        "controlnet_conditioning_scale": (
                            settings.CONTROLNET_STYLE_STRENGTH
                        ),
                    },
                },
            )
            response.raise_for_status()
            result_data = response.json()
            output_url = result_data.get("output", [""])[0]

        if not output_url:
            return None

        result_response = await self._download_result(output_url)
        output_path = (
            f"zeh-ani/controlnet/{avatar.id}/{show_content_id}/"
            f"{pose_name}_{cache_id}.png"
        )
        await storage_service.upload_bytes(
            result_response, output_path, content_type="image/png",
        )
        return AvatarPoseCache(
            pose_name=pose_name, gcs_path=output_path,
            width=512, height=512,
        )

    async def _download_result(self, url: str) -> bytes:
        """Download ControlNet result image."""
        timeout = settings.CONTROLNET_TIMEOUT
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.content

    async def _compute_clip_score(
        self, poses: list,
    ) -> float:
        """Compute average CLIP similarity across poses via Stability AI."""
        if not poses:
            return 0.0
        from app.services.olorin.storage_service import storage_service

        scores = []
        for pose in poses:
            image_bytes = await storage_service.download_bytes(pose.gcs_path)
            score = await self._clip_score_single(image_bytes)
            scores.append(score)
        return sum(scores) / len(scores)

    async def _clip_score_single(self, image_bytes: bytes) -> float:
        """Score image quality via Stability AI image quality endpoint."""
        timeout = settings.STABILITY_API_TIMEOUT
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{settings.STABILITY_API_BASE_URL}/v1/generation/image-quality",
                headers={
                    "Authorization": f"Bearer {settings.STABILITY_API_KEY}",
                    "Accept": "application/json",
                },
                files={
                    "image": ("output.png", image_bytes, "image/png"),
                },
            )
            if response.status_code == 200:
                data = response.json()
                return float(data.get("quality_score", 0.0))
        return 0.0


controlnet_style_service = ControlNetStyleService()
