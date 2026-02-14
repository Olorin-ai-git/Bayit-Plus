"""
Avatar Mesh API Types.

Request and response models for the 3D mesh generation endpoints.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class MeshGenerationRequest(BaseModel):
    """Request to generate a 3D mesh from a child's video selfie."""

    avatar_id: str = Field(..., description="Child avatar ID")
    profile_id: str = Field(..., description="Child profile ID")
    pin: str = Field(..., min_length=4, max_length=8, description="Family PIN")


class MeshBlendShapeResponse(BaseModel):
    """Blend shape info in API responses."""

    name: str
    default_weight: float


class MeshResponse(BaseModel):
    """API response for mesh status and data."""

    id: str
    avatar_id: str
    user_id: str
    status: str
    source: str = "rpm"
    has_glb: bool = False
    has_thumbnail: bool = False
    blend_shapes: List[MeshBlendShapeResponse] = Field(default_factory=list)
    bone_count: int = 0
    vertex_count: int = 0
    credits_charged: int = 0
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class MeshGlbUrlResponse(BaseModel):
    """Signed URL response for downloading the .glb file."""

    avatar_id: str
    signed_url: str
    expires_in_seconds: int
