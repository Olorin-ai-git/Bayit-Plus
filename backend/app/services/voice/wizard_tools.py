"""
Wizard Tools - Claude tool definitions and execution for voice assistant
Provides 9 specialized tools for content discovery, playback, and navigation

This module re-exports from modularized files for backward compatibility.
"""

from app.services.voice.tool_models import (
    SearchContentInput,
    GetRecommendationsInput,
    GetLiveChannelsInput,
    GetKidsContentInput,
    LookupUserGuideInput,
    PlayContentInput,
    SelectSubtitlesInput,
    NavigateToPageInput,
    ControlPlaybackInput,
)
from app.services.voice.tool_definitions import WIZARD_TOOLS
from app.services.voice.tool_executors import (
    execute_get_recommendations,
    execute_get_live_channels,
    execute_get_kids_content,
    execute_play_content,
    execute_select_subtitles,
    execute_navigate_to_page,
    execute_control_playback,
    execute_tool,
)

__all__ = [
    # Pydantic models
    "SearchContentInput",
    "GetRecommendationsInput",
    "GetLiveChannelsInput",
    "GetKidsContentInput",
    "LookupUserGuideInput",
    "PlayContentInput",
    "SelectSubtitlesInput",
    "NavigateToPageInput",
    "ControlPlaybackInput",
    # Tool definitions
    "WIZARD_TOOLS",
    # Executor functions
    "execute_get_recommendations",
    "execute_get_live_channels",
    "execute_get_kids_content",
    "execute_play_content",
    "execute_select_subtitles",
    "execute_navigate_to_page",
    "execute_control_playback",
    "execute_tool",
]
