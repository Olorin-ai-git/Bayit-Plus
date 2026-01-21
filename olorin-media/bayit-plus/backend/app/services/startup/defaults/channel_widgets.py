"""
Live channel widget configurations.

These widgets display live TV channels from Israeli broadcasters.
"""

from typing import TypedDict


class WidgetPosition(TypedDict):
    x: int
    y: int


class ChannelWidgetConfig(TypedDict):
    channel_num: str
    title: str
    description: str
    icon: str
    order: int
    position: WidgetPosition


CHANNEL_WIDGETS: list[ChannelWidgetConfig] = [
    {
        "channel_num": "11",
        "title": "Channel 11",
        "description": "ערוץ 11 שידור חי",
        "icon": "📺",
        "order": 0,
        "position": {"x": 20, "y": 100},
    },
    {
        "channel_num": "12",
        "title": "Channel 12 Live",
        "description": "ערוץ 12 שידור חי",
        "icon": "📺",
        "order": 1,
        "position": {"x": 360, "y": 100},
    },
]
