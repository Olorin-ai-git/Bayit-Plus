"""Video Selfie Handler."""

from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.services.star_story.video_selfie_validation import (
    validate_face,
    validate_video_duration,
)

logger = get_logger(__name__)


class VideoSelfieHandler:
    """Handles video selfie upload and processing."""

    async def process_video_selfie(
        self, avatar_id: str, user_id: str,
        video_bytes: bytes, content_type: str = "video/mp4",
    ) -> ChildAvatar:
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar or avatar.user_id != user_id:
            raise ValueError("Avatar not found or unauthorized")
        if not avatar.consent or not avatar.consent.video_selfie_consent:
            raise ValueError("Video selfie consent not granted")

        self._validate_video_format(video_bytes, content_type)
        await validate_video_duration(video_bytes)

        from app.services.olorin.storage_service import storage_service

        encrypted_path = (
            f"encrypted/selfies/{user_id}/{avatar_id}/"
            f"selfie_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.enc"
        )
        encrypted_bytes = await self._encrypt_video(video_bytes)
        await storage_service.upload_bytes(
            encrypted_bytes, encrypted_path,
            content_type="application/octet-stream",
        )

        await validate_face(video_bytes)

        avatar.video_selfie_gcs_path = encrypted_path
        avatar.video_selfie_uploaded_at = datetime.now(timezone.utc)
        avatar.updated_at = datetime.now(timezone.utc)
        await avatar.save()

        logger.info("Video selfie processed", extra={
            "avatar_id": str(avatar.id), "encrypted_path": encrypted_path,
        })
        return avatar

    async def delete_video_selfie(self, avatar_id: str, user_id: str) -> None:
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar or avatar.user_id != user_id:
            return
        if avatar.video_selfie_gcs_path:
            from app.services.olorin.storage_service import storage_service
            try:
                await storage_service.delete_file(avatar.video_selfie_gcs_path)
            except Exception as exc:
                logger.warning("Failed to delete video selfie", extra={
                    "avatar_id": avatar_id, "error": str(exc),
                })
            avatar.video_selfie_gcs_path = None
            avatar.updated_at = datetime.now(timezone.utc)
            await avatar.save()
            logger.info("Video selfie deleted", extra={"avatar_id": avatar_id})

    def _validate_video_format(self, video_bytes: bytes, content_type: str) -> None:
        allowed_types = {"video/mp4", "video/quicktime", "video/webm"}
        if content_type not in allowed_types:
            raise ValueError(f"Unsupported video format: {content_type}")
        if len(video_bytes) > settings.VIDEO_SELFIE_MAX_SIZE_BYTES:
            raise ValueError("Video file too large")
        if len(video_bytes) < 1024:
            raise ValueError("Video file too small")

    async def _encrypt_video(self, video_bytes: bytes) -> bytes:
        from cryptography.fernet import Fernet
        key = settings.FERNET_ENCRYPTION_KEY
        if not key:
            raise ValueError("FERNET_ENCRYPTION_KEY not configured")
        fernet = Fernet(key.encode())
        return fernet.encrypt(video_bytes)


video_selfie_handler = VideoSelfieHandler()
