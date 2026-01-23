"""
Authentication and authorization helpers for WebSocket endpoints
"""

import asyncio
import logging
from typing import Optional, Tuple

from fastapi import WebSocket
from jose import JWTError, jwt

from app.core.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)


async def get_user_from_token(token: str) -> Optional[User]:
    """Validate JWT token and return user."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            return None

        user = await User.get(user_id)
        if not user or not user.is_active:
            return None

        return user
    except JWTError:
        return None


async def check_authentication_message(
    websocket: WebSocket, timeout: float = 10.0
) -> Tuple[Optional[str], Optional[str]]:
    """
    Wait for authentication message and extract token.

    Returns:
        (token, error_message): token if successful, error_message if failed
    """
    try:
        auth_message = await asyncio.wait_for(
            websocket.receive_json(), timeout=timeout
        )

        if auth_message.get("type") != "authenticate" or not auth_message.get("token"):
            await websocket.send_json({
                "type": "error",
                "message": "Authentication required. Send: {type: 'authenticate', token: '...'}",
                "recoverable": False,
            })
            await websocket.close(code=4001, reason="Authentication required")
            return None, "Authentication required"

        return auth_message["token"], None

    except asyncio.TimeoutError:
        await websocket.send_json({
            "type": "error",
            "message": "Authentication timeout",
            "recoverable": False,
        })
        await websocket.close(code=4001, reason="Authentication timeout")
        return None, "Authentication timeout"
    except Exception as e:
        logger.warning(f"Authentication error: {e}")
        await websocket.close(code=4001, reason="Authentication error")
        return None, str(e)


async def check_subscription_tier(
    websocket: WebSocket, user: User, required_tiers: list[str]
) -> bool:
    """
    Check if user has required subscription tier.

    Returns:
        True if authorized, False otherwise
    """
    if user.subscription_tier not in required_tiers:
        await websocket.send_json({
            "type": "error",
            "message": f"Required subscription tier: {', '.join(required_tiers)}",
            "recoverable": False,
        })
        await websocket.close(
            code=4003, reason=f"Required subscription tier: {', '.join(required_tiers)}"
        )
        return False
    return True


async def validate_channel_for_dubbing(
    websocket: WebSocket, channel_id: str, target_lang: str
):
    """
    Validate channel exists and supports dubbing for target language.

    Returns:
        (channel, error): channel if valid, error message if invalid
    """
    from beanie import PydanticObjectId
    from app.models.content import LiveChannel

    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
    except Exception:
        channel = None

    if not channel:
        await websocket.close(code=4004, reason="Channel not found")
        return None, "Channel not found"

    if not channel.supports_live_dubbing:
        await websocket.send_json({
            "type": "error",
            "message": "Channel does not support live dubbing",
            "recoverable": False,
        })
        await websocket.close(code=4005, reason="Channel does not support live dubbing")
        return None, "Channel does not support live dubbing"

    if target_lang not in channel.available_dubbing_languages:
        await websocket.send_json({
            "type": "error",
            "message": f"Language {target_lang} not available. Supported: {channel.available_dubbing_languages}",
            "recoverable": False,
        })
        await websocket.close(
            code=4006,
            reason=f"Language {target_lang} not available",
        )
        return None, f"Language {target_lang} not available"

    return channel, None
