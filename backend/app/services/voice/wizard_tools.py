"""
Wizard Tools - Claude tool definitions and execution for voice assistant
Provides 5 specialized tools for content discovery and user assistance

This module re-exports from modularized files for backward compatibility.
"""

from app.services.voice.tool_models import (
    SearchContentInput,
    GetRecommendationsInput,
    GetLiveChannelsInput,
    GetKidsContentInput,
    LookupUserGuideInput
)
from app.services.voice.tool_definitions import WIZARD_TOOLS
from app.services.voice.tool_executors import (
    execute_get_recommendations,
    execute_get_live_channels,
    execute_get_kids_content,
    execute_tool
)

__all__ = [
    # Pydantic models
    "SearchContentInput",
    "GetRecommendationsInput",
    "GetLiveChannelsInput",
    "GetKidsContentInput",
    "LookupUserGuideInput",
    # Tool definitions
    "WIZARD_TOOLS",
    # Executor functions
    "execute_get_recommendations",
    "execute_get_live_channels",
    "execute_get_kids_content",
    "execute_tool",
]
