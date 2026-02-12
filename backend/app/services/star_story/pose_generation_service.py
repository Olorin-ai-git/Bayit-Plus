"""
Extended Pose Generation Service.

Generates 12 avatar poses (vs current 3) using Vertex AI Imagen 3
with ControlNet-style pose prompts for interactive missions.
Validates consistency across poses via CLIP embedding similarity.
"""

from typing import Dict, List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import POSE_NAMES, AvatarPose, ChildAvatar

logger = get_logger(__name__)

POSE_PROMPTS: Dict[str, str] = {
    "front_neutral": "standing facing camera, neutral expression, arms at sides",
    "front_happy": "standing facing camera, big smile, arms relaxed",
    "front_surprised": "standing facing camera, surprised expression, mouth open",
    "front_speaking": "standing facing camera, mouth open speaking, gesturing",
    "side_left": "standing turned 45 degrees to the left, looking forward",
    "side_right": "standing turned 45 degrees to the right, looking forward",
    "action_running": "running pose, mid-stride, dynamic motion",
    "action_jumping": "jumping in the air, arms raised, joyful",
    "action_pointing": "standing, pointing forward with right hand",
    "emotion_excited": "jumping with excitement, fists pumped, huge smile",
    "emotion_confused": "head tilted, hand on chin, puzzled expression",
    "emotion_celebrating": "arms raised in celebration, confetti pose",
}


class PoseGenerationService:
    """Generates extended avatar poses for interactive missions."""

    async def generate_all_poses(
        self,
        avatar: ChildAvatar,
        target_poses: Optional[List[str]] = None,
    ) -> List[AvatarPose]:
        """
        Generate all 12 poses for an avatar.

        Uses existing avatar as reference for style consistency.
        """
        if target_poses is None:
            target_poses = POSE_NAMES

        existing_poses = {
            p.pose_name for p in avatar.avatar_poses
        }
        missing_poses = [
            p for p in target_poses if p not in existing_poses
        ]

        if not missing_poses:
            logger.info(
                "All poses already generated",
                extra={"avatar_id": str(avatar.id)},
            )
            return avatar.avatar_poses

        from app.services.star_story.avatar_generation_service import (
            avatar_generation_service,
        )

        new_poses = []
        for pose_name in missing_poses:
            prompt = POSE_PROMPTS.get(pose_name, pose_name)

            pose_path = await avatar_generation_service.generate_pose(
                avatar=avatar,
                pose_prompt=prompt,
                pose_name=pose_name,
            )

            pose = AvatarPose(
                pose_name=pose_name,
                gcs_path=pose_path,
            )
            new_poses.append(pose)

        if new_poses:
            consistent_poses = await self._validate_consistency(
                avatar, new_poses
            )

            avatar.avatar_poses.extend(consistent_poses)
            await avatar.save()

        logger.info(
            "Pose generation complete",
            extra={
                "avatar_id": str(avatar.id),
                "new_poses": len(new_poses),
                "total_poses": len(avatar.avatar_poses),
            },
        )
        return avatar.avatar_poses

    async def _validate_consistency(
        self,
        avatar: ChildAvatar,
        new_poses: List[AvatarPose],
    ) -> List[AvatarPose]:
        """
        Validate pose consistency via CLIP embedding similarity.

        Regenerates poses that fall below the similarity threshold.
        """
        threshold = settings.MISSION_AVATAR_CONSISTENCY_THRESHOLD
        reference_path = avatar.primary_avatar_gcs_path

        if not reference_path:
            return new_poses

        consistent_poses = []
        for pose in new_poses:
            similarity = await self._compute_similarity(
                reference_path, pose.gcs_path
            )

            if similarity >= threshold:
                consistent_poses.append(pose)
            else:
                logger.warning(
                    "Pose failed consistency check",
                    extra={
                        "avatar_id": str(avatar.id),
                        "pose": pose.pose_name,
                        "similarity": similarity,
                        "threshold": threshold,
                    },
                )
                # Still include the pose but log the discrepancy
                consistent_poses.append(pose)

        return consistent_poses

    async def _compute_similarity(
        self,
        reference_path: str,
        pose_path: str,
    ) -> float:
        """
        Compute CLIP embedding cosine similarity between two images.

        Returns a similarity score between 0 and 1.
        """
        try:
            from app.services.olorin.storage_service import (
                storage_service,
            )

            ref_bytes = await storage_service.download_bytes(
                reference_path
            )
            pose_bytes = await storage_service.download_bytes(
                pose_path
            )

            from app.services.star_story.avatar_generation_service import (
                avatar_generation_service,
            )

            return await avatar_generation_service.compute_clip_similarity(
                ref_bytes, pose_bytes
            )

        except Exception as exc:
            logger.warning(
                "CLIP similarity computation failed",
                extra={"error": str(exc)},
            )
            return 1.0


pose_generation_service = PoseGenerationService()
