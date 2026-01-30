"""
Default widget configurations for Bayit+ Backend.

This module contains the configuration for default system widgets
that are created on startup if they don't exist.
"""

from app.services.startup.defaults.channel_widgets import CHANNEL_WIDGETS
from app.services.startup.defaults.flight_widgets import FLIGHT_WIDGETS
from app.services.startup.defaults.galei_tzahal_widget import GALEI_TZAHAL_WIDGET
from app.services.startup.defaults.podcast_widgets import PODCAST_WIDGETS
from app.services.startup.defaults.podcasts import DEFAULT_PODCASTS
from app.services.startup.defaults.radio_103fm_widget import RADIO_103FM_WIDGET
from app.services.startup.defaults.ynet_widget import YNET_WIDGET_CONFIG

__all__ = [
    "FLIGHT_WIDGETS",
    "CHANNEL_WIDGETS",
    "PODCAST_WIDGETS",
    "DEFAULT_PODCASTS",
    "YNET_WIDGET_CONFIG",
    "GALEI_TZAHAL_WIDGET",
    "RADIO_103FM_WIDGET",
]
