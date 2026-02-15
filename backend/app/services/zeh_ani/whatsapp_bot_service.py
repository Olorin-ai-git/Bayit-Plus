"""WhatsApp Bot Service for highlight reel sharing via Twilio WhatsApp API."""

import hashlib
import hmac
from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.highlight_reel import HighlightReel
from app.models.whatsapp_contact import WhatsAppContact

logger = get_logger(__name__)


class WhatsAppBotService:
    """Sends highlight reels to grandparent contacts via WhatsApp."""

    async def send_highlight_to_contacts(
        self,
        reel: HighlightReel,
        contacts: List[WhatsAppContact],
    ) -> List[str]:
        """Send a highlight reel video to approved WhatsApp contacts."""
        if not reel.is_ready:
            logger.warning(
                "Attempted to send unready reel",
                extra={"reel_id": str(reel.id), "status": reel.status},
            )
            return []

        from app.services.olorin.storage_service import storage_service

        video_url = await storage_service.generate_signed_url(
            reel.video_gcs_path,
            expiry_seconds=settings.WHATSAPP_SHARE_URL_EXPIRY_SECONDS,
        )

        sent_ids: List[str] = []
        for contact in contacts:
            success = await self._send_whatsapp_message(
                contact, video_url, reel.share_token,
            )
            if success:
                sent_ids.append(str(contact.id))
                contact.last_sent_at = datetime.now(timezone.utc)
                contact.total_reels_sent += 1
                await contact.save()

        reel.auto_sent_to.extend(sent_ids)
        reel.updated_at = datetime.now(timezone.utc)
        await reel.save()

        logger.info(
            "Highlight reel sent to contacts",
            extra={
                "reel_id": str(reel.id),
                "total_contacts": len(contacts),
                "sent_count": len(sent_ids),
            },
        )

        return sent_ids

    async def _send_whatsapp_message(
        self,
        contact: WhatsAppContact,
        video_url: str,
        share_token: str,
    ) -> bool:
        """Send a single WhatsApp message via Twilio API."""
        from app.services.twilio_service import twilio_service

        try:
            await twilio_service.send_whatsapp_template(
                from_number=settings.TWILIO_WHATSAPP_NUMBER,
                to_phone_hash=contact.phone_hash,
                template_sid=settings.TWILIO_WHATSAPP_TEMPLATE_SID,
                content_sid=settings.TWILIO_WHATSAPP_CONTENT_SID,
                media_url=video_url,
                variables={
                    "child_name": contact.display_name,
                    "share_token": share_token,
                },
                language=contact.language,
            )
            return True
        except Exception as exc:
            logger.error(
                "WhatsApp send failed",
                extra={
                    "contact_id": str(contact.id),
                    "error": str(exc),
                },
            )
            return False

    async def handle_incoming_reply(
        self,
        from_number_hash: str,
        message_body: Optional[str],
        media_url: Optional[str],
    ) -> dict:
        """Process an incoming WhatsApp reply from a grandparent."""
        contact = await WhatsAppContact.find_one(
            {"phone_hash": from_number_hash}
)
        if not contact:
            logger.warning(
                "Reply from unknown contact",
                extra={"phone_hash": from_number_hash},
            )
            return {"status": "unknown_contact"}

        from app.services.zeh_ani.feedback_loop_service import (
            feedback_loop_service,
        )

        result = await feedback_loop_service.process_grandparent_reply(
            contact=contact,
            message_body=message_body,
            media_url=media_url,
        )

        return result

    async def add_contact(
        self,
        user_id: str,
        profile_id: str,
        phone_number: str,
        display_name: str,
        relationship: str,
        language: str,
        approved_by_user_id: str,
    ) -> WhatsAppContact:
        """Add and approve a new grandparent WhatsApp contact."""
        phone_hash = self.hash_phone_number(phone_number)

        existing = await WhatsAppContact.find_one(
            {"user_id": user_id, "profile_id": profile_id, "phone_hash": phone_hash}
)
        if existing:
            return existing

        contact = WhatsAppContact(
            user_id=user_id,
            profile_id=profile_id,
            phone_hash=phone_hash,
            display_name=display_name,
            relationship=relationship,
            language=language,
            approved_by_user_id=approved_by_user_id,
        )
        await contact.insert()

        logger.info(
            "WhatsApp contact added",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "relationship": relationship,
            },
        )

        return contact

    async def list_contacts(self, user_id: str, profile_id: str) -> List[WhatsAppContact]:
        """List all approved contacts for a child profile."""
        return await WhatsAppContact.find(
            {"user_id": user_id, "profile_id": profile_id}
).to_list()

    async def remove_contact(self, contact_id: str, user_id: str) -> bool:
        """Remove a contact (soft-delete by deletion)."""
        contact = await WhatsAppContact.get(contact_id)
        if not contact or contact.user_id != user_id:
            return False
        await contact.delete()
        logger.info(
            "WhatsApp contact removed",
            extra={"contact_id": contact_id, "user_id": user_id},
        )
        return True

    @staticmethod
    def hash_phone_number(phone_number: str) -> str:
        """Hash a phone number using HMAC-SHA256 with salt for rainbow table resistance."""
        return hmac.new(
            settings.PHONE_HASH_SALT.encode("utf-8"),
            phone_number.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()


whatsapp_bot_service = WhatsAppBotService()
