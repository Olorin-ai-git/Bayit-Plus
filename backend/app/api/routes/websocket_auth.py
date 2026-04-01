"""
Shared WebSocket authentication and rate limiting for social features.

Provides auth-message pattern (no token in URL) and per-connection
rate limiting for party, chess, and DM WebSocket endpoints.
"""

import asyncio
import time
from typing import Optional, Tuple, Union

import jwt as pyjwt
from starlette.websockets import WebSocket

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import decode_token
from app.models.training_user import TrainingUser
from app.models.user import User

logger = get_logger(__name__)

TRAINING_JWT_ISSUER = "training.olorin.ai"


async def _authenticate_training_token(
    raw_token: str,
) -> Optional[Tuple[str, str]]:
    """Decode a training JWT and return (user_id, display_name)."""
    try:
        payload = pyjwt.decode(
            raw_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except pyjwt.PyJWTError:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    training_user = await TrainingUser.get(user_id)
    if not training_user or training_user.status != "active":
        return None
    return (str(training_user.id), training_user.display_name)


def _peek_issuer(raw_token: str) -> Optional[str]:
    """Read the iss claim without verifying the signature."""
    try:
        claims = pyjwt.decode(
            raw_token, options={"verify_signature": False}
        )
        return claims.get("iss")
    except pyjwt.PyJWTError:
        return None


async def authenticate_websocket(
    websocket: WebSocket,
) -> Tuple[Optional[Union[User, Tuple[str, str]]], bool]:
    """Wait for auth message and validate token.

    Returns:
        - Bayit+ path: (User, False)
        - Training path: ((user_id, display_name), False)
        - Failure: (None, True) -- connection already closed
    """
    timeout = settings.olorin.social_ws.auth_timeout_seconds
    try:
        raw = await asyncio.wait_for(
            websocket.receive_json(), timeout=timeout
        )
    except asyncio.TimeoutError:
        await _close_with_error(websocket, "Authentication timeout", 4001)
        return None, True
    except Exception:
        logger.warning("WebSocket auth receive error")
        await _safe_close(websocket, 4001, "Authentication error")
        return None, True

    if raw.get("type") != "auth" or not raw.get("token"):
        await _close_with_error(
            websocket,
            "Authentication required. Send: {type: 'auth', token: '...'}",
            4001,
        )
        return None, True

    raw_token = raw["token"]
    issuer = _peek_issuer(raw_token)

    if issuer == TRAINING_JWT_ISSUER:
        result = await _authenticate_training_token(raw_token)
        if result is None:
            await _close_with_error(
                websocket, "Invalid training credentials", 4001
            )
            return None, True
        logger.info("Training user authenticated via WebSocket")
        return result, False

    payload = await decode_token(raw_token)
    if payload is None:
        await _close_with_error(websocket, "Invalid or expired token", 4001)
        return None, True

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        await _close_with_error(websocket, "Invalid token payload", 4001)
        return None, True

    # RS256 tokens: sub is the auth service user ID, not the Bayit+ _id.
    user = await User.find_one({"auth_service_user_id": user_id})
    if user is None:
        user = await User.get(user_id)
    if not user or not user.is_active:
        await _close_with_error(websocket, "User not found or inactive", 4001)
        return None, True

    return user, False


class ConnectionRateLimiter:
    """Per-connection sliding-window rate limiter for WebSocket messages."""

    def __init__(self, max_per_minute: int) -> None:
        self._max_per_minute = max_per_minute
        self._timestamps: list[float] = []
        self._warnings = 0

    def check(self) -> bool:
        """Record a message and return True if within limit."""
        now = time.monotonic()
        cutoff = now - 60.0
        self._timestamps = [t for t in self._timestamps if t > cutoff]
        self._timestamps.append(now)
        return len(self._timestamps) <= self._max_per_minute

    def record_warning(self) -> int:
        """Increment and return warning count."""
        self._warnings += 1
        return self._warnings


def check_message_size(data: str) -> bool:
    """Return True if message is within configured size limit."""
    max_bytes = settings.olorin.social_ws.max_message_size_bytes
    return len(data.encode("utf-8")) <= max_bytes


async def _close_with_error(
    websocket: WebSocket, message: str, code: int
) -> None:
    """Send error JSON then close the WebSocket."""
    try:
        await websocket.send_json(
            {"type": "error", "message": message, "recoverable": False}
        )
    except Exception:
        pass
    await _safe_close(websocket, code, message)


async def _safe_close(
    websocket: WebSocket, code: int, reason: str
) -> None:
    """Close WebSocket, swallowing exceptions on already-closed."""
    try:
        await websocket.close(code=code, reason=reason)
    except Exception:
        pass
