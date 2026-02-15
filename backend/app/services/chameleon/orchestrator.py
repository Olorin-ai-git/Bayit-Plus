"""
Chameleon Orchestrator.

Coordinates style analysis and transfer for preparing avatars
that visually match the art style of a specific show.
"""

from datetime import datetime, timezone
from typing import Optional

from app.core.logging_config import get_logger
from app.models.avatar_style_cache import (
    AvatarStyleCache,
    StyleCacheStatus,
)
from app.models.child_avatar import ChildAvatar
from app.services.chameleon.style_analyzer import style_analyzer_service
from app.services.chameleon.style_transfer import style_transfer_service

logger = get_logger(__name__)


class ChameleonOrchestrator:
    """Coordinates style analysis and transfer pipeline."""

    async def prepare_avatar_for_show(
        self,
        avatar_id: str,
        show_content_id: str,
    ) -> AvatarStyleCache:
        """
        Prepare a style-matched avatar for a specific show.

        Pipeline:
        1. Check for existing cached style
        2. Analyze show visual style
        3. Transfer style onto all avatar poses
        4. Return cached result
        """
        cached = await self.get_cached_style(
            avatar_id, show_content_id
        )
        if cached:
            logger.info(
                "Using cached style-matched avatar",
                extra={
                    "avatar_id": avatar_id,
                    "show_content_id": show_content_id,
                    "cache_id": str(cached.id),
                },
            )
            return cached

        avatar = await ChildAvatar.get(avatar_id)
        if not avatar:
            raise ValueError(f"Avatar not found: {avatar_id}")

        if not avatar.is_ready:
            raise ValueError("Avatar is not ready for style transfer")

        style = await style_analyzer_service.analyze_show_style(
            show_content_id
        )

        cache = await style_transfer_service.transfer_style(
            avatar=avatar,
            style=style,
            show_content_id=show_content_id,
        )

        logger.info(
            "Avatar prepared for show",
            extra={
                "avatar_id": avatar_id,
                "show_content_id": show_content_id,
                "cache_id": str(cache.id),
                "status": cache.status.value,
            },
        )

        return cache

    async def get_cached_style(
        self,
        avatar_id: str,
        show_content_id: str,
    ) -> Optional[AvatarStyleCache]:
        """
        Retrieve a cached style-matched avatar if available.

        Updates last_used_at timestamp on cache hit.
        """
        cache = await AvatarStyleCache.find_one(
            {

                "avatar_id": avatar_id,

                "show_content_id": show_content_id,

                "status": StyleCacheStatus.READY

            }
)

        if cache:
            now = datetime.now(timezone.utc)
            if cache.expires_at and cache.expires_at < now:
                logger.info(
                    "Cached style expired",
                    extra={"cache_id": str(cache.id)},
                )
                return None

            cache.last_used_at = now
            await cache.save()

        return cache


chameleon_orchestrator = ChameleonOrchestrator()
