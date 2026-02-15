"""
ElevenLabs Animator Client

Client for ElevenLabs API to generate lip-synced animated videos
from character still images and text using their video generation capabilities.
"""

import asyncio
import httpx
from typing import Optional
from app.core.config import settings
from app.core.storage import storage_service
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class ElevenLabsAnimatorClient:
    """Client for ElevenLabs video generation and lip-sync API"""

    def __init__(self):
        self.api_url = "https://api.elevenlabs.io/v1"
        self.api_key = settings.ELEVENLABS_API_KEY
        self.timeout = httpx.Timeout(120.0, connect=10.0)

    def _get_headers(self) -> dict:
        """Get authentication headers for API requests"""
        return {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }

    async def create_lipsync(
        self,
        image_url: str,
        text: str,
        voice_id: str,
        aspect_ratio: str = "1:1"
    ) -> str:
        """
        Create lip-synced video from image and text using ElevenLabs

        Args:
            image_url: Public URL of character still image
            text: Text to speak (will be converted to audio)
            voice_id: ElevenLabs voice ID for character
            aspect_ratio: Video aspect ratio (1:1, 16:9, 9:16)

        Returns:
            GCS URL of final animated video
        """
        try:
            logger.info(
                "Creating ElevenLabs animated video",
                extra={
                    "image_url": image_url,
                    "text_length": len(text),
                    "voice_id": voice_id,
                    "aspect_ratio": aspect_ratio
                }
            )

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                audio_url = await self._generate_audio(text, voice_id, client)
                video_url = await self._generate_video(
                    image_url,
                    audio_url,
                    client
                )
                gcs_url = await self._upload_to_gcs(video_url, voice_id)

                logger.info(
                    "ElevenLabs animated video completed",
                    extra={"gcs_url": gcs_url}
                )

                return gcs_url

        except httpx.HTTPStatusError as e:
            logger.error(
                "ElevenLabs API HTTP error",
                extra={
                    "status_code": e.response.status_code,
                    "response": e.response.text
                }
            )
            raise
        except Exception as e:
            logger.error("ElevenLabs API error", extra={"error": str(e)})
            raise

    async def _generate_audio(
        self,
        text: str,
        voice_id: str,
        client: httpx.AsyncClient
    ) -> str:
        """
        Generate audio using ElevenLabs TTS

        Args:
            text: Text to convert to speech
            voice_id: ElevenLabs voice ID
            client: HTTP client instance

        Returns:
            Temporary URL of audio file
        """
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }

        response = await client.post(
            f"{self.api_url}/text-to-speech/{voice_id}",
            json=payload,
            headers=self._get_headers()
        )
        response.raise_for_status()

        audio_bytes = response.content

        import hashlib
        import tempfile
        import os

        text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        with tempfile.NamedTemporaryFile(
            suffix=".mp3",
            delete=False,
            prefix=f"elevenlabs_audio_{text_hash}_"
        ) as tmp:
            tmp.write(audio_bytes)
            audio_path = tmp.name

        gcs_path = f"vod-interactions/elevenlabs-audio/{voice_id}_{text_hash}.mp3"
        audio_url = await storage_service.upload_file(
            audio_path,
            gcs_path
        )

        os.unlink(audio_path)

        logger.info(
            "ElevenLabs audio generated",
            extra={"audio_url": audio_url}
        )

        return audio_url

    async def _generate_video(
        self,
        image_url: str,
        audio_url: str,
        client: httpx.AsyncClient
    ) -> str:
        """
        Generate lip-synced video using ElevenLabs Conversational AI

        Args:
            image_url: Public URL of character image
            audio_url: Public URL of audio file
            client: HTTP client instance

        Returns:
            URL of generated video
        """
        payload = {
            "image_url": image_url,
            "audio_url": audio_url,
            "model": "eleven_video_v1"
        }

        response = await client.post(
            f"{self.api_url}/conversational-ai/video",
            json=payload,
            headers=self._get_headers()
        )
        response.raise_for_status()

        result = response.json()
        video_id = result.get("video_id")

        if not video_id:
            raise Exception("No video_id returned from ElevenLabs")

        logger.info(
            "ElevenLabs video job created",
            extra={"video_id": video_id}
        )

        video_url = await self._poll_video_completion(video_id, client)

        return video_url

    async def _poll_video_completion(
        self,
        video_id: str,
        client: httpx.AsyncClient,
        max_attempts: int = 60,
        poll_interval: int = 5
    ) -> str:
        """
        Poll ElevenLabs API for video completion

        Args:
            video_id: Video job ID
            client: HTTP client instance
            max_attempts: Maximum polling attempts
            poll_interval: Seconds between polls

        Returns:
            URL of completed video
        """
        for attempt in range(max_attempts):
            try:
                response = await client.get(
                    f"{self.api_url}/conversational-ai/video/{video_id}",
                    headers=self._get_headers()
                )
                response.raise_for_status()

                result = response.json()
                status = result.get("status")

                if status == "completed":
                    video_url = result.get("video_url")
                    logger.info(
                        "ElevenLabs video completed",
                        extra={"video_id": video_id, "video_url": video_url}
                    )
                    return video_url

                elif status == "failed":
                    error = result.get("error", "Unknown error")
                    logger.error(
                        "ElevenLabs video generation failed",
                        extra={"video_id": video_id, "error": error}
                    )
                    raise Exception(f"ElevenLabs video generation failed: {error}")

                await asyncio.sleep(poll_interval)

            except httpx.HTTPStatusError as e:
                logger.error(
                    "ElevenLabs polling error",
                    extra={
                        "video_id": video_id,
                        "attempt": attempt,
                        "error": str(e)
                    }
                )
                raise

        raise TimeoutError(
            f"ElevenLabs video {video_id} timed out after {max_attempts * poll_interval}s"
        )

    async def _upload_to_gcs(self, video_url: str, voice_id: str) -> str:
        """
        Download video from ElevenLabs and upload to GCS for persistence

        Args:
            video_url: ElevenLabs-hosted video URL
            voice_id: Voice ID for file naming

        Returns:
            GCS public URL
        """
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
                response = await client.get(video_url)
                response.raise_for_status()

                video_bytes = response.content

                import hashlib
                video_hash = hashlib.md5(video_bytes).hexdigest()[:12]

                gcs_path = f"vod-interactions/elevenlabs-videos/{voice_id}_{video_hash}.mp4"
                gcs_url = await storage_service.upload_bytes(
                    video_bytes,
                    gcs_path,
                    content_type="video/mp4"
                )

                logger.info(
                    "Uploaded ElevenLabs video to GCS",
                    extra={"gcs_url": gcs_url}
                )

                return gcs_url

        except Exception as e:
            logger.error(
                "Failed to upload ElevenLabs video to GCS",
                extra={"error": str(e)}
            )
            raise


elevenlabs_animator_client = ElevenLabsAnimatorClient()
