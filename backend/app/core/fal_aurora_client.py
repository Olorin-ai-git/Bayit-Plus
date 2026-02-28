"""
fal.ai Aurora Lip-Sync Client

Generates lip-synced character videos by sending a still image
and audio file to the Creatify Aurora model hosted on fal.ai.
No persona/avatar pre-creation needed -- Aurora animates any face
from a single image.
"""

import asyncio
import hashlib

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_service

logger = get_logger(__name__)

SYNC_ENDPOINT = "https://fal.run/fal-ai/creatify/aurora"
QUEUE_ENDPOINT = "https://queue.fal.run/fal-ai/creatify/aurora"


class FalAuroraClient:
    """Generates lip-synced videos via fal.ai Creatify Aurora API."""

    def __init__(self) -> None:
        self.resolution = settings.FAL_AURORA_RESOLUTION
        self.timeout = httpx.Timeout(600.0, connect=15.0)

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Key {settings.FAL_KEY}",
            "Content-Type": "application/json",
        }

    def _build_payload(
        self, image_url: str, audio_url: str, prompt: str = "",
    ) -> dict:
        payload = {
            "image_url": image_url,
            "audio_url": audio_url,
            "resolution": self.resolution,
            "guidance_scale": 1,
            "audio_guidance_scale": 2,
        }
        if prompt:
            payload["prompt"] = prompt
        return payload

    async def create_lipsync(
        self,
        image_url: str,
        audio_url: str,
        prompt: str = "",
    ) -> str:
        """
        Generate a lip-synced video from image + audio via Aurora.

        Uses the synchronous fal.run endpoint which blocks until
        the result is ready. Falls back to queue polling if needed.

        Returns:
            Storage URL of the generated lip-sync video
        """
        logger.info(
            "Creating Aurora lip-sync",
            extra={
                "image_url": image_url,
                "audio_url": audio_url,
                "resolution": self.resolution,
            },
        )

        payload = self._build_payload(image_url, audio_url, prompt)

        async with httpx.AsyncClient(
            timeout=self.timeout, follow_redirects=True,
        ) as client:
            video_url = await self._run_sync(payload, client)
            return await self._upload_to_storage(video_url, image_url)

    async def _run_sync(
        self, payload: dict, client: httpx.AsyncClient,
    ) -> str:
        """Call synchronous fal.run endpoint. Blocks until result ready."""
        response = await client.post(
            SYNC_ENDPOINT,
            json=payload,
            headers=self._get_headers(),
        )

        if response.status_code == 200:
            result = response.json()
            video_url = result["video"]["url"]
            logger.info(
                "Aurora sync completed",
                extra={
                    "duration": result["video"].get("duration"),
                    "video_url": video_url,
                },
            )
            return video_url

        if response.status_code in (202, 409):
            request_id = response.json().get("request_id")
            logger.info(
                "Aurora queued, falling back to poll",
                extra={"request_id": request_id},
            )
            return await self._poll_result(request_id, client)

        response.raise_for_status()
        return ""

    async def _poll_result(
        self,
        request_id: str,
        client: httpx.AsyncClient,
        max_attempts: int = 120,
        poll_interval: int = 5,
    ) -> str:
        """Poll fal.ai queue until job completes."""
        status_url = f"{QUEUE_ENDPOINT}/requests/{request_id}/status"
        result_url = f"{QUEUE_ENDPOINT}/requests/{request_id}"

        for attempt in range(max_attempts):
            resp = await client.get(status_url, headers=self._get_headers())
            if resp.status_code == 200:
                data = resp.json()
                status = data.get("status")
                if status == "COMPLETED":
                    res = await client.get(
                        result_url, headers=self._get_headers(),
                    )
                    res.raise_for_status()
                    return res.json()["video"]["url"]
                if status in ("FAILED", "CANCELLED"):
                    raise RuntimeError(
                        f"Aurora job {request_id} failed: "
                        f"{data.get('error', 'Unknown')}"
                    )
            if attempt % 6 == 0:
                logger.info(
                    "Aurora job polling",
                    extra={"request_id": request_id, "attempt": attempt},
                )
            await asyncio.sleep(poll_interval)

        raise TimeoutError(f"Aurora job {request_id} timed out")

    async def _upload_to_storage(
        self, video_url: str, image_url: str,
    ) -> str:
        """Download Aurora output and upload to persistent storage."""
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            response = await client.get(video_url)
            response.raise_for_status()

        # Hash the fal.ai video URL (unique per render) for a unique GCS path
        url_hash = hashlib.md5(video_url.encode()).hexdigest()[:12]
        gcs_path = f"vod-interactions/aurora-lipsync/{url_hash}.mp4"
        storage_url = await storage_service.upload_bytes(
            response.content, gcs_path, content_type="video/mp4",
        )

        logger.info(
            "Aurora video uploaded to storage",
            extra={"storage_url": storage_url},
        )
        return storage_url


fal_aurora_client = FalAuroraClient()
