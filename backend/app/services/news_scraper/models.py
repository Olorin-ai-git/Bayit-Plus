"""
News Scraper Models.

Data classes for news headlines and scraped news collections.
"""

import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


def clean_cdata(text: str) -> str:
    """Remove CDATA markers from text (both HTML-encoded and raw)."""
    if not text:
        return text
    # Remove raw CDATA markers
    text = text.replace("<![CDATA[", "").replace("]]>", "")
    # Remove HTML-encoded CDATA markers
    text = text.replace("&lt;![CDATA[", "").replace("]]&gt;", "")
    return text.strip()


@dataclass
class HeadlineItem:
    """A single news headline."""

    title: str
    url: str
    source: str  # ynet, walla, mako, etc.
    category: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None  # Video URL for playback (YouTube, direct video, etc.)
    summary: Optional[str] = None
    published_at: Optional[datetime] = None
    scraped_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def id(self) -> str:
        """Generate unique ID from URL."""
        return hashlib.md5(self.url.encode()).hexdigest()[:12]


@dataclass
class ScrapedNews:
    """Collection of scraped news from all sources."""

    headlines: List[HeadlineItem]
    sources: List[str]
    scraped_at: datetime = field(default_factory=datetime.utcnow)
    error_sources: List[str] = field(default_factory=list)


def headlines_to_dict(headlines: List[HeadlineItem]) -> List[Dict[str, Any]]:
    """Convert headlines to dictionary format for API response."""
    return [
        {
            "id": h.id,
            "title": h.title,
            "url": h.url,
            "source": h.source,
            "category": h.category,
            "image_url": h.image_url,
            "video_url": h.video_url,
            "summary": h.summary,
            "scraped_at": h.scraped_at.isoformat(),
        }
        for h in headlines
    ]
