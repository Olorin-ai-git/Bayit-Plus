"""
WhatsApp Contact Model.

Stores approved grandparent contacts for automated highlight reel sharing.
Phone numbers are stored as SHA-256 hashes for privacy compliance.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class WhatsAppContact(Document):
    """
    Approved grandparent contact for WhatsApp sharing.

    Phone numbers are hashed (SHA-256) and never stored in plaintext.
    Each contact must be explicitly approved by the parent via PIN.
    """

    user_id: Indexed(str)
    profile_id: str

    # Contact info (privacy-preserving)
    phone_hash: str = Field(
        ..., description="SHA-256 hash of phone number",
    )
    display_name: str = Field(..., max_length=100)
    relationship: str = Field(
        default="grandparent",
        description="Relationship to child (grandparent, aunt, uncle, etc.)",
    )
    language: str = Field(
        default="he",
        description="Preferred language for messages (he, en, es, etc.)",
    )

    # Approval
    approved_by_user_id: str
    approved_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # Activity tracking
    last_sent_at: Optional[datetime] = None
    total_reels_sent: int = Field(default=0, ge=0)

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "whatsapp_contacts"
        indexes = [
            [("user_id", 1), ("profile_id", 1)],
        ]
