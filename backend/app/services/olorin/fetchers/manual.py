"""
Manual source fetcher for B2B BYOC source sync.

Manual sources have no auto-fetch capability.
"""

from typing import List

from app.models.b2b_content_source import B2BContentSource


async def fetch_manual(
    source: B2BContentSource,
) -> List[tuple[str, str]]:
    """Manual sources have no auto-fetch -- return empty."""
    return []
