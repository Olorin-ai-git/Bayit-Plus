"""Grandparent Bridge API request and response schemas."""

from pydantic import BaseModel, Field


class GenerateClipRequest(BaseModel):
    """Request to generate a news clip from a learning session."""

    profile_id: str = Field(..., min_length=1, max_length=100)
    avatar_id: str = Field(..., min_length=1, max_length=100)
    session_summary: dict


class ShareClipRequest(BaseModel):
    """Request to share a clip via WhatsApp (PIN-gated for COPPA)."""

    pin: str = Field(..., min_length=4, max_length=6)
    recipient_name: str = Field(default="", max_length=100)
    recipient_phone_hash: str = Field(default="", max_length=128)
    language: str = Field(default="he", min_length=2, max_length=5)


class VerifyPinRequest(BaseModel):
    """Request to verify a family PIN on a share landing page."""

    pin: str = Field(..., min_length=4, max_length=6)
