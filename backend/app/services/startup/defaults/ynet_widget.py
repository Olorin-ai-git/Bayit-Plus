"""
Ynet Mivzakim (Breaking News) widget configuration.

This widget uses a custom React component to display breaking news from Ynet.
"""

from typing import TypedDict


class WidgetPosition(TypedDict):
    x: int
    y: int
    width: int
    height: int


class YnetWidgetConfig(TypedDict):
    title: str
    description: str
    icon: str
    component_name: str
    order: int
    position: WidgetPosition


YNET_WIDGET_CONFIG: YnetWidgetConfig = {
    "title": "מבזקי Ynet",
    "description": "מבזקי חדשות בזמן אמת מ-Ynet",
    "icon": "📰",
    "component_name": "ynet_mivzakim",
    "order": 20,
    "position": {"x": 20, "y": 300, "width": 380, "height": 450},
}
