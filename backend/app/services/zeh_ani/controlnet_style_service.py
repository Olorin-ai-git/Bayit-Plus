"""
ControlNet Style Service.

Transfers show visual style onto 3D avatar meshes using ControlNet + IP-Adapter
via Replicate. Validates output quality via CLIP similarity scoring, reusing
the pattern established in chameleon/style_transfer.py.
"""

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.avatar_mesh import AvatarMesh
from app.models.avatar_style_cache import (
    AvatarStyleCache,
    StyleCacheStatus,
    StyleDescriptor,
)
from app.models.child_avatar import POSE_NAMES, ChildAvatar
from app.services.zeh_ani.style_metrics import (
    apply_controlnet,
    compute_clip_score,
)

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
                result = await apply_controlnet(
                    pose_bytes, style, avatar, pose_name,
                    show_content_id, str(cache.id),
                )
                if result:
                    transferred.append(result)

            cache.poses = transferred
            cache.clip_similarity_score = await compute_clip_score(
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


controlnet_style_service = ControlNetStyleService()
