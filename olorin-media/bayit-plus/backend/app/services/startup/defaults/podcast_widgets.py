"""
Podcast widget configurations.

These widgets display featured podcasts.
"""

from typing import TypedDict


class WidgetPosition(TypedDict):
    x: int
    y: int


class PodcastWidgetConfig(TypedDict):
    podcast_id: str
    title: str
    description: str
    icon: str
    order: int
    position: WidgetPosition


PODCAST_WIDGETS: list[PodcastWidgetConfig] = [
    {
        "podcast_id": "69618106c3cadc264da3effd",
        "title": 'סג"ל וברקו - הפודקאסט',
        "description": "פודקאסט מ-103FM",
        "icon": "🎙️",
        "order": 2,
        "position": {"x": 700, "y": 100},
    },
]
