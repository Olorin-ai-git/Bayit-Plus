"""
Tool Executors Package
Re-exports all tool executor functions for backward compatibility
"""

from .recommendations import execute_get_recommendations
from .live_channels import execute_get_live_channels
from .kids_content import execute_get_kids_content
from .play_content import execute_play_content
from .select_subtitles import execute_select_subtitles
from .navigate_to_page import execute_navigate_to_page
from .control_playback import execute_control_playback
from .dispatcher import execute_tool

__all__ = [
    "execute_get_recommendations",
    "execute_get_live_channels",
    "execute_get_kids_content",
    "execute_play_content",
    "execute_select_subtitles",
    "execute_navigate_to_page",
    "execute_control_playback",
    "execute_tool",
]
