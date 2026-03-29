"""
Character Animator Service

Animates movie characters using multiple providers:
- Aurora (fal.ai): Direct image+audio lip-sync via Creatify Aurora model
- Creatify: Persona-based TTS + lip-sync animation
- ElevenLabs: Delegates to Creatify (no native video API)

Provider selection is configurable via CHARACTER_ANIMATION_PROVIDER setting.
"""

import hashlib
import os
import subprocess
import tempfile
from pathlib import Path

import httpx

from app.core.config import settings
from app.core.creatify_client import creatify_client
from app.core.fal_aurora_client import fal_aurora_client
from app.core.logging_config import get_logger
from app.core.storage import storage_service
from app.models.vod_interaction import AnimatedResponse

logger = get_logger(__name__)


class CharacterAnimatorService:
    """Animates characters with voice and lip-sync using multiple providers."""

    def __init__(self) -> None:
        self.provider = settings.CHARACTER_ANIMATION_PROVIDER
        self.elevenlabs_api_key = settings.ELEVENLABS_API_KEY
        self.elevenlabs_api_url = (
            settings.ELEVENLABS_API_URL or "https://api.elevenlabs.io"
        ).rstrip("/")

    async def generate_audio_only(
        self,
        character_name: str,
        dialogue_text: str,
        voice_id: str,
    ) -> AnimatedResponse:
        """Generate character TTS audio without lip-sync animation."""
        logger.info(
            "Starting character audio-only generation",
            extra={
                "character_name": character_name,
                "text_length": len(dialogue_text),
            },
        )
        audio_url = await self._generate_tts(dialogue_text, voice_id, character_name)
        duration = await self._get_audio_duration(audio_url)

        logger.info(
            "Character audio-only generation completed",
            extra={
                "character_name": character_name,
                "duration": duration,
                "audio_url": audio_url,
            },
        )
        return AnimatedResponse(
            audio_url=audio_url, video_url="", duration=duration,
        )

    async def animate_character_response(
        self,
        character_name: str,
        dialogue_text: str,
        character_frame_url: str,
        voice_id: str,
    ) -> AnimatedResponse:
        """Generate animated character response with voice and lip-sync."""
        logger.info(
            "Starting character animation",
            extra={
                "character_name": character_name,
                "text_length": len(dialogue_text),
                "provider": self.provider,
            },
        )

        if self.provider == "aurora":
            return await self._animate_with_aurora(
                character_name, dialogue_text, character_frame_url, voice_id,
            )
        if self.provider in ("creatify", "elevenlabs"):
            return await self._animate_with_creatify(
                character_name, dialogue_text, character_frame_url, voice_id,
            )
        raise ValueError(f"Unknown animation provider: {self.provider}")

    async def _animate_with_aurora(
        self,
        character_name: str,
        dialogue_text: str,
        character_frame_url: str,
        voice_id: str,
    ) -> AnimatedResponse:
        """Lip-sync via fal.ai Aurora using character's actual face image."""
        audio_url = await self._generate_tts(dialogue_text, voice_id, character_name)
        duration = await self._get_audio_duration(audio_url)

        public_audio = await self._ensure_public_url(audio_url)
        public_image = await self._ensure_public_url(character_frame_url)

        video_url = await fal_aurora_client.create_lipsync(
            image_url=public_image,
            audio_url=public_audio,
        )

        logger.info(
            "Aurora character animation completed",
            extra={
                "character_name": character_name,
                "duration": duration,
                "video_url": video_url,
            },
        )
        return AnimatedResponse(
            audio_url=audio_url, video_url=video_url, duration=duration,
        )

    async def _animate_with_creatify(
        self,
        character_name: str,
        dialogue_text: str,
        character_frame_url: str,
        voice_id: str,
    ) -> AnimatedResponse:
        """Lip-sync via Creatify using stock persona + TTS audio."""
        audio_url = await self._generate_tts(dialogue_text, voice_id, character_name)
        duration = await self._get_audio_duration(audio_url)

        public_audio = await self._ensure_public_url(audio_url)
        creator_id = self._get_creatify_persona(character_name)
        video_url = await creatify_client.create_lipsync(
            audio_url=public_audio,
            creator_id=creator_id,
            aspect_ratio="1x1",
        )

        logger.info(
            "Creatify character animation completed",
            extra={
                "character_name": character_name,
                "duration": duration,
                "video_url": video_url,
            },
        )
        return AnimatedResponse(
            audio_url=audio_url, video_url=video_url, duration=duration,
        )

    def _get_creatify_persona(self, character_name: str) -> str:
        """Get Creatify stock persona UUID for a character."""
        female_characters = {
            "Jennifer Parker", "Lorraine Baines", "Miriam", "Esther",
        }
        if character_name in female_characters:
            return settings.CREATIFY_PERSONA_FEMALE
        return settings.CREATIFY_PERSONA_MALE

    async def _ensure_public_url(self, url: str) -> str:
        """Ensure a storage URL is publicly accessible for external APIs."""
        if url.startswith("http"):
            return url

        local_path = Path(settings.UPLOAD_DIR) / url.removeprefix("/uploads/")
        if not local_path.exists():
            raise FileNotFoundError(f"Local file not found: {local_path}")

        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
            files = {"file": (local_path.name, local_path.read_bytes())}
            resp = await client.post(settings.TEMP_FILE_HOST_URL, files=files)
            resp.raise_for_status()
            page_url = resp.json()["data"]["url"]
            parts = page_url.split("tmpfiles.org/", 1)
            public_url = f"https://tmpfiles.org/dl/{parts[1]}"
            logger.info(
                "Uploaded local file to temp host",
                extra={"local": url, "public": public_url},
            )
            return public_url

    async def _generate_tts(
        self, text: str, voice_id: str, character_name: str,
    ) -> str:
        """Generate speech audio using ElevenLabs TTS. Returns storage URL."""
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
            response = await client.post(
                f"{self.elevenlabs_api_url}/v1/text-to-speech/{voice_id}",
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
                headers={
                    "xi-api-key": self.elevenlabs_api_key,
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()

            text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
            safe_name = character_name.replace(" ", "_").lower()
            gcs_path = f"vod-interactions/character-audio/{safe_name}_{text_hash}.mp3"

            audio_url = await storage_service.upload_bytes(
                response.content, gcs_path, content_type="audio/mpeg",
            )
            logger.info(
                "TTS audio generated",
                extra={"character_name": character_name, "audio_url": audio_url},
            )
            return audio_url

    async def _get_audio_duration(self, audio_url: str) -> float:
        """Get duration of audio file in seconds via ffprobe."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(audio_url)
                response.raise_for_status()

            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name

            result = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", tmp_path],
                capture_output=True, text=True,
            )
            duration = float(result.stdout.strip())
            os.unlink(tmp_path)
            return duration
        except Exception as e:
            logger.warning(
                "Failed to get audio duration, using estimate",
                extra={"error": str(e)},
            )
            return 3.0


character_animator_service = CharacterAnimatorService()
