"""
Child Avatar Model.

Stores generated cartoon avatars from child photos with COPPA consent tracking.
Original photos are encrypted at rest and auto-deleted after avatar generation.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field


class AvatarStyle(str, Enum):
    """Available avatar art styles."""

    CARTOON_2D = "cartoon_2d"
    PIXAR_3D = "pixar_3d"


class AvatarStatus(str, Enum):
    """Avatar generation lifecycle."""

    PENDING_CONSENT = "pending_consent"
    CONSENT_GRANTED = "consent_granted"
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"
    DELETED = "deleted"


class ConsentRecord(BaseModel):
    """COPPA verifiable parental consent record."""

    granted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    granted_by_user_id: str
    family_pin_verified: bool = False
    consent_text_version: str = Field(default="1.0")
    ip_address: Optional[str] = None


class AvatarPose(BaseModel):
    """Generated avatar pose variant."""

    pose_name: str
    gcs_path: str
    width: int = 0
    height: int = 0


class ChildAvatar(Document):
    """
    Child avatar with COPPA-compliant consent and photo lifecycle management.

    Original photos are encrypted (Fernet) at rest. Only the non-reversible
    cartoon avatar is sent to external generation APIs.
    """

    user_id: Indexed(str)
    profile_id: Indexed(str)
    child_first_name: str = Field(..., max_length=50)

    # Consent
    consent: Optional[ConsentRecord] = None

    # Photo (encrypted, auto-deleted after avatar generation)
    encrypted_photo_gcs_path: Optional[str] = None
    photo_uploaded_at: Optional[datetime] = None
    photo_deleted_at: Optional[datetime] = None

    # Avatar
    style: AvatarStyle = AvatarStyle.CARTOON_2D
    avatar_poses: List[AvatarPose] = Field(default_factory=list)
    primary_avatar_gcs_path: Optional[str] = None
    status: AvatarStatus = AvatarStatus.PENDING_CONSENT

    # Face detection metadata (no biometric data stored)
    face_detected: bool = False
    estimated_age_range: Optional[str] = None

    # Error tracking
    error_message: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "child_avatars"
        indexes = [
            [("user_id", 1), ("profile_id", 1)],
        ]

    @property
    def is_ready(self) -> bool:
        return self.status == AvatarStatus.READY and self.primary_avatar_gcs_path is not None

    @property
    def has_consent(self) -> bool:
        return self.consent is not None and self.consent.family_pin_verified
