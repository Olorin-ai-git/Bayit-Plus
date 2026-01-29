"""
Custom Voice Training Service (P3-1)

Integration with ElevenLabs Voice Lab API for partner-scoped
custom voice training and management.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from beanie import Document
from pydantic import BaseModel, Field

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
    # Database Architect: archived_at timestamp for soft-delete tracking
    archived_at: Optional[datetime] = None
    metadata: Dict = Field(default_factory=dict)

    class Settings:
        name = "dubbing_custom_voices"
        # Database Architect #16: Required indexes for query performance
        indexes = [
            # Unique compound: one voice per partner+elevenlabs ID
            {
                "fields": ["partner_id", "voice_id"],
                "unique": True,
                "partialFilterExpression": {"voice_id": {"$ne": ""}},
            },
            # Compound: partner listing by status (used by list_voices)
            ["partner_id", "status"],
            # Single field for status-based queries
            "status",
            # Single field for created_at sorting
            "created_at",
        ]


class VoiceTrainingService:
    """
    Manages custom voice training for B2B partners.

    Integrates with ElevenLabs Voice Lab API:
    - Upload audio samples for voice cloning
    - Monitor training progress
    - List partner-scoped voice library
    """

    def __init__(self):
        self._api_key = settings.ELEVENLABS_API_KEY

    async def create_voice(
        self,
        partner_id: str,
        voice_name: str,
        description: Optional[str] = None,
        language: str = "multilingual",
    ) -> CustomVoiceMetadata:
        """
        Initiate custom voice creation.

        Creates a voice placeholder in MongoDB. Partner uploads
        audio samples separately, then triggers training.
        """
        voice_doc = CustomVoiceMetadata(
            partner_id=partner_id,
            voice_id="",  # Set after ElevenLabs API call
            voice_name=voice_name,
            description=description,
            language=language,
            status="pending_samples",
        )
        await voice_doc.insert()

        logger.info(
            f"Created voice placeholder for partner {partner_id}: "
            f"{voice_name}"
        )
        return voice_doc

    async def upload_training_sample(
        self,
        partner_id: str,
        voice_doc_id: str,
        audio_data: bytes,
        sample_name: str,
    ) -> bool:
        """
        Upload an audio sample for voice training.

        Args:
            partner_id: Partner who owns the voice
            voice_doc_id: MongoDB document ID
            audio_data: Raw audio bytes (WAV/MP3)
            sample_name: Label for the sample

        Returns:
            True if sample accepted
        """
        voice = await CustomVoiceMetadata.get(voice_doc_id)
        if not voice or voice.partner_id != partner_id:
            logger.warning(
                f"Voice not found or access denied: {voice_doc_id}"
            )
            return False

        # Store sample via ElevenLabs API
        try:
            import httpx

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://api.elevenlabs.io/v1/voices/add",
                    headers={"xi-api-key": self._api_key},
                    files={
                        "files": (sample_name, audio_data, "audio/mpeg"),
                    },
                    data={
                        "name": voice.voice_name,
                        "description": voice.description or "",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    voice.voice_id = data.get("voice_id", "")
                    voice.training_sample_count += 1
                    voice.status = "ready"
                    voice.ready_at = datetime.now(timezone.utc)
                    await voice.save()
                    logger.info(
                        f"Voice training complete: {voice.voice_name} "
                        f"({voice.voice_id})"
                    )
                    return True
                else:
                    logger.error(
                        f"ElevenLabs voice upload failed: "
                        f"{response.status_code} - {response.text}"
                    )
                    voice.status = "failed"
                    await voice.save()
                    return False
        except Exception as e:
            logger.error(f"Voice training upload error: {e}")
            voice.status = "failed"
            await voice.save()
            return False

    async def list_voices(
        self, partner_id: str
    ) -> List[CustomVoiceMetadata]:
        """List all custom voices for a partner."""
        return await CustomVoiceMetadata.find(
            CustomVoiceMetadata.partner_id == partner_id,
            CustomVoiceMetadata.status != "archived",
        ).to_list()

    async def get_voice(
        self, partner_id: str, voice_id: str
    ) -> Optional[CustomVoiceMetadata]:
        """Get a specific custom voice by ElevenLabs voice ID."""
        return await CustomVoiceMetadata.find_one(
            CustomVoiceMetadata.partner_id == partner_id,
            CustomVoiceMetadata.voice_id == voice_id,
        )

    async def archive_voice(
        self, partner_id: str, voice_id: str
    ) -> bool:
        """Archive a custom voice (soft delete with timestamp)."""
        voice = await self.get_voice(partner_id, voice_id)
        if not voice:
            return False

        voice.status = "archived"
        voice.archived_at = datetime.now(timezone.utc)
        await voice.save()

        logger.info(
            f"Archived voice {voice_id} for partner {partner_id}"
        )
        return True
