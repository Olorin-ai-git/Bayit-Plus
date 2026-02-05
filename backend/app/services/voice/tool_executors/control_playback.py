"""
Control Playback Tool Executor
Returns a playback control action payload for the frontend player
"""

from typing import Any, Dict, Optional

from app.core.logging_config import get_logger

logger = get_logger(__name__)

VALID_COMMANDS = {"play", "pause", "resume", "stop", "seek", "mute", "unmute"}


async def execute_control_playback(
    command: str,
    value: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Execute control_playback tool - control media playback.

    Args:
        command: Playback command (play, pause, resume, stop, seek)
        value: Optional value (e.g. seek position in seconds)

    Returns:
        Dict with playback action payload
    """
    try:
        normalized_command = command.lower().strip()

        logger.info(
            "Playback control requested",
            extra={"command": normalized_command, "value": value},
        )

        if normalized_command not in VALID_COMMANDS:
            return {
                "success": False,
                "error": f"Unknown command: {command}",
                "valid_commands": sorted(VALID_COMMANDS),
            }

        payload: Dict[str, Any] = {"action": normalized_command}
        if value is not None:
            payload["value"] = value

        return {
            "success": True,
            "command": normalized_command,
            "_action": {
                "type": "playback",
                "payload": payload,
            },
        }

    except Exception as e:
        logger.error(
            "Failed to execute control_playback",
            extra={"command": command, "error": str(e)},
            exc_info=True,
        )
        return {"success": False, "error": str(e)}
