"""Unit test configuration for BYOC fetchers.

Provides MockSource as a lightweight test stand-in for B2BContentSource
that avoids Beanie Document initialization requirements.
"""

from dataclasses import dataclass, field
from typing import List


@dataclass
class MockSource:
    """Test stand-in for B2BContentSource without Beanie dependency."""

    source_type: str
    source_url: str
    name: str
    partner_id: str = "test-partner"
    auto_process: bool = False
    capabilities: List[str] = field(
        default_factory=lambda: ["characters"],
    )
    content_ids: List[str] = field(default_factory=list)
    status: str = "active"
