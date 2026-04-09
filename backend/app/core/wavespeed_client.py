"""
WaveSpeedAI daVinci-MagiHuman Lip-Sync Client

Generates lip-synced character videos by sending a still image
and audio file to the daVinci-MagiHuman model hosted on WaveSpeedAI.
Drop-in alternative to fal.ai Aurora with independent infrastructure.
"""

import asyncio
import hashlib

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_service

logger = get_logger(__name__)

API_BASE = "https://api.wavespeed.ai/api/v3"
MODEL_PATH = "wavespeed-ai/davinci-magihuman/image-to-video"


class WaveSpeedClient:
    """Generates lip-synced videos via WaveSpeedAI daVinci-MagiHuman."""

    def __init__(self) -> None:
        self.resolution = settings.WAVESPEED_RESOLUTION
        self.hard_timeout = settings.PAUSE_ASK_AURORA_TIMEOUT_SECONDS
        self.poll_interval = settings.PAUSE_ASK_POLL_INTERVAL_SECONDS
        self.timeout = httpx.Timeout(
            float(self.hard_timeout) + 30.0, connect=15.0,
        )

    @property
    def fal_key(self) -> str:
        """Kept for interface compat — not used by WaveSpeed."""
        return ""

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {settings.WAVESPEED_API_KEY.strip()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _build_payload(
        self, image_url: str, audio_url: str, prompt: str = "",
    ) -> dict:
        return {
            "image": image_url,
            "audio": audio_url,
            "prompt": prompt or "person speaking naturally, subtle head movement",
            "resolution": self.resolution,
            "duration": 5,
            "seed": -1,
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
            "Creating WaveSpeed lip-sync",
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
            video_url = await self._submit_and_poll(
                payload, client, cancel_event,
            )
            return await self._upload_to_storage(video_url, image_url)

    async def _submit_and_poll(
        self,
        payload: dict,
        client: httpx.AsyncClient,
        cancel_event: "asyncio.Event | None" = None,
    ) -> str:
        """Submit job and poll until complete."""
        response = await client.post(
            f"{API_BASE}/{MODEL_PATH}",
            json=payload,
            headers=self._get_headers(),
        )
        response.raise_for_status()
        data = response.json().get("data", {})
        task_id = data.get("id")
        if not task_id:
            raise RuntimeError(
                f"WaveSpeed returned no task id: {response.json()}"
            )

        logger.info(
            "WaveSpeed job submitted",
            extra={"task_id": task_id},
        )
        return await self._poll_result(task_id, client, cancel_event)

    async def _poll_result(
        self,
        task_id: str,
        client: httpx.AsyncClient,
        cancel_event: "asyncio.Event | None" = None,
    ) -> str:
        """Poll WaveSpeed until job completes, fails, or times out."""
        poll_url = f"{API_BASE}/predictions/{task_id}/result"
        deadline = asyncio.get_running_loop().time() + self.hard_timeout
        attempt = 0

        while asyncio.get_running_loop().time() < deadline:
            if cancel_event and cancel_event.is_set():
                raise asyncio.CancelledError(
                    f"WaveSpeed job {task_id} cancelled (client disconnected)"
                )

            try:
                resp = await client.get(poll_url, headers=self._get_headers())
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    status = data.get("status")
                    if status == "completed":
                        outputs = data.get("outputs", [])
                        if not outputs:
                            raise RuntimeError(
                                f"WaveSpeed job {task_id} completed with no outputs"
                            )
                        return outputs[0]
                    if status == "failed":
                        raise RuntimeError(
                            f"WaveSpeed job {task_id} failed: "
                            f"{data.get('error', 'Unknown')}"
                        )
            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                logger.warning(
                    "WaveSpeed poll failed, retrying",
                    extra={
                        "task_id": task_id,
                        "attempt": attempt,
                        "error": str(exc),
                    },
                )

            if attempt % 6 == 0:
                logger.info(
                    "WaveSpeed job polling",
                    extra={"task_id": task_id, "attempt": attempt},
                )

            interval = min(
                self.poll_interval * (1.5 ** min(attempt, 4)),
                15.0,
            )
            await asyncio.sleep(interval)
            attempt += 1

        raise TimeoutError(
            f"WaveSpeed job {task_id} timed out after {self.hard_timeout}s"
        )

    async def _upload_to_storage(
        self, video_url: str, image_url: str,
    ) -> str:
        """Download WaveSpeed output and upload to persistent storage."""
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            response = await client.get(video_url)
            response.raise_for_status()

        url_hash = hashlib.md5(video_url.encode()).hexdigest()[:12]
        gcs_path = f"vod-interactions/wavespeed-lipsync/{url_hash}.mp4"
        storage_url = await storage_service.upload_bytes(
            response.content, gcs_path, content_type="video/mp4",
        )

        logger.info(
            "WaveSpeed video uploaded to storage",
            extra={"storage_url": storage_url},
        )
        return storage_url


wavespeed_client = WaveSpeedClient()
