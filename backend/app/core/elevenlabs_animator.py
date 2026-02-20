"""
ElevenLabs Animator Client

Generates character preview videos by combining ElevenLabs TTS audio
with a character still image via ffmpeg. Produces an MP4 of the
character's face with their cloned voice speaking.
"""

import asyncio
import hashlib
import os
import tempfile
from pathlib import Path

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_service

logger = get_logger(__name__)


class ElevenLabsAnimatorClient:
    """Generates character preview videos using ElevenLabs TTS + ffmpeg"""

    def __init__(self):
        self.api_url = "https://api.elevenlabs.io/v1"
        self.api_key = settings.ELEVENLABS_API_KEY
        self.timeout = httpx.Timeout(120.0, connect=10.0)

    def _get_headers(self) -> dict:
        return {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
        }

    async def create_lipsync(
        self,
        image_url: str,
        text: str,
        voice_id: str,
        aspect_ratio: str = "1:1",
    ) -> str:
        """
        Create preview video from character image + TTS audio.

        Uses ElevenLabs for TTS then ffmpeg to composite the still
        image with audio into an MP4 preview clip.

        Returns:
            Storage URL of the generated preview video
        """
        audio_path = None
        image_path = None
        video_path = None
        try:
            logger.info(
                "Creating ElevenLabs animated video",
                extra={
                    "image_url": image_url,
                    "text_length": len(text),
                    "voice_id": voice_id,
                },
            )
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                audio_path = await self._generate_audio(text, voice_id, client)
                image_path = await self._resolve_to_local(image_url, client)
                video_path = await self._compose_video(image_path, audio_path)
                storage_url = await self._upload_video(video_path, voice_id, text)

            logger.info(
                "ElevenLabs animated video completed",
                extra={"storage_url": storage_url},
            )
            return storage_url

        except httpx.HTTPStatusError as exc:
            logger.error(
                "ElevenLabs API HTTP error",
                extra={
                    "status_code": exc.response.status_code,
                    "response": exc.response.text,
                },
            )
            raise
        except Exception as exc:
            logger.error("ElevenLabs animation error", extra={"error": str(exc)})
            raise
        finally:
            for path in (audio_path, video_path):
                if path and os.path.exists(path):
                    os.unlink(path)
            if image_path and image_path.startswith(tempfile.gettempdir()):
                if os.path.exists(image_path):
                    os.unlink(image_path)

    async def _generate_audio(
        self, text: str, voice_id: str, client: httpx.AsyncClient,
    ) -> str:
        """Generate TTS audio via ElevenLabs. Returns local temp file path."""
        response = await client.post(
            f"{self.api_url}/text-to-speech/{voice_id}",
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            },
            headers=self._get_headers(),
        )
        response.raise_for_status()

        text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        with tempfile.NamedTemporaryFile(
            suffix=".mp3", delete=False, prefix=f"el_audio_{text_hash}_",
        ) as tmp:
            tmp.write(response.content)
            audio_path = tmp.name

        gcs_path = f"vod-interactions/elevenlabs-audio/{voice_id}_{text_hash}.mp3"
        audio_url = await storage_service.upload_file(audio_path, gcs_path)
        logger.info("ElevenLabs audio generated", extra={"audio_url": audio_url})
        return audio_path

    async def _resolve_to_local(
        self, url: str, client: httpx.AsyncClient,
    ) -> str:
        """Resolve a storage URL or local path to a local file path."""
        if url.startswith("/uploads/"):
            local = Path(settings.UPLOAD_DIR) / url.removeprefix("/uploads/")
            if local.exists():
                return str(local)
            raise FileNotFoundError(f"Local file not found: {local}")

        if url.startswith("http"):
            response = await client.get(url)
            response.raise_for_status()
            suffix = Path(url).suffix or ".bin"
            with tempfile.NamedTemporaryFile(
                suffix=suffix, delete=False, prefix="el_resolve_",
            ) as tmp:
                tmp.write(response.content)
                return tmp.name

        raise ValueError(f"Cannot resolve URL to local path: {url}")

    async def _compose_video(
        self, image_path: str, audio_path: str,
    ) -> str:
        """Compose still image + audio into MP4 via ffmpeg."""
        with tempfile.NamedTemporaryFile(
            suffix=".mp4", delete=False, prefix="el_video_",
        ) as tmp:
            video_path = tmp.name

        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y",
            "-loop", "1", "-i", image_path,
            "-i", audio_path,
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest", "-pix_fmt", "yuv420p",
            video_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg compositing failed: {stderr.decode()[-500:]}")

        logger.info(
            "Preview video composed",
            extra={"video_path": video_path},
        )
        return video_path

    async def _upload_video(
        self, video_path: str, voice_id: str, text: str,
    ) -> str:
        """Upload composed video to storage."""
        video_bytes = Path(video_path).read_bytes()
        text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        storage_path = (
            f"vod-interactions/elevenlabs-videos/{voice_id}_{text_hash}.mp4"
        )
        url = await storage_service.upload_bytes(
            video_bytes, storage_path, content_type="video/mp4",
        )
        logger.info("Uploaded preview video", extra={"storage_url": url})
        return url


elevenlabs_animator_client = ElevenLabsAnimatorClient()
