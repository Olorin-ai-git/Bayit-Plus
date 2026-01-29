"""
103FM radio widget configuration.

This widget provides direct access to רדיו ללא הפסקה 103FM live radio stream.

Note: Widget configs use multiple language fields (title, title_en, title_es, etc.)
following the RadioStation model pattern. Frontend i18n happens via @olorin/shared-i18n
when rendering the widget UI.
"""

from typing import TypedDict


class WidgetPosition(TypedDict):
    x: int
    y: int
    width: int
    height: int


class Radio103FMWidgetConfig(TypedDict):
    title: str  # Hebrew (primary)
    title_en: str  # English
    title_es: str  # Spanish
    description: str  # Hebrew (primary)
    description_en: str  # English
    description_es: str  # Spanish
    icon: str
    order: int
    position: WidgetPosition
    station_name: str  # Exact RadioStation.name for lookup


# Station name constant - matches RadioStation.name from update script
# Source: backend/app/scripts/update_israeli_radio_stations.py:120
RADIO_103FM_STATION_NAME = "רדיו ללא הפסקה 103fm"


RADIO_103FM_WIDGET: Radio103FMWidgetConfig = {
    "title": "רדיו 103FM - שידור חי",
    "title_en": "103FM Radio - Live",
    "title_es": "Radio 103FM - En Vivo",
    "description": "רדיו ללא הפסקה 103FM שידור חי",
    "description_en": "Non-Stop Radio 103FM Live Stream",
    "description_es": "Radio Sin Parar 103FM Transmisión en Vivo",
    "icon": "📻",
    "order": 51,  # After Galei Tzahal (50)
    "position": {
        "x": 490,
        "y": 450,  # Same row as Galei Tzahal, next to it
        "width": 450,
        "height": 280,
    },
    "station_name": RADIO_103FM_STATION_NAME,
}
