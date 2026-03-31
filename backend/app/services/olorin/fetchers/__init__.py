"""
BYOC source fetcher subpackage.

Each module implements a single async fetcher function that accepts a
``B2BContentSource`` and returns ``List[tuple[str, str]]`` of
``(url, title)`` pairs. The ``_FETCHERS`` dict dispatches by source type.
"""

from app.services.olorin.fetchers.iptv import fetch_iptv
from app.services.olorin.fetchers.manual import fetch_manual
from app.services.olorin.fetchers.plex import fetch_plex
from app.services.olorin.fetchers.rss import fetch_rss_feed
from app.services.olorin.fetchers.youtube import (
    fetch_youtube_channel,
    fetch_youtube_playlist,
)

_FETCHERS = {
    "youtube_channel": fetch_youtube_channel,
    "playlist": fetch_youtube_playlist,
    "rss": fetch_rss_feed,
    "manual": fetch_manual,
    "plex": fetch_plex,
    "iptv": fetch_iptv,
}
