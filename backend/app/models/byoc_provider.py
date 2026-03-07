"""
BYOC Provider Model

Known IPTV providers with connection metadata, server URLs, and setup
instructions. Managed server-side so provider list updates without app releases.
"""

from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import Field


class BYOCProvider(Document):
    """A known IPTV provider with connection metadata."""

    name: str = Field(..., description="Provider display name")
    slug: str = Field(..., description="URL-safe unique identifier")
    logo_url: Optional[str] = Field(
        None, description="Provider logo URL"
    )
    connection_types: List[str] = Field(
        ..., description="Supported connection types: xtream, m3u"
    )
    server_url: Optional[str] = Field(
        None, description="Default server URL for Xtream connections"
    )
    m3u_url_template: Optional[str] = Field(
        None,
        description="M3U export URL template with {username}/{password} placeholders",
    )
    setup_instructions_key: Optional[str] = Field(
        None, description="Localization key for setup instructions"
    )
    is_active: bool = Field(True, description="Whether provider is visible")
    sort_order: int = Field(0, description="Display sort order (lower = first)")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "byoc_providers"
        use_state_management = True
