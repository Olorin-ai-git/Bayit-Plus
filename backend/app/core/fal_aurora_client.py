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
        self.hard_timeout = settings.PAUSE_ASK_AURORA_TIMEOUT_SECONDS
        self.poll_interval = settings.PAUSE_ASK_POLL_INTERVAL_SECONDS
        self.timeout = httpx.Timeout(
            float(self.hard_timeout) + 30.0, connect=15.0,
        )

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Key {settings.FAL_KEY.strip()}",
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
        cancel_event: "asyncio.Event | None" = None,
    ) -> str:
        """
        Generate a lip-synced video from image + audio via Aurora.

        Args:
            cancel_event: If set, polling stops and the fal.ai job is cancelled.

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
            video_url = await self._run_sync(payload, client, cancel_event)
            return await self._upload_to_storage(video_url, image_url)

    async def _run_sync(
        self,
        payload: dict,
        client: httpx.AsyncClient,
        cancel_event: "asyncio.Event | None" = None,
    ) -> str:
        """Submit to queue endpoint and poll for result.

        The sync fal.run endpoint is unreliable (hangs indefinitely),
        so we always use the queue endpoint which returns immediately
        with a request_id for polling.
        """
        response = await client.post(
            QUEUE_ENDPOINT,
            json=payload,
            headers=self._get_headers(),
        )
        response.raise_for_status()
        data = response.json()
        request_id = data.get("request_id")
        if not request_id:
            raise RuntimeError(f"Aurora queue returned no request_id: {data}")

        cancel_url = data.get("cancel_url", "")
        logger.info(
            "Aurora job queued",
            extra={"request_id": request_id},
        )
        return await self._poll_result(
            request_id, client, cancel_event=cancel_event, cancel_url=cancel_url,
        )

    async def _poll_result(
        self,
        request_id: str,
        client: httpx.AsyncClient,
        cancel_event: "asyncio.Event | None" = None,
        cancel_url: str = "",
    ) -> str:
        """Poll fal.ai queue until job completes, fails, or times out."""
        status_url = f"{QUEUE_ENDPOINT}/requests/{request_id}/status"
        result_url = f"{QUEUE_ENDPOINT}/requests/{request_id}"
        deadline = asyncio.get_event_loop().time() + self.hard_timeout
        attempt = 0

        while asyncio.get_event_loop().time() < deadline:
            if cancel_event and cancel_event.is_set():
                await self._cancel_job(client, cancel_url, request_id)
                raise asyncio.CancelledError(
                    f"Aurora job {request_id} cancelled (client disconnected)"
                )

            try:
                resp = await client.get(status_url, headers=self._get_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    poll_status = data.get("status")
                    if poll_status == "COMPLETED":
                        res = await client.get(
                            result_url, headers=self._get_headers(),
                        )
                        res.raise_for_status()
                        return res.json()["video"]["url"]
                    if poll_status in ("FAILED", "CANCELLED"):
                        raise RuntimeError(
                            f"Aurora job {request_id} failed: "
                            f"{data.get('error', 'Unknown')}"
                        )
            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                logger.warning(
                    "Aurora poll request failed, retrying",
                    extra={
                        "request_id": request_id,
                        "attempt": attempt,
                        "error": str(exc),
                    },
                )

            if attempt % 6 == 0:
                logger.info(
                    "Aurora job polling",
                    extra={"request_id": request_id, "attempt": attempt},
                )

            interval = min(
                self.poll_interval * (1.5 ** min(attempt, 4)),
                15.0,
            )
            await asyncio.sleep(interval)
            attempt += 1

        raise TimeoutError(
            f"Aurora job {request_id} timed out after {self.hard_timeout}s"
        )

    async def _cancel_job(
        self, client: httpx.AsyncClient, cancel_url: str, request_id: str,
    ) -> None:
        """Cancel a queued fal.ai job."""
        url = cancel_url or f"{QUEUE_ENDPOINT}/requests/{request_id}/cancel"
        try:
            resp = await client.put(url, headers=self._get_headers())
            logger.info(
                "Aurora job cancelled",
                extra={"request_id": request_id, "status": resp.status_code},
            )
        except Exception as exc:
            logger.warning(
                "Aurora job cancel request failed",
                extra={"request_id": request_id, "error": str(exc)},
            )

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
