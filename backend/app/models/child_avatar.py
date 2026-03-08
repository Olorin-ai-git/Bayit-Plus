"""
Child Avatar Model.

Stores generated cartoon avatars from child photos with COPPA consent tracking.
Original photos are encrypted at rest and auto-deleted after avatar generation.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed
from pymongo import DESCENDING
from pydantic import BaseModel, Field

# Extended pose names for interactive missions (12 total)
POSE_NAMES = [
    "front_neutral", "front_happy", "front_surprised",
    "front_speaking", "side_left", "side_right",
    "action_running", "action_jumping", "action_pointing",
    "emotion_excited", "emotion_confused", "emotion_celebrating",
]


class AvatarStyle(str, Enum):
    """Available avatar art styles."""

    CARTOON_2D = "cartoon_2d"
    PIXAR_3D = "pixar_3d"
    DISNEY_3D = "disney_3d"
    ANIME_3D = "anime_3d"


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
    consent_text_version: str = Field(default="2.0")
    ip_address: Optional[str] = None
    video_selfie_consent: bool = False
    voice_clone_consent: bool = False
    creatify_consent: bool = False


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

    # Video selfie (encrypted, auto-deleted after avatar + voice)
    video_selfie_gcs_path: Optional[str] = None
    video_selfie_uploaded_at: Optional[datetime] = None

    # Voice cloning
    elevenlabs_voice_id: Optional[str] = None
    voice_clone_status: str = Field(
        default="not_started",
        description="not_started, training, ready, failed",
    )

    # Creatify Avatar (Zeh Ani)
    creatify_persona_id: Optional[str] = Field(
        default=None, description="Creatify persona ID for lip-sync",
    )
    creatify_avatar_status: str = Field(
        default="not_started",
        description="not_started, creating, ready, failed",
    )
    creatify_avatar_image_url: Optional[str] = Field(
        default=None, description="GCS URL of image used for Creatify",
    )

    # Multi-avatar: which avatar is currently selected for this profile
    is_active: bool = Field(default=True)

    # Outfit wardrobe
    outfit_inventory: List["ProfileOutfitInventory"] = Field(
        default_factory=list
    )
    active_outfit_id: Optional[str] = None

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

    @property
    def has_voice_clone(self) -> bool:
        return self.voice_clone_status == "ready" and self.elevenlabs_voice_id is not None

    @classmethod
    async def get_active_for_profile(
        cls, user_id: str, profile_id: str,
    ) -> Optional["ChildAvatar"]:
        """Return the active avatar for a user+profile, or most recent."""
        active = await cls.find_one(
            {"user_id": user_id, "profile_id": profile_id, "is_active": True}
        )
        if active:
            return active
        return await cls.find_one(
            {"user_id": user_id, "profile_id": profile_id},
            sort=[("created_at", DESCENDING)],
        )

    @classmethod
    async def set_active(
        cls, user_id: str, profile_id: str, avatar_id: str,
    ) -> Optional["ChildAvatar"]:
        """Deactivate all avatars for profile, activate the target."""
        await cls.find(
            {"user_id": user_id, "profile_id": profile_id}
        ).update_many({"$set": {"is_active": False}})

        target = await cls.get(avatar_id)
        if target and target.user_id == user_id and target.profile_id == profile_id:
            target.is_active = True
            target.updated_at = datetime.now(timezone.utc)
            await target.save()
            return target
        return None


# Deferred import to avoid circular dependency
from app.models.avatar_outfit import ProfileOutfitInventory  # noqa: E402

ChildAvatar.model_rebuild()
