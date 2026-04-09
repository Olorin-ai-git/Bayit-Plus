"""
Character Animator Service

Animates movie characters using multiple providers:
- Aurora (fal.ai): Direct image+audio lip-sync via Creatify Aurora model
- Creatify: Persona-based TTS + lip-sync animation
- ElevenLabs: Delegates to Creatify (no native video API)

Provider selection is configurable via CHARACTER_ANIMATION_PROVIDER setting.
"""

import asyncio
import hashlib
import os
import subprocess
import tempfile
from pathlib import Path

import httpx

from app.core.config import settings
from app.core.creatify_client import creatify_client
from app.core.fal_aurora_client import fal_aurora_client
from app.core.wavespeed_client import wavespeed_client
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
        cancel_event: "asyncio.Event | None" = None,
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
                cancel_event=cancel_event,
            )
        if self.provider == "wavespeed":
            return await self._animate_with_wavespeed(
                character_name, dialogue_text, character_frame_url, voice_id,
                cancel_event=cancel_event,
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
        cancel_event: "asyncio.Event | None" = None,
    ) -> AnimatedResponse:
        """Lip-sync via fal.ai Aurora using character's actual face image."""
        audio_url = await self._generate_tts(dialogue_text, voice_id, character_name)
        duration = await self._get_audio_duration(audio_url)

        public_audio = await self._ensure_public_url(audio_url)
        public_image = await self._ensure_public_url(character_frame_url)

        video_url = await fal_aurora_client.create_lipsync(
            image_url=public_image,
            audio_url=public_audio,
            cancel_event=cancel_event,
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

    async def _animate_with_wavespeed(
        self,
        character_name: str,
        dialogue_text: str,
        character_frame_url: str,
        voice_id: str,
        cancel_event: "asyncio.Event | None" = None,
    ) -> AnimatedResponse:
        """Lip-sync via WaveSpeedAI daVinci-MagiHuman."""
        audio_url = await self._generate_tts(dialogue_text, voice_id, character_name)
        duration = await self._get_audio_duration(audio_url)

        public_audio = await self._ensure_public_url(audio_url)
        public_image = await self._ensure_public_url(character_frame_url)

        video_url = await wavespeed_client.create_lipsync(
            image_url=public_image,
            audio_url=public_audio,
            cancel_event=cancel_event,
        )

        logger.info(
            "WaveSpeed character animation completed",
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
        """Ensure a URL is publicly accessible for external APIs.

        Local files are uploaded to GCS. HTTP URLs are returned as-is.
        """
        if url.startswith("http"):
            return url

        local_path = Path(settings.UPLOAD_DIR) / url.removeprefix("/uploads/")
        if not local_path.exists():
            raise FileNotFoundError(f"Local file not found: {local_path}")

        content_type = (
            "image/png" if local_path.suffix == ".png"
            else "image/jpeg" if local_path.suffix in (".jpg", ".jpeg")
            else "audio/mpeg" if local_path.suffix == ".mp3"
            else "video/mp4" if local_path.suffix == ".mp4"
            else "application/octet-stream"
        )
        gcs_path = (
            f"vod-interactions/public-assets/"
            f"{hashlib.md5(str(local_path).encode()).hexdigest()[:12]}"
            f"{local_path.suffix}"
        )
        public_url = await storage_service.upload_bytes(
            local_path.read_bytes(), gcs_path, content_type=content_type,
        )
        logger.info(
            "Local file uploaded to GCS for external API access",
            extra={"local": url, "gcs": public_url},
        )
        return public_url

    async def _generate_tts(
        self, text: str, voice_id: str, character_name: str,
    ) -> str:
        """Generate speech audio using ElevenLabs TTS with retry. Returns storage URL."""
        max_retries = settings.PAUSE_ASK_TTS_RETRIES
        timeout = httpx.Timeout(float(settings.PAUSE_ASK_TTS_TIMEOUT_SECONDS))
        last_exc = None

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(
                        f"{self.elevenlabs_api_url}/v1/text-to-speech/{voice_id}",
                        json={
                            "text": text,
                            "model_id": "eleven_multilingual_v2",
                            "voice_settings": {
                                "stability": 0.5,
                                "similarity_boost": 0.75,
                            },
                        },
                        headers={
                            "xi-api-key": self.elevenlabs_api_key,
                            "Content-Type": "application/json",
                        },
                    )
                    response.raise_for_status()

                    text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
                    safe_name = character_name.replace(" ", "_").lower()
                    gcs_path = (
                        f"vod-interactions/character-audio/"
                        f"{safe_name}_{text_hash}.mp3"
                    )
                    audio_url = await storage_service.upload_bytes(
                        response.content, gcs_path, content_type="audio/mpeg",
                    )
                    logger.info(
                        "TTS audio generated",
                        extra={
                            "character_name": character_name,
                            "audio_url": audio_url,
                            "attempt": attempt,
                        },
                    )
                    return audio_url
            except (httpx.TimeoutException, httpx.HTTPStatusError) as exc:
                last_exc = exc
                if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code < 500:
                    raise
                if attempt < max_retries:
                    backoff = 2.0 ** attempt
                    logger.warning(
                        "ElevenLabs TTS failed, retrying",
                        extra={
                            "character_name": character_name,
                            "attempt": attempt,
                            "backoff": backoff,
                            "error": str(exc),
                        },
                    )
                    await asyncio.sleep(backoff)

        raise last_exc

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
