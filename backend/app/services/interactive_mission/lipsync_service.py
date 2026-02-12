"""
D-ID Lip-Sync Service.

Uses D-ID Talking Head API for lip-synced avatar clips.
Applied to close-up dialogue scenes (3-4 per mission, not all scenes).
Cost: ~$0.50/clip, budget ~$2/mission for lip-sync scenes.
"""

from typing import Optional

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.interactive_mission import InteractiveMission

logger = get_logger(__name__)


class LipsyncService:
    """D-ID API integration for lip-synced avatar talking clips."""

    async def generate_lipsync_clips(
        self,
        mission: InteractiveMission,
        avatar: ChildAvatar,
    ) -> None:
        """
        Generate lip-sync clips for all dialogue scenes.

        Only processes scenes flagged as is_lipsync_scene=True.
        Falls back gracefully if D-ID fails (avatar appears static).
        """
        lipsync_scenes = [
            s for s in mission.scenes if s.is_lipsync_scene
        ]

        if not lipsync_scenes:
            logger.info(
                "No lipsync scenes in mission",
                extra={"mission_id": str(mission.id)},
            )
            return

        face_image_path = avatar.primary_avatar_gcs_path
        if not face_image_path:
            logger.warning(
                "No avatar face image for lipsync",
                extra={"avatar_id": str(avatar.id)},
            )
            return

        for scene in lipsync_scenes:
            try:
                video_path = await self._generate_talking_head(
                    face_image_path=face_image_path,
                    audio_path=scene.audio_gcs_path,
                    mission_id=str(mission.id),
                    scene_number=scene.scene_number,
                )
                scene.lipsync_video_gcs_path = video_path

            except Exception as exc:
                logger.warning(
                    "Lipsync failed for scene, skipping",
                    extra={
                        "mission_id": str(mission.id),
                        "scene": scene.scene_number,
                        "error": str(exc),
                    },
                )

        await mission.save()

        generated_count = sum(
            1 for s in lipsync_scenes
            if s.lipsync_video_gcs_path
        )
        logger.info(
            "Lipsync generation complete",
            extra={
                "mission_id": str(mission.id),
                "requested": len(lipsync_scenes),
                "generated": generated_count,
            },
        )

    async def _generate_talking_head(
        self,
        face_image_path: str,
        audio_path: Optional[str],
        mission_id: str,
        scene_number: int,
    ) -> Optional[str]:
        """
        Call D-ID Talking Head API.

        Input: avatar face image + Hebrew audio
        Output: video with lip-synced avatar
        """
        api_key = settings.DID_API_KEY
        if not api_key:
            raise ValueError("DID_API_KEY not configured")

        base_url = settings.DID_API_BASE_URL

        from app.services.olorin.storage_service import storage_service

        face_url = await storage_service.get_signed_url(
            face_image_path
        )

        talk_payload = {
            "source_url": face_url,
            "script": {
                "type": "audio",
                "audio_url": await storage_service.get_signed_url(
                    audio_path
                ),
            },
            "config": {
                "stitch": True,
                "result_format": "mp4",
            },
        }

        timeout = settings.DID_API_TIMEOUT
        async with httpx.AsyncClient(timeout=timeout) as client:
            create_response = await client.post(
                f"{base_url}/talks",
                headers={
                    "Authorization": f"Basic {api_key}",
                    "Content-Type": "application/json",
                },
                json=talk_payload,
            )
            create_response.raise_for_status()
            talk_id = create_response.json()["id"]

            result_url = await self._poll_talk_result(
                client, base_url, api_key, talk_id
            )

            if not result_url:
                raise ValueError(
                    f"D-ID talk {talk_id} did not complete"
                )

            video_bytes = (
                await client.get(result_url)
            ).content

        output_path = (
            f"missions/{mission_id}/lipsync/"
            f"scene_{scene_number}_lipsync.mp4"
        )
        await storage_service.upload_bytes(
            video_bytes, output_path, content_type="video/mp4"
        )

        return output_path

    async def _poll_talk_result(
        self,
        client: httpx.AsyncClient,
        base_url: str,
        api_key: str,
        talk_id: str,
    ) -> Optional[str]:
        """Poll D-ID API until talk video is ready."""
        import asyncio

        max_polls = settings.DID_MAX_POLLS
        poll_interval = settings.DID_POLL_INTERVAL

        for _ in range(max_polls):
            response = await client.get(
                f"{base_url}/talks/{talk_id}",
                headers={"Authorization": f"Basic {api_key}"},
            )
            response.raise_for_status()
            data = response.json()

            if data.get("status") == "done":
                return data.get("result_url")
            if data.get("status") == "error":
                raise ValueError(
                    f"D-ID talk error: {data.get('error', {})}"
                )

            await asyncio.sleep(poll_interval)

        return None


lipsync_service = LipsyncService()
