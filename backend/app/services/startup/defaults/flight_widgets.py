"""
Flight status widget configurations.

These widgets display real-time flight information from various airports
using iFrame embeds from avionio.com.
"""

from typing import TypedDict


class WidgetPosition(TypedDict):
    x: int
    y: int
    width: int
    height: int


class FlightWidgetConfig(TypedDict):
    title: str
    description: str
    icon: str
    iframe_url: str
    order: int
    position: WidgetPosition


FLIGHT_WIDGETS: list[FlightWidgetConfig] = [
    {
        "title": "TLV Departures",
        "description": 'טיסות יוצאות מנתב"ג',
        "icon": "✈️",
        "iframe_url": "https://www.avionio.com/widget/en/TLV/departures?autoheight=1",
        "order": 10,
        "position": {"x": 20, "y": 300, "width": 400, "height": 400},
    },
    {
        "title": "TLV Arrivals",
        "description": 'טיסות נוחתות בנתב"ג',
        "icon": "🛬",
        "iframe_url": "https://www.avionio.com/widget/en/TLV/arrivals?autoheight=1",
        "order": 11,
        "position": {"x": 440, "y": 300, "width": 400, "height": 400},
    },
    {
        "title": "JFK - New York",
        "description": "טיסות מ/אל JFK ניו יורק",
        "icon": "🗽",
        "iframe_url": "https://www.avionio.com/widget/en/JFK?autoheight=1",
        "order": 12,
        "position": {"x": 20, "y": 300, "width": 400, "height": 400},
    },
    {
        "title": "MIA - Miami",
        "description": "טיסות מ/אל MIA מיאמי",
        "icon": "🌴",
        "iframe_url": "https://www.avionio.com/widget/en/MIA?autoheight=1",
        "order": 13,
        "position": {"x": 20, "y": 300, "width": 400, "height": 400},
    },
    {
        "title": "LAX - Los Angeles",
        "description": "טיסות מ/אל LAX לוס אנג'לס",
        "icon": "🌅",
        "iframe_url": "https://www.avionio.com/widget/en/LAX?autoheight=1",
        "order": 14,
        "position": {"x": 20, "y": 300, "width": 400, "height": 400},
    },
    {
        "title": "EWR - Newark",
        "description": "טיסות מ/אל EWR נוארק",
        "icon": "🏙️",
        "iframe_url": "https://www.avionio.com/widget/en/EWR?autoheight=1",
        "order": 15,
        "position": {"x": 20, "y": 300, "width": 400, "height": 400},
    },
]
