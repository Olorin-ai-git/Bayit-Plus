"""
Bridge Share Service.

Generates WhatsApp deep links, creates public share landing pages,
and verifies share PINs for grandparent access to news clips.
"""

from urllib.parse import quote

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.grandparent_bridge import NewsClip, NewsClipStatus

logger = get_logger(__name__)


class BridgeShareService:
    """Manages sharing and PIN verification for grandparent clips."""

    def generate_whatsapp_link(
        self,
        share_url: str,
        child_name: str,
        language: str = "he",
    ) -> str:
        """
        Generate a WhatsApp deep link with pre-filled message.

        Returns wa.me URL with encoded share link and greeting text.
        """
        messages = {
            "he": (
                f"!{child_name} \u05E9\u05DC\u05D5\u05DD \u05E1\u05D1\u05D0/\u05E1\u05D1\u05EA\u05D0"
                f" \u05E6\u05E4\u05D5 \u05D1\u05E1\u05E8\u05D8\u05D5\u05DF \u05D4\u05D7\u05D3\u05E9\u05D5\u05EA "
                f"\u05E9\u05DC {child_name}: {share_url}"
            ),
            "en": (
                f"Hi Grandma/Grandpa! Watch {child_name}'s latest "
                f"news report: {share_url}"
            ),
            "es": (
                f"Hola Abuela/Abuelo! Mira el informe de "
                f"{child_name}: {share_url}"
            ),
        }

        message = messages.get(language, messages["en"])
        encoded_message = quote(message)
        return f"https://wa.me/?text={encoded_message}"

    async def create_share_landing(
        self, share_token: str
    ) -> dict:
        """
        Create public share landing page data (no auth required).

        Returns clip information for the share token.
        """
        clip = await NewsClip.find_one(
            NewsClip.share_token == share_token,
            NewsClip.status == NewsClipStatus.READY,
        )

        if not clip:
            raise ValueError("Share link not found or clip not available")

        logger.info(
            "Share landing accessed",
            extra={
                "share_token": share_token,
                "clip_id": str(clip.id),
            },
        )

        return {
            "clip_id": str(clip.id),
            "avatar_id": clip.avatar_id,
            "script_text": clip.script_text,
            "video_gcs_path": clip.video_gcs_path,
            "thumbnail_gcs_path": clip.thumbnail_gcs_path,
            "recipient_name": clip.recipient_name,
            "share_pin_verified": clip.share_pin_verified,
        }

    async def verify_share_pin(
        self, share_token: str, pin: str
    ) -> bool:
        """
        Verify family PIN for share access.

        Validates against the family controls PIN for the clip owner.
        """
        clip = await NewsClip.find_one(
            NewsClip.share_token == share_token
        )
        if not clip:
            raise ValueError("Share link not found")

        from app.models.family_controls import FamilyControls
        from app.services.family_controls_service import (
            family_controls_service,
        )

        controls = await FamilyControls.find_one(
            FamilyControls.user_id == clip.user_id
        )
        if not controls:
            return False

        is_valid = await family_controls_service.verify_pin(clip.user_id, pin)
        if is_valid:
            clip.share_pin_verified = True
            await clip.save()
            logger.info(
                "Share PIN verified",
                extra={
                    "share_token": share_token,
                    "clip_id": str(clip.id),
                },
            )

        return is_valid


share_service = BridgeShareService()
