"""
Voice Interaction Handler

Wraps ASR + CharacterAI + CharacterAnimator pipeline for voice-driven
VOD avatar interactions. Processes child speech, generates character
responses, and returns animated results.
"""

import hashlib
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_service
from app.models.vod_interaction import (
    DialogueExchange,
    VODInteractionSession,
)
from app.services.beta.credit_service import credit_service
from app.services.vod_interaction.character_ai import character_ai_service
from app.services.vod_interaction.character_animator import (
    character_animator_service,
)
from app.services.vod_interaction.interaction_service import (
    BLOCKED_RESPONSE_PATTERNS,
    SAFE_FALLBACK_RESPONSE,
)
from app.services.zeh_ani.enhanced_asr_service import enhanced_asr_service

logger = get_logger(__name__)


class VoiceInteractionResult(BaseModel):
    """Result of processing a voice interaction turn."""

    status: str = Field(..., description="Processing status")
    transcript: str = Field(..., description="Transcribed user speech")
    character_text: str = Field(..., description="Character response text")
    character_audio_url: Optional[str] = Field(
        None, description="Character TTS audio URL"
    )
    character_video_url: Optional[str] = Field(
        None, description="Character lip-sync video URL"
    )
    emotion: Optional[str] = Field(
        None, description="Inferred character emotion"
    )


class VoiceInteractionHandler:
    """Orchestrates voice interaction pipeline: ASR -> AI -> Animation."""

    async def process_voice_input(
        self,
        session: VODInteractionSession,
        audio_data: bytes,
    ) -> VoiceInteractionResult:
        """
        Process voice input through the full interaction pipeline.

        Steps: validate -> store audio -> transcribe -> generate AI response
        -> content moderation -> animate -> charge credits -> save session.
        """
        if len(audio_data) > settings.VOD_INTERACTION_MAX_AUDIO_CHUNK_BYTES:
            raise ValueError("Audio data exceeds maximum allowed size")

        if len(session.dialogue_exchanges) >= settings.VOD_INTERACTION_VOICE_MAX_EXCHANGES:
            raise ValueError("Maximum voice exchanges reached for session")

        user_audio_url = await self._store_user_audio(session, audio_data)

        transcription = await enhanced_asr_service.transcribe_child_speech(
            audio_data
        )
        transcript_text = transcription.get("text", "")
        if not transcript_text:
            return VoiceInteractionResult(
                status="empty_transcript",
                transcript="",
                character_text="",
            )

        scene_context = session.scene_context or ""
        char_desc = session.character_description or ""
        frame_url = session.character_frame_url
        voice_id = session.character_voice_id or settings.CHARACTER_VOICE_DEFAULT

        character_response = await character_ai_service.generate_response(
            character_name=session.character_name,
            scene_context=scene_context,
            user_message=transcript_text,
            conversation_history=session.dialogue_exchanges,
            character_description=char_desc,
            movie_context=scene_context,
        )

        response_text = character_response.text
        if BLOCKED_RESPONSE_PATTERNS.search(response_text):
            logger.warning(
                "Voice interaction response blocked by content filter",
                extra={
                    "session_id": str(session.id),
                    "character_name": session.character_name,
                },
            )
            response_text = SAFE_FALLBACK_RESPONSE

        animated = await character_animator_service.animate_character_response(
            character_name=session.character_name,
            dialogue_text=response_text,
            character_frame_url=frame_url,
            voice_id=voice_id,
        )

        await credit_service.charge_credits(
            user_id=session.user_id,
            amount=settings.CREDIT_RATE_VOD_INTERACTION_MESSAGE,
            reason="vod_interaction_voice_exchange",
            metadata={"session_id": str(session.id)},
        )

        user_exchange = DialogueExchange(
            speaker="user",
            message_text=transcript_text,
            audio_url=user_audio_url,
            timestamp=datetime.utcnow(),
        )
        character_exchange = DialogueExchange(
            speaker="character",
            message_text=response_text,
            audio_url=animated.audio_url,
            animated_video_url=animated.video_url,
            timestamp=datetime.utcnow(),
        )
        session.dialogue_exchanges.append(user_exchange)
        session.dialogue_exchanges.append(character_exchange)
        session.updated_at = datetime.utcnow()
        await session.save()

        logger.info(
            "Voice interaction processed",
            extra={
                "session_id": str(session.id),
                "transcript_length": len(transcript_text),
                "exchanges_count": len(session.dialogue_exchanges),
            },
        )

        return VoiceInteractionResult(
            status="success",
            transcript=transcript_text,
            character_text=response_text,
            character_audio_url=animated.audio_url,
            character_video_url=animated.video_url,
            emotion=character_response.emotion,
        )

    async def _store_user_audio(
        self,
        session: VODInteractionSession,
        audio_data: bytes,
    ) -> str:
        """Upload user voice audio to cloud storage."""
        audio_hash = hashlib.sha256(audio_data).hexdigest()[:16]
        gcs_path = (
            f"vod-interactions/voice-audio/{session.id}/{audio_hash}.wav"
        )
        return await storage_service.upload_bytes(
            audio_data, gcs_path, content_type="audio/wav"
        )


voice_interaction_handler = VoiceInteractionHandler()
