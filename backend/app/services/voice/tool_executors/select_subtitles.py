"""
Select Subtitles Tool Executor
Returns a subtitles action payload for the frontend player
"""

from typing import Any, Dict, Optional

from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Supported subtitle languages
SUPPORTED_SUBTITLE_LANGUAGES = {
    "he", "en", "es", "zh", "fr", "it", "hi", "ta", "bn", "ja",
}


async def execute_select_subtitles(
    language: Optional[str] = None,
    enabled: bool = True,
) -> Dict[str, Any]:
    """
    Execute select_subtitles tool - change subtitle settings.

    Args:
        language: Subtitle language code (e.g. 'en', 'he')
        enabled: Whether to enable or disable subtitles

    Returns:
        Dict with subtitles action payload
    """
    try:
        logger.info(
            "Subtitle change requested",
            extra={"language": language, "enabled": enabled},
        )

        if language and language not in SUPPORTED_SUBTITLE_LANGUAGES:
            return {
                "success": False,
                "error": f"Unsupported subtitle language: {language}",
                "supported": sorted(SUPPORTED_SUBTITLE_LANGUAGES),
            }

        payload: Dict[str, Any] = {"enabled": enabled}
        if language:
            payload["language"] = language

        return {
            "success": True,
            "language": language,
            "enabled": enabled,
            "_action": {
                "type": "subtitles",
                "payload": payload,
            },
        }

    except Exception as e:
        logger.error(
            "Failed to execute select_subtitles",
            extra={"error": str(e)},
            exc_info=True,
        )
        return {"success": False, "error": str(e)}
