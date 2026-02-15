"""
Creatify Aurora API Client

Client for Creatify Aurora API to generate lip-synced animated videos
from character still images and audio files.
"""

import asyncio
import httpx
from typing import Optional
from app.core.config import settings
from app.core.storage import storage_service
from app.core.logging import logger


class CreatifyClient:
    """Client for Creatify Aurora lip-sync animation API"""

    def __init__(self):
        self.api_url = settings.CREATIFY_API_URL
        self.api_id = settings.CREATIFY_API_ID
        self.api_key = settings.CREATIFY_API_KEY
        self.timeout = httpx.Timeout(60.0, connect=10.0)

    def _get_headers(self) -> dict:
        """Get authentication headers for API requests"""
        return {
            "X-API-ID": self.api_id,
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }

    async def create_lipsync(
        self,
        image_url: str,
        audio_url: str,
        aspect_ratio: str = "1:1"
    ) -> str:
        """
        Create lip-synced video from image and audio

        Args:
            image_url: Public URL of character still image
            audio_url: Public URL of audio file
            aspect_ratio: Video aspect ratio (1:1, 16:9, 9:16)

        Returns:
            GCS URL of final animated video
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "image_url": image_url,
                    "audio_url": audio_url,
                    "aspect_ratio": aspect_ratio,
                    "model": "aurora_v2",
                    "green_screen": True
                }

                logger.info(
                    "Creating Creatify lip-sync animation",
                    extra={
                        "image_url": image_url,
                        "audio_url": audio_url,
                        "aspect_ratio": aspect_ratio
                    }
                )

                response = await client.post(
                    f"{self.api_url}/api/lipsyncs/",
                    json=payload,
                    headers=self._get_headers()
                )
                response.raise_for_status()

                result = response.json()
                lipsync_id = result["id"]

                logger.info(
                    "Creatify lip-sync job created",
                    extra={"lipsync_id": lipsync_id}
                )

                video_url = await self._poll_completion(lipsync_id, client)
                gcs_url = await self._upload_to_gcs(video_url, lipsync_id)

                return gcs_url

        except httpx.HTTPStatusError as e:
            logger.error(
                "Creatify API HTTP error",
                extra={
                    "status_code": e.response.status_code,
                    "response": e.response.text
                }
            )
            raise
        except Exception as e:
            logger.error("Creatify API error", extra={"error": str(e)})
            raise

    async def _poll_completion(
        self,
        lipsync_id: str,
        client: httpx.AsyncClient,
        max_attempts: int = 60,
        poll_interval: int = 5
    ) -> str:
        """
        Poll Creatify API for job completion

        Args:
            lipsync_id: Job ID to poll
            client: HTTP client instance
            max_attempts: Maximum polling attempts
            poll_interval: Seconds between polls

        Returns:
            URL of completed video
        """
        for attempt in range(max_attempts):
            try:
                response = await client.get(
                    f"{self.api_url}/api/lipsyncs/{lipsync_id}",
                    headers=self._get_headers()
                )
                response.raise_for_status()

                result = response.json()
                status = result.get("status")

                if status == "completed":
                    video_url = result.get("video_url")
                    logger.info(
                        "Creatify lip-sync completed",
                        extra={"lipsync_id": lipsync_id, "video_url": video_url}
                    )
                    return video_url

                elif status == "failed":
                    error = result.get("error", "Unknown error")
                    logger.error(
                        "Creatify lip-sync failed",
                        extra={"lipsync_id": lipsync_id, "error": error}
                    )
                    raise Exception(f"Creatify job failed: {error}")

                await asyncio.sleep(poll_interval)

            except httpx.HTTPStatusError as e:
                logger.error(
                    "Creatify polling error",
                    extra={
                        "lipsync_id": lipsync_id,
                        "attempt": attempt,
                        "error": str(e)
                    }
                )
                raise

        raise TimeoutError(f"Creatify job {lipsync_id} timed out after {max_attempts * poll_interval}s")

    async def _upload_to_gcs(self, video_url: str, lipsync_id: str) -> str:
        """
        Download video from Creatify and upload to GCS for persistence

        Args:
            video_url: Creatify-hosted video URL
            lipsync_id: Job ID for file naming

        Returns:
            GCS public URL
        """
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
                response = await client.get(video_url)
                response.raise_for_status()

                video_bytes = response.content

                gcs_path = f"vod-interactions/character-animations/{lipsync_id}.mp4"
                gcs_url = await storage_service.upload_bytes(
                    video_bytes,
                    gcs_path,
                    content_type="video/mp4"
                )

                logger.info(
                    "Uploaded Creatify video to GCS",
                    extra={"lipsync_id": lipsync_id, "gcs_url": gcs_url}
                )

                return gcs_url

        except Exception as e:
            logger.error(
                "Failed to upload Creatify video to GCS",
                extra={"lipsync_id": lipsync_id, "error": str(e)}
            )
            raise


creatify_client = CreatifyClient()
