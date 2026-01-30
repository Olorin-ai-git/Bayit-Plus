"""
Podcast widget configurations.

These widgets display featured podcasts.
Podcast IDs are resolved at seed time by looking up podcasts by title.
"""

from typing import Optional, TypedDict


class WidgetPosition(TypedDict):
    x: int
    y: int


class PodcastWidgetConfig(TypedDict):
    podcast_title: str
    title: str
    description: str
    icon: str
    cover_url: Optional[str]
    order: int
    position: WidgetPosition


PODCAST_WIDGETS: list[PodcastWidgetConfig] = [
    {
        "podcast_title": '\u05e1\u05d2"\u05dc \u05d5\u05d1\u05e8\u05e7\u05d5 - \u05d4\u05e4\u05d5\u05d3\u05e7\u05d0\u05e1\u05d8',
        "title": '\u05e1\u05d2"\u05dc \u05d5\u05d1\u05e8\u05e7\u05d5 - \u05d4\u05e4\u05d5\u05d3\u05e7\u05d0\u05e1\u05d8',
        "description": "\u05e4\u05d5\u05d3\u05e7\u05d0\u05e1\u05d8 \u05de-103FM",
        "icon": "\U0001f399\ufe0f",
        "cover_url": (
            "https://is1-ssl.mzstatic.com/image/thumb/"
            "Podcasts126/v4/b3/16/70/b31670e1-2b0a-8e73-3a9c-01e163e5a96a/"
            "mza_12265707752681498498.jpg/1200x1200bf.webp"
        ),
        "order": 2,
        "position": {"x": 700, "y": 100},
    },
    {
        "podcast_title": "\u05d7\u05d5\u05e5 \u05dc\u05d0\u05e8\u05e5",
        "title": "\u05d7\u05d5\u05e5 \u05dc\u05d0\u05e8\u05e5",
        "description": "\u05e4\u05d5\u05d3\u05e7\u05d0\u05e1\u05d8 \u05d7\u05d3\u05e9\u05d5\u05ea \u05d5\u05e4\u05d5\u05dc\u05d9\u05d8\u05d9\u05e7\u05d4 \u05d1\u05d9\u05e0\u05dc\u05d0\u05d5\u05de\u05d9\u05ea \u05de\u05d4\u05d0\u05e8\u05e5",
        "icon": "\U0001f399\ufe0f",
        "cover_url": (
            "https://is1-ssl.mzstatic.com/image/thumb/"
            "Podcasts125/v4/5b/53/2b/5b532b11-01f6-8907-9567-74dee5900e85/"
            "mza_5697786007577311141.jpg/1200x1200bf.webp"
        ),
        "order": 3,
        "position": {"x": 700, "y": 320},
    },
]
