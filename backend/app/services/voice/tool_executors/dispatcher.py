"""
Tool Execution Dispatcher
Routes tool calls to appropriate executor functions
"""

from typing import Any, Dict
from pydantic import ValidationError

from app.core.logging_config import get_logger
from app.services.chat_search_tool import execute_search_content, execute_lookup_user_guide
from ..tool_models import (
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
from .recommendations import execute_get_recommendations
from .live_channels import execute_get_live_channels
from .kids_content import execute_get_kids_content
from .play_content import execute_play_content
from .select_subtitles import execute_select_subtitles
from .navigate_to_page import execute_navigate_to_page
from .control_playback import execute_control_playback

logger = get_logger(__name__)


async def execute_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a wizard tool by name with input validation.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Tool input parameters

    Returns:
        Tool execution result
    """
    try:
        if tool_name == "search_content":
            validated_input = SearchContentInput(**tool_input)
            return await execute_search_content(**validated_input.dict())

        elif tool_name == "get_recommendations":
            validated_input = GetRecommendationsInput(**tool_input)
            return await execute_get_recommendations(**validated_input.dict())

        elif tool_name == "get_live_channels":
            validated_input = GetLiveChannelsInput(**tool_input)
            return await execute_get_live_channels(**validated_input.dict())

        elif tool_name == "get_kids_content":
            validated_input = GetKidsContentInput(**tool_input)
            return await execute_get_kids_content(**validated_input.dict())

        elif tool_name == "lookup_user_guide":
            validated_input = LookupUserGuideInput(**tool_input)
            return await execute_lookup_user_guide(
                topic=validated_input.query,
            )

        elif tool_name == "play_content":
            validated_input = PlayContentInput(**tool_input)
            return await execute_play_content(**validated_input.dict())

        elif tool_name == "select_subtitles":
            validated_input = SelectSubtitlesInput(**tool_input)
            return await execute_select_subtitles(**validated_input.dict())

        elif tool_name == "navigate_to_page":
            validated_input = NavigateToPageInput(**tool_input)
            return await execute_navigate_to_page(**validated_input.dict())

        elif tool_name == "control_playback":
            validated_input = ControlPlaybackInput(**tool_input)
            return await execute_control_playback(**validated_input.dict())

        else:
            logger.error("Unknown tool", extra={"tool_name": tool_name})
            return {"error": "Unknown tool", "tool_name": tool_name}

    except ValidationError as e:
        logger.error(
            "Tool input validation failed",
            extra={"tool_name": tool_name, "errors": e.errors()}
        )
        return {"error": "Invalid tool input", "details": e.errors()}
