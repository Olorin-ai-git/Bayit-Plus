"""
Character Animator Service

Animates movie characters using ElevenLabs TTS + Creatify Aurora lip-sync.
Generates audio from text, then creates animated video with lip-synced character.
"""

import httpx
from typing import Optional
from app.core.creatify_client import creatify_client
from app.core.config import settings
from app.core.storage import storage_service
from app.core.logging import logger
from app.models.vod_interaction import AnimatedResponse


class CharacterAnimatorService:
    """Animates characters with voice and lip-sync"""

    def __init__(self):
        self.elevenlabs_api_key = settings.ELEVENLABS_API_KEY
        self.elevenlabs_api_url = "https://api.elevenlabs.io/v1"

    async def animate_character_response(
        self,
        character_name: str,
        dialogue_text: str,
        character_frame_url: str,
        voice_id: str
    ) -> AnimatedResponse:
        """
        Generate animated character response with voice and lip-sync

        Args:
            character_name: Name of character
            dialogue_text: Text to speak
            character_frame_url: GCS URL of character still image
            voice_id: ElevenLabs voice ID for character

        Returns:
            AnimatedResponse with audio URL, video URL, and duration
        """
        try:
            logger.info(
                "Starting character animation",
                extra={
                    "character_name": character_name,
                    "text_length": len(dialogue_text)
                }
            )

            audio_url = await self._generate_tts(dialogue_text, voice_id, character_name)
            duration = await self._get_audio_duration(audio_url)

            animated_video_url = await creatify_client.create_lipsync(
                image_url=character_frame_url,
                audio_url=audio_url,
                aspect_ratio="1:1"
            )

            logger.info(
                "Character animation completed",
                extra={
                    "character_name": character_name,
                    "duration": duration,
                    "audio_url": audio_url,
                    "video_url": animated_video_url
                }
            )

            return AnimatedResponse(
                audio_url=audio_url,
                video_url=animated_video_url,
                duration=duration
            )

        except Exception as e:
            logger.error(
                "Failed to animate character",
                extra={
                    "character_name": character_name,
                    "error": str(e)
                }
            )
            raise

    async def _generate_tts(
        self,
        text: str,
        voice_id: str,
        character_name: str
    ) -> str:
        """
        Generate speech audio using ElevenLabs TTS

        Args:
            text: Text to convert to speech
            voice_id: ElevenLabs voice ID
            character_name: Character name for file naming

        Returns:
            GCS URL of audio file
        """
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
                headers = {
                    "xi-api-key": self.elevenlabs_api_key,
                    "Content-Type": "application/json"
                }

                payload = {
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75
                    }
                }

                response = await client.post(
                    f"{self.elevenlabs_api_url}/text-to-speech/{voice_id}",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()

                audio_bytes = response.content

                import hashlib
                text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
                gcs_path = f"vod-interactions/character-audio/{character_name}_{text_hash}.mp3"

                audio_url = await storage_service.upload_bytes(
                    audio_bytes,
                    gcs_path,
                    content_type="audio/mpeg"
                )

                logger.info(
                    "TTS audio generated",
                    extra={
                        "character_name": character_name,
                        "audio_url": audio_url
                    }
                )

                return audio_url

        except Exception as e:
            logger.error(
                "Failed to generate TTS",
                extra={
                    "character_name": character_name,
                    "voice_id": voice_id,
                    "error": str(e)
                }
            )
            raise

    async def _get_audio_duration(self, audio_url: str) -> float:
        """
        Get duration of audio file in seconds

        Args:
            audio_url: URL of audio file

        Returns:
            Duration in seconds
        """
        try:
            import tempfile
            import subprocess

            async with httpx.AsyncClient() as client:
                response = await client.get(audio_url)
                response.raise_for_status()

                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                    tmp.write(response.content)
                    tmp_path = tmp.name

                result = subprocess.run(
                    [
                        "ffprobe",
                        "-v", "error",
                        "-show_entries", "format=duration",
                        "-of", "default=noprint_wrappers=1:nokey=1",
                        tmp_path
                    ],
                    capture_output=True,
                    text=True
                )

                duration = float(result.stdout.strip())

                import os
                os.unlink(tmp_path)

                return duration

        except Exception as e:
            logger.warning(
                "Failed to get audio duration, using estimate",
                extra={"error": str(e)}
            )
            return 3.0


character_animator_service = CharacterAnimatorService()
