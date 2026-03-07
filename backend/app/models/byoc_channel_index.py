"""
BYOC Channel Index Model

Global channel index for fuzzy-matching IPTV channel names to canonical
identities with logos, EPG IDs, and categories. AI-grown: new entries
are created by LLM classification and validated by usage frequency.
"""

from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import Field


class ChannelIndexEntry(Document):
    """A canonical channel identity in the global channel index."""

    canonical_name: str = Field(..., description="Normalized channel name")
    aliases: List[str] = Field(
        default_factory=list,
        description="Known alternate names for this channel",
    )
    logo_url: Optional[str] = Field(
        None, description="URL to channel logo image"
    )
    epg_id: Optional[str] = Field(
        None, description="EPG channel identifier for TV guide mapping"
    )
    category: str = Field(
        ..., description="Channel category (news, sports, entertainment, etc.)"
    )
    subcategory: Optional[str] = Field(
        None, description="Optional subcategory"
    )
    language: str = Field(..., description="Primary language ISO 639-1 code")
    country: str = Field(..., description="Primary country ISO 3166-1 alpha-2")
    is_ai_generated: bool = Field(
        False, description="Whether this entry was created by AI classification"
    )
    confidence: float = Field(
        1.0, description="Classification confidence (0.0-1.0)"
    )
    match_count: int = Field(
        0, description="Times this entry matched a user manifest"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "channel_index"
        use_state_management = True
