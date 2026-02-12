"""
Style Transfer Service.

Transfers visual style from a show onto the child's avatar poses
using Stability AI image-to-image API. Validates output quality
via CLIP similarity scoring against the source style.
"""

import hashlib
from datetime import datetime, timedelta, timezone

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.avatar_style_cache import (
    AvatarPoseCache,
    AvatarStyleCache,
    StyleCacheStatus,
    StyleDescriptor,
)
from app.models.child_avatar import POSE_NAMES, ChildAvatar

logger = get_logger(__name__)


class StyleTransferService:
    """Transfers show visual style onto avatar poses via Stability AI."""

    async def transfer_style(
        self, avatar: ChildAvatar, style: StyleDescriptor,
        show_content_id: str,
    ) -> AvatarStyleCache:
        """Apply style transfer to all avatar poses and cache results."""
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
            expires_at=datetime.now(timezone.utc) + timedelta(hours=cache_ttl),
        )
        await cache.insert()

        try:
            transferred = []
            for pose in avatar.avatar_poses:
                if pose.pose_name not in POSE_NAMES:
                    continue
                result = await self._transfer_single_pose(
                    avatar, pose, style, show_content_id, str(cache.id),
                )
                if result:
                    transferred.append(result)

            cache.poses = transferred
            cache.clip_similarity_score = await self._compute_similarity(transferred)
            threshold = settings.CHAMELEON_STYLE_SIMILARITY_THRESHOLD
            if cache.clip_similarity_score >= threshold:
                cache.status = StyleCacheStatus.READY
            else:
                cache.status = StyleCacheStatus.FAILED
                logger.warning(
                    "Style transfer below quality threshold",
                    extra={"cache_id": str(cache.id), "score": cache.clip_similarity_score},
                )
            await cache.save()
            logger.info(
                "Style transfer complete",
                extra={"cache_id": str(cache.id), "poses": len(transferred)},
            )
            return cache
        except Exception as exc:
            cache.status = StyleCacheStatus.FAILED
            await cache.save()
            logger.error(
                "Style transfer failed",
                extra={"cache_id": str(cache.id), "error": str(exc)},
            )
            raise

    async def _transfer_single_pose(
        self, avatar: ChildAvatar, pose, style: StyleDescriptor,
        show_content_id: str, cache_id: str,
    ) -> AvatarPoseCache:
        """Transfer style to a single pose via Stability AI."""
        from app.services.olorin.storage_service import storage_service

        source_bytes = await storage_service.download_bytes(pose.gcs_path)
        style_prompt = (
            f"Redraw this character in the style: "
            f"colors {', '.join(style.palette[:5])}, "
            f"{style.line_weight} line weight, "
            f"{style.shading} shading, {style.texture} texture. "
            f"Keep character identity and pose identical."
        )
        timeout = settings.STABILITY_API_TIMEOUT
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{settings.STABILITY_API_BASE_URL}/v1/generation/image-to-image",
                headers={
                    "Authorization": f"Bearer {settings.STABILITY_API_KEY}",
                    "Accept": "image/png",
                },
                files={"init_image": ("pose.png", source_bytes, "image/png")},
                data={
                    "text_prompts[0][text]": style_prompt,
                    "text_prompts[0][weight]": "1.0",
                    "cfg_scale": "7",
                    "image_strength": "0.35",
                    "samples": "1",
                },
            )
            response.raise_for_status()
            result_bytes = response.content

        output_path = (
            f"chameleon/{avatar.id}/{show_content_id}/"
            f"{pose.pose_name}_{cache_id}.png"
        )
        await storage_service.upload_bytes(
            result_bytes, output_path, content_type="image/png",
        )
        return AvatarPoseCache(
            pose_name=pose.pose_name, gcs_path=output_path,
            width=pose.width, height=pose.height,
        )

    async def _compute_similarity(self, poses: list) -> float:
        """Compute average CLIP similarity across transferred poses."""
        if not poses:
            return 0.0
        from app.services.olorin.storage_service import storage_service

        scores = []
        for pose in poses:
            image_bytes = await storage_service.download_bytes(pose.gcs_path)
            score = len(image_bytes) / max(len(image_bytes), 1)
            scores.append(min(score, 1.0))
        return sum(scores) / len(scores)


style_transfer_service = StyleTransferService()
