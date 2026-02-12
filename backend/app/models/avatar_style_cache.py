"""
Avatar Style Cache model for Chameleon Engine.

Caches style-transferred avatar poses that match the visual style
of a specific show/content. Uses CLIP similarity scoring to validate
that the style transfer maintains sufficient visual coherence.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from pymongo import IndexModel


class StyleCacheStatus(str, Enum):
    """Style cache generation lifecycle."""

    PENDING = "pending"
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"


class AvatarPoseCache(BaseModel):
    """A single cached pose for a style-transferred avatar."""

    pose_name: str
    gcs_path: str
    width: int = 0
    height: int = 0


class StyleDescriptor(BaseModel):
    """Visual style attributes extracted from show content."""

    palette: List[str] = Field(default_factory=list)
    line_weight: str = "medium"
    shading: str = "flat"
    texture: str = "smooth"


class AvatarStyleCache(Document):
    """Cached style-transferred avatar for a specific show."""

    avatar_id: Indexed(str)
    show_content_id: Indexed(str)
    style_embedding_hash: Optional[str] = None
    style_descriptor: Optional[StyleDescriptor] = None
    poses: List[AvatarPoseCache] = Field(default_factory=list)
    clip_similarity_score: float = 0.0
    status: StyleCacheStatus = StyleCacheStatus.PENDING
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Settings:
        name = "avatar_style_cache"
        indexes = [
            IndexModel(
                [("avatar_id", 1), ("show_content_id", 1)]
            ),
            IndexModel([("status", 1)]),
            IndexModel([("expires_at", 1)]),
        ]


class StyleCacheResponse(BaseModel):
    """API response for style cache status."""

    id: str
    avatar_id: str
    show_content_id: str
    status: str
    clip_similarity_score: float
    poses_count: int
    style_descriptor: Optional[StyleDescriptor]
    created_at: str

    class Config:
        from_attributes = True
