"""
Creatify Avatar Service.

Creates Creatify personas from child avatar images for lip-sync video
generation. Replaces the former RPM 3D mesh pipeline with Creatify's
2D persona system.
"""

from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.creatify_client import creatify_client
from app.models.child_avatar import ChildAvatar

logger = get_logger(__name__)


class CreatifyAvatarService:
    """Creates and manages Creatify personas for child avatars."""

    async def create_persona_from_avatar(
        self,
        avatar: ChildAvatar,
        user_id: str,
    ) -> ChildAvatar:
        """
        Create a Creatify persona from the avatar's primary 2D image.

        Pipeline:
        1. Get the existing primary_avatar_gcs_path (2D cartoon)
        2. Generate a signed URL for Creatify to access it
        3. Call Creatify create_persona API
        4. Store persona ID and image URL on the ChildAvatar
        5. Deduct credits
        """
        if not avatar.primary_avatar_gcs_path:
            raise ValueError("Avatar has no primary image for persona creation")

        avatar.creatify_avatar_status = "creating"
        avatar.updated_at = datetime.now(timezone.utc)
        await avatar.save()

        try:
            from app.services.olorin.storage_service import storage_service

            signed_url = await storage_service.generate_signed_url(
                avatar.primary_avatar_gcs_path,
                expiry_seconds=settings.CREATIFY_SIGNED_URL_EXPIRY_SECONDS,
            )

            persona = await creatify_client.create_persona(
                name=avatar.child_first_name,
                image_url=signed_url,
            )

            persona_id = persona.get("id", "")
            persona_image = persona.get("image_url", signed_url)

            avatar.creatify_persona_id = persona_id
            avatar.creatify_avatar_image_url = persona_image
            avatar.creatify_avatar_status = "ready"
            avatar.updated_at = datetime.now(timezone.utc)
            await avatar.save()

            from app.services.zeh_ani import deduct_zeh_ani_credits

            await deduct_zeh_ani_credits(
                user_id=user_id,
                feature="creatify_avatar",
                usage_amount=1.0,
                metadata={
                    "avatar_id": str(avatar.id),
                    "persona_id": persona_id,
                },
            )

            logger.info(
                "Creatify persona created for avatar",
                extra={
                    "avatar_id": str(avatar.id),
                    "persona_id": persona_id,
                },
            )

            return avatar

        except Exception as exc:
            avatar.creatify_avatar_status = "failed"
            avatar.error_message = str(exc)[:500]
            avatar.updated_at = datetime.now(timezone.utc)
            await avatar.save()

            logger.error(
                "Creatify persona creation failed",
                extra={
                    "avatar_id": str(avatar.id),
                    "error": str(exc),
                },
            )
            raise


creatify_avatar_service = CreatifyAvatarService()
