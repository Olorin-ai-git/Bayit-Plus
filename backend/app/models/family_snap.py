"""
Family Snap Model.

Shareable composite photos of child avatars with show characters.
Templates support side-by-side, action pose, and group photo layouts.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from pymongo import IndexModel


class SnapTemplate(str, Enum):
    """Composition template types."""

    SIDE_BY_SIDE = "side_by_side"
    ACTION_POSE = "action_pose"
    GROUP_PHOTO = "group_photo"


class SnapStatus(str, Enum):
    """Snap generation lifecycle."""

    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"
    DELETED = "deleted"


class FamilySnap(Document):
    """
    Generated composite photo of avatar with show characters.

    Watermarked for sharing. Parental PIN required for external share.
    """

    user_id: Indexed(str)
    profile_id: str
    avatar_id: str

    # Template and composition
    template: SnapTemplate = SnapTemplate.SIDE_BY_SIDE
    show_content_id: Optional[str] = None
    character_names: List[str] = Field(default_factory=list)

    # Generated assets (GCS paths)
    composite_gcs_path: Optional[str] = None
    thumbnail_gcs_path: Optional[str] = None
    watermarked_gcs_path: Optional[str] = None
    highres_gcs_path: Optional[str] = None

    # Sharing
    share_token: Optional[str] = None
    share_url: Optional[str] = None
    shared_externally: bool = False
    share_pin_verified: bool = False

    # Status
    status: SnapStatus = SnapStatus.GENERATING
    error_message: Optional[str] = None

    # Credits
    credits_charged: int = 0

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "family_snaps"
        indexes = [
            IndexModel(
                [("user_id", 1), ("profile_id", 1), ("created_at", -1)]
            ),
            IndexModel([("avatar_id", 1)]),
            IndexModel([("share_token", 1)]),
        ]

    @property
    def is_ready(self) -> bool:
        return (
            self.status == SnapStatus.READY
            and self.composite_gcs_path is not None
        )


class SnapResponse(BaseModel):
    """API response for a family snap."""

    id: str
    template: str
    character_names: List[str]
    composite_url: Optional[str]
    thumbnail_url: Optional[str]
    status: str
    share_url: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class SnapGalleryResponse(BaseModel):
    """API response for snap gallery listing."""

    snaps: List[SnapResponse]
    total: int
