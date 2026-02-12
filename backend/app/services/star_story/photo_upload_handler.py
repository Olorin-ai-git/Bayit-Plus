"""
Photo Upload Handler.

Handles child photo upload with EXIF stripping, encryption, and storage.
Photos are encrypted at rest using Fernet and stored in GCS.
"""

import io
import logging
from datetime import datetime, timezone
from uuid import uuid4

from cryptography.fernet import Fernet
from PIL import Image

from app.core.config import settings
from app.core.storage import StorageService
from app.models.child_avatar import AvatarStatus, ChildAvatar

logger = logging.getLogger(__name__)


class PhotoUploadHandler:
    """Handles photo upload with privacy-preserving processing."""

    def __init__(self):
        self._storage = StorageService()

    async def upload_photo(
        self,
        avatar_id: str,
        photo_bytes: bytes,
        content_type: str,
    ) -> ChildAvatar:
        """
        Process and upload child photo with privacy protections.

        Steps: validate -> strip EXIF -> encrypt -> upload to GCS.
        """
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar:
            raise ValueError(f"Avatar not found: {avatar_id}")

        if not avatar.has_consent:
            raise ValueError("Parental consent required before photo upload")

        self._validate_photo(photo_bytes, content_type)
        stripped = self._strip_exif(photo_bytes)
        encrypted = self._encrypt_photo(stripped)

        gcs_path = f"star-story/photos/{avatar.user_id}/{uuid4()}.enc"
        await self._storage.upload_file_bytes(encrypted, gcs_path, "application/octet-stream")

        avatar.encrypted_photo_gcs_path = gcs_path
        avatar.photo_uploaded_at = datetime.now(timezone.utc)
        avatar.status = AvatarStatus.CONSENT_GRANTED
        avatar.updated_at = datetime.now(timezone.utc)
        await avatar.save()

        logger.info(
            "Photo uploaded and encrypted",
            extra={
                "avatar_id": avatar_id,
                "gcs_path": gcs_path,
                "size_bytes": len(photo_bytes),
            },
        )
        return avatar

    def _validate_photo(self, photo_bytes: bytes, content_type: str) -> None:
        """Validate photo format and size."""
        allowed = {"image/jpeg", "image/png", "image/webp"}
        if content_type not in allowed:
            raise ValueError(f"Unsupported photo type: {content_type}")

        max_size = 10 * 1024 * 1024  # 10MB
        if len(photo_bytes) > max_size:
            raise ValueError("Photo exceeds maximum size")

        try:
            img = Image.open(io.BytesIO(photo_bytes))
            img.verify()
        except Exception as exc:
            raise ValueError(f"Invalid image file: {exc}")

    def _strip_exif(self, photo_bytes: bytes) -> bytes:
        """Remove all EXIF/metadata from photo for privacy."""
        img = Image.open(io.BytesIO(photo_bytes))
        clean = Image.new(img.mode, img.size)
        clean.putdata(list(img.getdata()))

        output = io.BytesIO()
        fmt = "PNG" if img.mode == "RGBA" else "JPEG"
        clean.save(output, format=fmt, quality=95)
        return output.getvalue()

    def _encrypt_photo(self, photo_bytes: bytes) -> bytes:
        """Encrypt photo using Fernet symmetric encryption."""
        key = settings.SECRET_KEY[:32].encode().ljust(32, b"=")
        import base64
        fernet_key = base64.urlsafe_b64encode(key[:32])
        f = Fernet(fernet_key)
        return f.encrypt(photo_bytes)

    async def delete_photo(self, avatar: ChildAvatar) -> None:
        """Delete encrypted photo from storage after avatar generation."""
        if not avatar.encrypted_photo_gcs_path:
            return

        await self._storage.provider.delete_file(avatar.encrypted_photo_gcs_path)
        avatar.encrypted_photo_gcs_path = None
        avatar.photo_deleted_at = datetime.now(timezone.utc)
        avatar.updated_at = datetime.now(timezone.utc)
        await avatar.save()

        logger.info(
            "Encrypted photo deleted",
            extra={"avatar_id": str(avatar.id)},
        )


photo_upload_handler = PhotoUploadHandler()
