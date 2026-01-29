"""
Galei Tzahal (Army Radio) widget configuration.

This widget provides direct access to גלי צהל live radio stream.

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


class GaleiTzahalWidgetConfig(TypedDict):
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
# Source: backend/app/scripts/update_israeli_radio_stations.py:60
GALEI_TZAHAL_STATION_NAME = "גלצ 96.6fm"


GALEI_TZAHAL_WIDGET: GaleiTzahalWidgetConfig = {
    "title": "גלי צהל - שידור חי",
    "title_en": "Galei Tzahal - Live",
    "title_es": "Galei Tzahal - En Vivo",
    "description": "גלי צהל - גלצ 96.6FM שידור חי",
    "description_en": "Galei Tzahal - Glz 96.6FM Live Stream",
    "description_es": "Galei Tzahal - Glz 96.6FM Transmisión en Vivo",
    "icon": "📻",
    "order": 50,  # After channel widgets (0-1) and 103FM widgets (20-21)
    "position": {
        "x": 20,
        "y": 450,  # Below channel widgets, above fold on desktop
        "width": 450,
        "height": 280,
    },
    "station_name": GALEI_TZAHAL_STATION_NAME,
}
