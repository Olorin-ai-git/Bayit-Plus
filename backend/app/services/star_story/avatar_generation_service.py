"""
Avatar Generation Service.

Generates cartoon avatars from child photos using Google Vertex AI Imagen 3.
Only the non-reversible cartoon avatar is stored; original photo is deleted after.
"""

import io
import logging
from datetime import datetime, timezone
from uuid import uuid4

from PIL import Image

from app.core.ai_clients import get_provider_http_client
from app.core.config import settings
from app.core.storage import StorageService
from app.models.child_avatar import AvatarPose, AvatarStatus, AvatarStyle, ChildAvatar
from app.models.story_generation_job import (
    StoryGenerationJob,
    StoryJobStage,
)
from app.services.star_story.photo_upload_handler import photo_upload_handler

logger = logging.getLogger(__name__)

STYLE_PROMPTS = {
    AvatarStyle.CARTOON_2D: (
        "Transform this child's photo into a friendly 2D cartoon character. "
        "Bright colors, simple lines, child-friendly art style. "
        "Keep the general appearance but make it clearly a cartoon drawing."
    ),
    AvatarStyle.PIXAR_3D: (
        "Transform this child's photo into a Pixar-style 3D animated character. "
        "Smooth rendering, expressive eyes, warm lighting, child-friendly. "
        "Keep the general appearance but make it clearly a 3D animated character."
    ),
}

POSE_NAMES = ["front", "side_left", "action"]


class AvatarGenerationService:
    """Generates cartoon avatars from child photos."""

    def __init__(self):
        self._storage = StorageService()

    async def generate_avatar(
        self,
        avatar_id: str,
        style: AvatarStyle,
    ) -> ChildAvatar:
        """
        Generate cartoon avatar from uploaded photo.

        Creates multiple pose variants for use in video generation.
        """
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar:
            raise ValueError(f"Avatar not found: {avatar_id}")

        if not avatar.encrypted_photo_gcs_path:
            raise ValueError("No photo uploaded for avatar")

        avatar.style = style
        avatar.status = AvatarStatus.GENERATING
        avatar.updated_at = datetime.now(timezone.utc)
        await avatar.save()

        job = StoryGenerationJob(
            episode_id=str(avatar.id),
            user_id=avatar.user_id,
            stage=StoryJobStage.AVATAR_GENERATION,
            total_items=len(POSE_NAMES),
        )
        await job.insert()
        await job.start_processing()

        try:
            prompt = STYLE_PROMPTS[style]
            poses = []

            for i, pose_name in enumerate(POSE_NAMES):
                pose_prompt = f"{prompt} Pose: {pose_name} view."
                image_bytes = await self._generate_image(pose_prompt)

                gcs_path = (
                    f"star-story/avatars/{avatar.user_id}/"
                    f"{avatar_id}/{pose_name}_{uuid4()}.png"
                )
                await self._upload_avatar_image(image_bytes, gcs_path)

                img = Image.open(io.BytesIO(image_bytes))
                poses.append(AvatarPose(
                    pose_name=pose_name,
                    gcs_path=gcs_path,
                    width=img.width,
                    height=img.height,
                ))
                await job.update_progress(i + 1)

            avatar.avatar_poses = poses
            avatar.primary_avatar_gcs_path = poses[0].gcs_path if poses else None
            avatar.status = AvatarStatus.READY
            avatar.updated_at = datetime.now(timezone.utc)
            await avatar.save()

            await photo_upload_handler.delete_photo(avatar)
            await job.complete()

            logger.info(
                "Avatar generated",
                extra={
                    "avatar_id": avatar_id,
                    "style": style.value,
                    "poses": len(poses),
                },
            )
            return avatar

        except Exception as exc:
            avatar.status = AvatarStatus.FAILED
            avatar.error_message = str(exc)
            avatar.updated_at = datetime.now(timezone.utc)
            await avatar.save()
            await job.fail(str(exc))
            raise

    async def _generate_image(self, prompt: str) -> bytes:
        """Call Vertex AI Imagen API to generate avatar image."""
        import base64

        import google.auth
        import google.auth.transport.requests

        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        auth_request = google.auth.transport.requests.Request()
        credentials.refresh(auth_request)

        region = settings.GCP_REGION
        project = settings.GCP_PROJECT_ID
        url = (
            f"https://{region}-aiplatform.googleapis.com/v1/"
            f"projects/{project}/locations/{region}/"
            f"publishers/google/models/imagen-3.0-generate-002:predict"
        )

        client = get_provider_http_client()
        response = await client.post(
            url,
            json={
                "instances": [{"prompt": prompt}],
                "parameters": {
                    "sampleCount": 1,
                    "aspectRatio": "1:1",
                    "safetyFilterLevel": "block_most",
                    "personGeneration": "dont_allow",
                },
            },
            headers={"Authorization": f"Bearer {credentials.token}"},
        )
        response.raise_for_status()

        predictions = response.json().get("predictions", [])
        if not predictions:
            raise ValueError("No image generated from Imagen API")

        return base64.b64decode(predictions[0]["bytesBase64Encoded"])

    async def _upload_avatar_image(
        self, image_bytes: bytes, gcs_path: str
    ) -> str:
        """Upload avatar image to GCS."""
        return await self._storage.upload_file_bytes(
            image_bytes, gcs_path, "image/png"
        )


avatar_generation_service = AvatarGenerationService()
