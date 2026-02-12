"""
Scene Composition Service.

Dual-mode composition: FFmpeg overlay (fast) and Stability AI in-painting
(premium). Both run simultaneously when mode="both" for A/B testing.
"""

from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.interactive_mission import InteractiveMission, MissionScene
from app.services.interactive_mission.inpainting_service import (
    inpainting_service,
)
from app.services.star_story.media_processing_service import (
    media_processing_service,
)

logger = get_logger(__name__)


class SceneCompositionService:
    """Composes avatar into show scene backgrounds."""

    async def compose_scenes(
        self,
        mission: InteractiveMission,
        avatar: ChildAvatar,
    ) -> None:
        """
        Compose avatar into each scene's background.

        Runs overlay and/or inpainting based on config mode.
        """
        mode = settings.MISSION_COMPOSITION_MODE
        avatar_pose_map = {
            p.pose_name: p.gcs_path for p in avatar.avatar_poses
        }

        for scene in mission.scenes:
            pose_path = avatar_pose_map.get(
                scene.avatar_pose,
                avatar.primary_avatar_gcs_path,
            )

            if mode in ("overlay", "both"):
                overlay_path = await self._compose_overlay(
                    scene=scene,
                    avatar_pose_path=pose_path,
                    mission_id=str(mission.id),
                )
                scene.overlay_video_gcs_path = overlay_path

            if mode in ("inpainting", "both"):
                inpainted_path = await self._compose_inpainting(
                    scene=scene,
                    avatar_pose_path=pose_path,
                    mission_id=str(mission.id),
                )
                scene.inpainted_video_gcs_path = inpainted_path

        await mission.save()

        logger.info(
            "Scene composition complete",
            extra={
                "mission_id": str(mission.id),
                "mode": mode,
                "scene_count": len(mission.scenes),
            },
        )

    async def _compose_overlay(
        self,
        scene: MissionScene,
        avatar_pose_path: Optional[str],
        mission_id: str,
    ) -> Optional[str]:
        """
        FFmpeg overlay composition (~0.5s/scene).

        Overlays avatar PNG onto scene background with alpha blending.
        """
        if not avatar_pose_path or not scene.background_gcs_path:
            return None

        output_path = (
            f"missions/{mission_id}/scenes/"
            f"scene_{scene.scene_number}_overlay.mp4"
        )

        await media_processing_service.overlay_image_on_video(
            background_path=scene.background_gcs_path,
            overlay_image_path=avatar_pose_path,
            output_path=output_path,
            x_position=scene.avatar_position_x,
            y_position=scene.avatar_position_y,
            scale=scene.avatar_scale,
        )

        return output_path

    async def _compose_inpainting(
        self,
        scene: MissionScene,
        avatar_pose_path: Optional[str],
        mission_id: str,
    ) -> Optional[str]:
        """
        Stability AI in-painting (~3s/scene).

        Seamlessly blends avatar INTO the scene background.
        Falls back to overlay on API failure.
        """
        if not avatar_pose_path or not scene.background_gcs_path:
            return None

        try:
            output_path = (
                f"missions/{mission_id}/scenes/"
                f"scene_{scene.scene_number}_inpainted.mp4"
            )

            await inpainting_service.inpaint_avatar(
                background_path=scene.background_gcs_path,
                avatar_path=avatar_pose_path,
                output_path=output_path,
                position_x=scene.avatar_position_x,
                position_y=scene.avatar_position_y,
                scale=scene.avatar_scale,
            )

            return output_path

        except Exception as exc:
            logger.warning(
                "Inpainting failed, falling back to overlay",
                extra={
                    "mission_id": mission_id,
                    "scene": scene.scene_number,
                    "error": str(exc),
                },
            )
            return await self._compose_overlay(
                scene, avatar_pose_path, mission_id
            )


scene_composition_service = SceneCompositionService()
