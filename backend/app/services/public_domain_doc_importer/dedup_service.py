"""Centralized deduplication for documentary content imports."""

import logging
from typing import Optional

from app.models.content import Content

logger = logging.getLogger(__name__)


class DocumentaryDeduplicationService:
    """Single-query deduplication for documentary imports."""

    async def find_duplicate(
        self,
        source_provider: str,
        source_id: str,
        stream_url: Optional[str] = None,
        title: Optional[str] = None,
        year: Optional[int] = None,
    ) -> Optional[Content]:
        """Find existing content matching any dedup criteria using a single $or query."""
        or_conditions = [
            {"source_provider": source_provider, "source_id": source_id},
        ]

        if stream_url:
            or_conditions.append({"stream_url": stream_url})

        if title and year:
            or_conditions.append({"title": title, "year": year})

        return await Content.find_one({"$or": or_conditions})

    async def is_duplicate(
        self,
        source_provider: str,
        source_id: str,
        stream_url: Optional[str] = None,
        title: Optional[str] = None,
        year: Optional[int] = None,
    ) -> bool:
        """Check if content already exists."""
        result = await self.find_duplicate(
            source_provider=source_provider,
            source_id=source_id,
            stream_url=stream_url,
            title=title,
            year=year,
        )
        return result is not None
