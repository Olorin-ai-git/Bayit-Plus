"""
Creatify Aurora Direct Lip-Sync Client

Generates lip-synced character videos via Creatify's Aurora endpoint.
Same model as fal.ai Aurora but on independent infrastructure.
Takes image URL + audio URL directly — no persona/avatar needed.
"""

import asyncio
import hashlib

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_service

logger = get_logger(__name__)

AURORA_API_BASE = "https://api.creatify.ai/api/aurora"


class CreatifyAuroraClient:
    """Generates lip-synced videos via Creatify Aurora direct API."""

    def __init__(self) -> None:
        self.hard_timeout = settings.PAUSE_ASK_AURORA_TIMEOUT_SECONDS
        self.poll_interval = settings.PAUSE_ASK_POLL_INTERVAL_SECONDS
        self.timeout = httpx.Timeout(
            float(self.hard_timeout) + 30.0, connect=15.0,
        )

    def _get_headers(self) -> dict:
        return {
            "X-API-ID": settings.CREATIFY_API_ID,
            "X-API-KEY": settings.CREATIFY_API_KEY,
            "Content-Type": "application/json",
        }

    async def create_lipsync(
        self,
        image_url: str,
        audio_url: str,
        prompt: str = "",
        cancel_event: "asyncio.Event | None" = None,
    ) -> str:
        """Generate a lip-synced video from image + audio.

        Returns:
            Storage URL of the generated lip-sync video.
        """
        logger.info(
            "Creating Creatify Aurora lip-sync",
            extra={"image_url": image_url, "audio_url": audio_url},
        )

        payload = {
            "image": image_url,
            "audio": audio_url,
            "model_version": "aurora_v1_fast",
        }

        async with httpx.AsyncClient(
            timeout=self.timeout, follow_redirects=True,
        ) as client:
            response = await client.post(
                f"{AURORA_API_BASE}/",
                json=payload,
                headers=self._get_headers(),
            )
            response.raise_for_status()
            job_id = response.json().get("id")
            if not job_id:
                raise RuntimeError(
                    f"Creatify Aurora returned no job id: {response.json()}"
                )

            logger.info(
                "Creatify Aurora job submitted",
                extra={"job_id": job_id},
            )

            video_url = await self._poll_result(
                job_id, client, cancel_event,
            )
            return await self._upload_to_storage(video_url, image_url)

    async def _poll_result(
        self,
        job_id: str,
        client: httpx.AsyncClient,
        cancel_event: "asyncio.Event | None" = None,
    ) -> str:
        """Poll until job completes, fails, or times out."""
        poll_url = f"{AURORA_API_BASE}/{job_id}/"
        deadline = asyncio.get_running_loop().time() + self.hard_timeout
        attempt = 0

        while asyncio.get_running_loop().time() < deadline:
            if cancel_event and cancel_event.is_set():
                raise asyncio.CancelledError(
                    f"Creatify Aurora job {job_id} cancelled"
                )

            try:
                resp = await client.get(poll_url, headers=self._get_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    status = data.get("status")
                    if status == "done":
                        video_output = data.get("video_output")
                        if not video_output:
                            raise RuntimeError(
                                f"Creatify Aurora job {job_id} done but no video_output"
                            )
                        return video_output
                    if status == "failed":
                        raise RuntimeError(
                            f"Creatify Aurora job {job_id} failed: "
                            f"{data.get('failed_reason', 'Unknown')}"
                        )
            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                logger.warning(
                    "Creatify Aurora poll failed, retrying",
                    extra={
                        "job_id": job_id,
                        "attempt": attempt,
                        "error": str(exc),
                    },
                )

            if attempt % 6 == 0:
                logger.info(
                    "Creatify Aurora job polling",
                    extra={"job_id": job_id, "attempt": attempt},
                )

            interval = min(
                self.poll_interval * (1.5 ** min(attempt, 4)),
                15.0,
            )
            await asyncio.sleep(interval)
            attempt += 1

        raise TimeoutError(
            f"Creatify Aurora job {job_id} timed out after {self.hard_timeout}s"
        )

    async def _upload_to_storage(
        self, video_url: str, image_url: str,
    ) -> str:
        """Download output and upload to persistent storage."""
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            response = await client.get(video_url)
            response.raise_for_status()

        url_hash = hashlib.md5(video_url.encode()).hexdigest()[:12]
        gcs_path = f"vod-interactions/aurora-lipsync/{url_hash}.mp4"
        storage_url = await storage_service.upload_bytes(
            response.content, gcs_path, content_type="video/mp4",
        )

        logger.info(
            "Creatify Aurora video uploaded to storage",
            extra={"storage_url": storage_url},
        )
        return storage_url


creatify_aurora_client = CreatifyAuroraClient()
