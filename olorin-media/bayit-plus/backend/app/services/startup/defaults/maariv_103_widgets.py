"""
Maariv 103FM radio widget configurations.

These widgets display on-demand radio episodes and live content from
103FM Israeli radio station using iframe embeds.
"""

from typing import TypedDict


class WidgetPosition(TypedDict):
    x: int
    y: int
    width: int
    height: int


class Maariv103WidgetConfig(TypedDict, total=False):
    title: str
    description: str
    icon: str
    iframe_url: str
    podcast_id: str
    component_name: str
    order: int
    position: WidgetPosition


MAARIV_103_WIDGETS: list[Maariv103WidgetConfig] = [
    {
        "title": "103FM - Inon Magal & Ben Kaspit",
        "description": "תוכנית אינון מגל ובן כספית - רדיו 103FM",
        "icon": "🎙️",
        "iframe_url": "https://103embed.maariv.co.il/?ZrqvnVq=JGGHGF&c41t4nzVQ=FJF",
        "order": 20,
        "position": {"x": 860, "y": 300, "width": 450, "height": 320},
    },
    {
        "title": "103FM - בכר וקלינבוים - ארכיון פרקים",
        "description": "ארכיון פרקים של תוכנית בכר וקלינבוים ברדיו 103FM",
        "icon": "🎙️",
        "podcast_id": "6963c1ce8e299f975ea09bab",  # בכר וקלינבוים
        "component_name": "maariv_103_playlist",
        "order": 21,
        "position": {"x": 860, "y": 650, "width": 450, "height": 520},
    },
    {
        "title": "103FM - בן וינון, בקיצור - ארכיון פרקים",
        "description": "ארכיון פרקים של תוכנית בן וינון, בקיצור ברדיו 103FM",
        "icon": "🎙️",
        "podcast_id": "6963c1ce8e299f975ea09bac",  # בן וינון, בקיצור
        "component_name": "maariv_103_playlist",
        "order": 22,
        "position": {"x": 1330, "y": 650, "width": 450, "height": 520},
    },
]
