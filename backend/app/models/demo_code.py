"""
Demo Code model for private access codes.

Used by demo.olorin.ai to gate access to specific content without
requiring a full B2B partner API key.
"""

from datetime import datetime
from typing import Optional

from beanie import Document


class DemoCode(Document):
    """Private demo access code granting access to a set of content items."""

    code: str
    content_ids: list[str]
    expires_at: datetime
    max_uses: Optional[int] = None
    use_count: int = 0

    class Settings:
        name = "demo_codes"
