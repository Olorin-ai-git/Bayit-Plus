"""Family Snaps Service - template-based avatar compositing."""

import secrets
from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.family_snap import FamilySnap, SnapStatus, SnapTemplate
from app.services.star_story.media_processing_service import (
    media_processing_service,
)

logger = get_logger(__name__)


class FamilySnapsService:
    """Manages family snap generation and sharing."""

    async def generate_snap(
        self, user_id: str, profile_id: str, avatar_id: str,
        template: SnapTemplate, show_content_id: Optional[str] = None,
        character_names: Optional[List[str]] = None,
    ) -> FamilySnap:
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar or avatar.user_id != user_id:
            raise ValueError("Avatar not found or unauthorized")
        if not avatar.is_ready:
            raise ValueError("Avatar not ready for snap generation")
        if not avatar.has_consent:
            raise ValueError("Parental consent required for snap generation")

        snap = FamilySnap(
            user_id=user_id, profile_id=profile_id, avatar_id=avatar_id,
            template=template, show_content_id=show_content_id,
            character_names=character_names or [],
            credits_charged=settings.CREDIT_RATE_FAMILY_SNAP,
            share_token=secrets.token_urlsafe(16),
        )
        await snap.insert()

        try:
            composite_path = await self._compose_snap(snap=snap, avatar=avatar)
            snap.composite_gcs_path = composite_path
            snap.watermarked_gcs_path = await self._add_watermark(composite_path, str(snap.id))
            snap.thumbnail_gcs_path = await self._generate_thumbnail(composite_path, str(snap.id))
            snap.status = SnapStatus.READY
            await snap.save()
            logger.info("Family snap generated", extra={
                "snap_id": str(snap.id), "template": template.value,
            })
        except Exception as exc:
            snap.status = SnapStatus.FAILED
            snap.error_message = str(exc)
            await snap.save()
            logger.error("Family snap generation failed", extra={
                "snap_id": str(snap.id), "error": str(exc),
            })
            raise
        return snap

    async def get_gallery(self, user_id: str, avatar_id: str, limit: int = 50) -> List[FamilySnap]:
        return await FamilySnap.find(
            {"user_id": user_id, "avatar_id": avatar_id, "status": SnapStatus.READY}
).sort(-FamilySnap.created_at).limit(limit).to_list()

    async def generate_share_url(
        self, snap_id: str, user_id: str, pin_verified: bool = False,
    ) -> str:
        snap = await FamilySnap.get(snap_id)
        if not snap or snap.user_id != user_id:
            raise ValueError("Snap not found or unauthorized")
        if not pin_verified:
            raise ValueError("Parental PIN verification required for sharing")
        snap.shared_externally = True
        snap.share_pin_verified = True
        snap.share_url = f"{settings.SNAP_SHARE_BASE_URL}/{snap.share_token}"
        await snap.save()
        return snap.share_url

    async def _run_image_op(self, method_name: str, **kwargs) -> str:
        method = getattr(media_processing_service, method_name)
        await method(**kwargs)
        return kwargs["output_path"]

    async def _compose_snap(self, snap: FamilySnap, avatar: ChildAvatar) -> str:
        output_path = f"snaps/{snap.user_id}/{snap.id}/composite.png"
        return await self._run_image_op(
            "compose_image",
            avatar_path=avatar.primary_avatar_gcs_path,
            template=snap.template.value,
            character_names=snap.character_names,
            output_path=output_path,
        )

    async def _add_watermark(self, image_path: str, snap_id: str) -> str:
        output_path = image_path.replace(".png", "_watermarked.png")
        return await self._run_image_op(
            "add_watermark",
            image_path=image_path,
            watermark_text=settings.SNAP_WATERMARK_TEXT,
            output_path=output_path,
        )

    async def _generate_thumbnail(self, image_path: str, snap_id: str) -> str:
        output_path = image_path.replace(".png", "_thumb.png")
        return await self._run_image_op(
            "generate_thumbnail",
            image_path=image_path,
            output_path=output_path,
            width=settings.SNAP_THUMBNAIL_WIDTH,
            height=settings.SNAP_THUMBNAIL_HEIGHT,
        )


family_snaps_service = FamilySnapsService()
