"""
Feedback Loop Service.

Processes grandparent replies to highlight reels, including voice note
transcription and in-app notification creation. Maintains a feedback
history for each child profile.
"""

from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.grandparent_bridge import GrandparentVoiceNote
from app.models.notification_event import NotificationEvent
from app.models.whatsapp_contact import WhatsAppContact

logger = get_logger(__name__)


class FeedbackLoopService:
    """Manages grandparent feedback from WhatsApp replies."""

    async def process_grandparent_reply(
        self,
        contact: WhatsAppContact,
        message_body: Optional[str],
        media_url: Optional[str],
    ) -> dict:
        """
        Process an incoming reply from a grandparent contact.

        Handles text messages, voice notes (with transcription),
        and media attachments. Creates in-app notification for the child.
        """
        transcript = message_body
        detected_language = contact.language
        audio_path: Optional[str] = None

        if media_url:
            audio_path, transcript, detected_language = (
                await self._process_voice_note(media_url, contact)
            )

        voice_note = GrandparentVoiceNote(
            user_id=contact.user_id,
            profile_id=contact.profile_id,
            news_clip_id="",
            encrypted_audio_gcs_path=audio_path,
            transcript=transcript,
            detected_language=detected_language,
            notification_sent=False,
            transcription_language=detected_language,
        )
        await voice_note.insert()

        if settings.GRANDPARENT_FEEDBACK_NOTIFICATION_ENABLED:
            await self._create_feedback_notification(
                contact, voice_note,
            )
            voice_note.notification_sent = True
            await voice_note.save()

        logger.info(
            "Grandparent reply processed",
            extra={
                "contact_id": str(contact.id),
                "user_id": contact.user_id,
                "profile_id": contact.profile_id,
                "has_audio": audio_path is not None,
                "detected_language": detected_language,
            },
        )

        return {
            "status": "processed",
            "voice_note_id": str(voice_note.id),
            "has_transcript": transcript is not None,
        }

    async def get_feedback_history(
        self,
        user_id: str,
        profile_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[GrandparentVoiceNote]:
        """Get paginated feedback history for a child profile."""
        return (
            await GrandparentVoiceNote.find(
                GrandparentVoiceNote.user_id == user_id,
                GrandparentVoiceNote.profile_id == profile_id,
            )
            .sort(-GrandparentVoiceNote.created_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

    async def _process_voice_note(
        self,
        media_url: str,
        contact: WhatsAppContact,
    ) -> tuple:
        """Download, encrypt, and transcribe a voice note."""
        from app.services.olorin.storage_service import storage_service

        audio_path = (
            f"zeh-ani/feedback/{contact.user_id}/"
            f"{contact.profile_id}/"
            f"voice_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.ogg"
        )

        transcript: Optional[str] = None
        detected_language = contact.language

        if settings.GRANDPARENT_REPLY_TRANSCRIPTION_ENABLED:
            from app.services.whisper_transcription_service import (
                whisper_transcription_service,
            )

            transcription_result = (
                await whisper_transcription_service.transcribe_from_url(
                    media_url,
                )
            )
            transcript = transcription_result.get("text")
            detected_language = transcription_result.get(
                "language", contact.language,
            )

        await storage_service.upload_from_url(
            media_url, audio_path,
        )

        return audio_path, transcript, detected_language

    async def _create_feedback_notification(
        self,
        contact: WhatsAppContact,
        voice_note: GrandparentVoiceNote,
    ) -> None:
        """Create an in-app notification for the grandparent reply."""
        notification = NotificationEvent(
            user_id=contact.user_id,
            event_type="grandparent_feedback",
            title=f"{contact.display_name} replied",
            body=voice_note.transcript or self._voice_message_fallback(
                contact.language,
            ),
            data={
                "voice_note_id": str(voice_note.id),
                "contact_name": contact.display_name,
                "relationship": contact.relationship,
                "has_audio": voice_note.encrypted_audio_gcs_path is not None,
            },
        )
        await notification.insert()

        logger.info(
            "Feedback notification created",
            extra={
                "user_id": contact.user_id,
                "notification_id": str(notification.id),
            },
        )

    def _voice_message_fallback(self, language: str) -> str:
        """Get localized fallback text for voice message notifications."""
        fallbacks = settings.VOICE_MESSAGE_FALLBACKS
        return fallbacks.get(language, fallbacks.get("en", ""))


feedback_loop_service = FeedbackLoopService()
