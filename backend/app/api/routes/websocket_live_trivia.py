"""
WebSocket endpoint for live trivia fact delivery (Premium feature)
Real-time transcript → topic detection → fact generation → trivia streaming
"""

import logging

from beanie import PydanticObjectId
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_helpers import (
    check_authentication_message,
    check_subscription_tier,
    end_quota_session,
    get_user_from_token,
    initialize_trivia_session,
    process_trivia_stream,
    validate_channel_and_feature,
)
from app.core.config import settings
from app.models.content import LiveChannel
from app.models.live_feature_quota import UsageSessionStatus
from app.services.live_trivia.live_trivia_orchestrator import LiveTriviaOrchestrator
from app.services.rate_limiter_live import get_rate_limiter

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/live/{channel_id}/trivia")
async def websocket_live_trivia(websocket: WebSocket, channel_id: str):
    """
    Live trivia fact delivery. Client sends: auth message + transcript chunks.
    Server sends: connected, trivia_fact, quota_exceeded, error
    """
    # SECURITY: Enforce wss:// in production (allow ws:// for localhost)
    # Cloud Run terminates TLS at the load balancer, so the ASGI scope sees
    # ws:// even though clients connect over wss://. Check X-Forwarded-Proto
    # to determine the original client protocol.
    is_localhost = websocket.client and websocket.client.host in (
        "127.0.0.1",
        "::1",
        "localhost",
    )
    forwarded_proto = websocket.headers.get("x-forwarded-proto", "")
    is_secure = websocket.url.scheme == "wss" or forwarded_proto == "https"
    if (
        settings.olorin.dubbing.require_secure_websocket
        and not settings.DEBUG
        and not is_localhost
        and not is_secure
    ):
        await websocket.close(
            code=4000, reason="Secure WebSocket (wss://) required in production"
        )
        logger.warning(
            f"WebSocket rejected: insecure protocol ({websocket.url.scheme})"
        )
        return

    # Accept connection (then authenticate via message)
    await websocket.accept()

    # Authenticate via message
    token, auth_error = await check_authentication_message(websocket)
    if auth_error:
        return

    # Validate token
    user = await get_user_from_token(token)
    if not user:
        await websocket.send_json(
            {"type": "error", "message": "Invalid or expired token", "recoverable": False}
        )
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # Check rate limit
    rate_limiter = await get_rate_limiter()
    allowed, error_msg, reset_in = await rate_limiter.check_websocket_connection(
        str(user.id)
    )
    if not allowed:
        await websocket.send_json(
            {
                "type": "error",
                "message": error_msg,
                "recoverable": True,
                "retry_after_seconds": reset_in,
            }
        )
        await websocket.close(code=4029, reason="Rate limit exceeded")
        return

    # Check subscription tier (Plus feature)
    if not await check_subscription_tier(websocket, user, ["plus"]):
        return

    # Validate channel and feature
    channel = await validate_channel_and_feature(websocket, channel_id)
    if not channel:
        return

    # Initialize session with quota check
    session = await initialize_trivia_session(websocket, user, channel_id, channel)
    if not session:
        return

    # Initialize trivia orchestrator
    orchestrator = LiveTriviaOrchestrator()

    try:
        # Send connection confirmation
        await websocket.send_json(
            {
                "type": "connected",
                "channel_id": channel_id,
                "trivia_enabled": True,
                "source_language": channel.primary_language or "he",
            }
        )

        # Process transcript chunks and generate trivia
        try:
            await process_trivia_stream(
                websocket, orchestrator, session, user, channel_id
            )
        except WebSocketDisconnect:
            logger.info(f"Trivia session ended: user={user.id}, channel={channel_id}")
            await end_quota_session(session, UsageSessionStatus.COMPLETED)
        except Exception as e:
            logger.error(f"Error in trivia stream: {str(e)}")
            await end_quota_session(session, UsageSessionStatus.ERROR)

    except Exception as e:
        logger.error(f"Fatal error in trivia stream: {str(e)}")
        await end_quota_session(session, UsageSessionStatus.ERROR)
        try:
            await websocket.send_json(
                {"type": "error", "message": "Service unavailable", "recoverable": False}
            )
            await websocket.close(code=4000, reason="Service error")
        except Exception:
            pass
    finally:
        await orchestrator.close()


@router.get("/live/{channel_id}/trivia/status")
async def check_trivia_availability(channel_id: str):
    """Check if live trivia is available for a channel."""
    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
        if not channel:
            return {"available": False, "error": "Channel not found"}

        if not settings.TRIVIA_ENABLED:
            return {"available": False, "error": "Trivia feature is disabled"}

        return {
            "available": True,
            "source_language": channel.primary_language or "he",
            "trivia_enabled": settings.TRIVIA_ENABLED,
            "rollout_percentage": settings.TRIVIA_ROLLOUT_PERCENTAGE,
        }

    except Exception as e:
        logger.error(f"Error checking trivia availability: {str(e)}")
        return {"available": False, "error": "Internal error"}
