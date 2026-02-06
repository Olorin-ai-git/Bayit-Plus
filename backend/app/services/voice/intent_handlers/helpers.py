"""
Intent Handler Helper Functions
Shared utilities for intent handlers
"""

from typing import Any, Dict, Optional


def get_intent_gesture(intent: str) -> Optional[Dict[str, Any]]:
    """Get wizard gesture for intent."""

    gesture_map = {
        "SEARCH": {"gesture": "browsing", "duration": 2000},
        "CHAT": {"gesture": "conjuring", "duration": None},
        "KIDS": {"gesture": "browsing", "duration": 2000},
        "NAVIGATION": None,
        "PLAYBACK": None,
        "SCROLL": None,
        "CONTROL": None,
        "CONTENT_QUERY": {"gesture": "browsing", "duration": 2000},
        "DISPLAY_CHANNELS": {"gesture": "browsing", "duration": 2000},
        "WEB_SEARCH": {"gesture": "conjuring", "duration": 3000},
    }

    return gesture_map.get(intent)
