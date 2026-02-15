"""
Custom Voice Training Service (P3-1)

Integration with ElevenLabs Voice Lab API for partner-scoped
custom voice training, voice cloning, and TTS synthesis.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx
from beanie import Document
from pydantic import Field

from app.core.config import settings

logger = logging.getLogger(__name__)


class CustomVoiceMetadata(Document):
    """MongoDB document for partner-scoped custom voices."""

    partner_id: str = Field(..., description="Owner partner ID")
    voice_id: str = Field(..., description="ElevenLabs voice ID")
    voice_name: str = Field(..., description="Display name")
    description: Optional[str] = None
    language: str = Field(
        default="multilingual", description="Primary language"
    )
    status: str = Field(
        default="training",
        description="Status: training, ready, failed, archived",
    )
    training_sample_count: int = Field(
        default=0, description="Number of training samples uploaded"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ready_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    metadata: Dict = Field(default_factory=dict)

    class Settings:
        name = "dubbing_custom_voices"
        indexes = [
            {
                "fields": ["partner_id", "voice_id"],
                "unique": True,
                "partialFilterExpression": {"voice_id": {"$ne": ""}},
            },
            ["partner_id", "status"],
            "status",
            "created_at",
        ]


class VoiceTrainingService:
    """Manages voice cloning, TTS synthesis, and partner voice library."""

    def __init__(self):
        self._api_key = settings.ELEVENLABS_API_KEY
        self._api_url = settings.ELEVENLABS_API_URL

    async def clone_voice(
        self, audio_data: bytes, voice_name: str,
    ) -> str:
        """Clone a voice via ElevenLabs. Returns the new voice_id."""
        async with httpx.AsyncClient(
            timeout=settings.ELEVENLABS_V2V_TIMEOUT,
        ) as client:
            response = await client.post(
                f"{self._api_url}/v1/voices/add",
                headers={"xi-api-key": self._api_key},
                files={"files": (f"{voice_name}.mp3", audio_data, "audio/mpeg")},
                data={"name": voice_name},
            )
            response.raise_for_status()
            voice_id = response.json().get("voice_id", "")
            if not voice_id:
                raise ValueError("ElevenLabs returned empty voice_id")
            logger.info(
                "Voice cloned",
                extra={"voice_name": voice_name, "voice_id": voice_id},
            )
            return voice_id

    async def synthesize_speech(
        self, text: str, voice_id: str, language: str = "en",
    ) -> bytes:
        """Generate TTS audio using an ElevenLabs voice."""
        async with httpx.AsyncClient(
            timeout=settings.ELEVENLABS_V2V_TIMEOUT,
        ) as client:
            response = await client.post(
                f"{self._api_url}/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": self._api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": settings.ELEVENLABS_MODEL,
                    "voice_settings": {
                        "stability": settings.ELEVENLABS_STABILITY,
                        "similarity_boost": settings.ELEVENLABS_SIMILARITY_BOOST,
                    },
                },
            )
            response.raise_for_status()
            logger.info(
                "TTS synthesized",
                extra={"voice_id": voice_id, "language": language},
            )
            return response.content

    async def create_voice(
        self, partner_id: str, voice_name: str,
        description: Optional[str] = None, language: str = "multilingual",
    ) -> CustomVoiceMetadata:
        """Create a voice placeholder in MongoDB."""
        voice_doc = CustomVoiceMetadata(
            partner_id=partner_id, voice_id="",
            voice_name=voice_name, description=description,
            language=language, status="pending_samples",
        )
        await voice_doc.insert()
        logger.info("Created voice placeholder for partner %s", partner_id)
        return voice_doc

    async def upload_training_sample(
        self, partner_id: str, voice_doc_id: str,
        audio_data: bytes, sample_name: str,
    ) -> bool:
        """Upload audio sample and clone voice for a partner."""
        voice = await CustomVoiceMetadata.get(voice_doc_id)
        if not voice or voice.partner_id != partner_id:
            logger.warning("Voice not found or access denied: %s", voice_doc_id)
            return False

        try:
            voice_id = await self.clone_voice(audio_data, voice.voice_name)
            voice.voice_id = voice_id
            voice.training_sample_count += 1
            voice.status = "ready"
            voice.ready_at = datetime.now(timezone.utc)
            await voice.save()
            return True
        except Exception as e:
            logger.error("Voice training upload error: %s", e)
            voice.status = "failed"
            await voice.save()
            return False

    async def list_voices(self, partner_id: str) -> List[CustomVoiceMetadata]:
        """List all custom voices for a partner."""
        return await CustomVoiceMetadata.find(
            {"partner_id": partner_id}, 
            CustomVoiceMetadata.status != "archived", 
        ).to_list()

    async def get_voice(
        self, partner_id: str, voice_id: str,
    ) -> Optional[CustomVoiceMetadata]:
        """Get a specific custom voice by ElevenLabs voice ID."""
        return await CustomVoiceMetadata.find_one(
            {"partner_id": partner_id, "voice_id": voice_id}
)

    async def archive_voice(self, partner_id: str, voice_id: str) -> bool:
        """Archive a custom voice (soft delete)."""
        voice = await self.get_voice(partner_id, voice_id)
        if not voice:
            return False
        voice.status = "archived"
        voice.archived_at = datetime.now(timezone.utc)
        await voice.save()
        logger.info("Archived voice %s for partner %s", voice_id, partner_id)
        return True


voice_training_service = VoiceTrainingService()
