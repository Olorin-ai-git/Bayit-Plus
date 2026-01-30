"""Channel chat moderation REST API endpoints (admin only)."""

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.routes.channel_chat_models import (
    ModerationRequest,
    ModerationResponse,
    validate_id,
)
from app.core.logging_config import get_logger
from app.core.security import get_current_admin_user
from app.models.user import User
from app.services.channel_chat_service import get_channel_chat_service

router = APIRouter()
logger = get_logger(__name__)


@router.post("/live/{channel_id}/chat/{message_id}/pin", response_model=ModerationResponse)
async def pin_chat_message(
    channel_id: str,
    message_id: str,
    request: Request,
    admin: User = Depends(get_current_admin_user),
) -> ModerationResponse:
    """Pin a chat message (Admin only)."""
    validate_id(channel_id, "channel_id")
    validate_id(message_id, "message_id")

    client_ip = request.client.host if request.client else "unknown"

    logger.info(
        "Pin message requested",
        extra={
            "channel_id": channel_id,
            "message_id": message_id,
            "admin_id": str(admin.id),
            "client_ip": client_ip,
        },
    )

    try:
        chat_service = get_channel_chat_service()
        success = await chat_service.pin_message(
            message_id=message_id,
            channel_id=channel_id,
            actor_id=str(admin.id),
            actor_role="admin",
            actor_ip=client_ip,
        )

        if not success:
            raise ValueError("Message not found or wrong channel")

        logger.info("Message pinned", extra={"channel_id": channel_id, "message_id": message_id, "admin_id": str(admin.id)})
        return ModerationResponse(
            success=True, message="Message pinned successfully", action="pin", target=message_id
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(
            "Pin message failed",
            extra={"channel_id": channel_id, "message_id": message_id, "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to pin message")


@router.delete("/live/{channel_id}/chat/{message_id}", response_model=ModerationResponse)
async def delete_chat_message(
    channel_id: str,
    message_id: str,
    request: Request,
    moderation_request: ModerationRequest = ModerationRequest(),
    admin: User = Depends(get_current_admin_user),
) -> ModerationResponse:
    """Delete a chat message (Admin only)."""
    validate_id(channel_id, "channel_id")
    validate_id(message_id, "message_id")

    client_ip = request.client.host if request.client else "unknown"

    logger.info(
        "Delete message requested",
        extra={
            "channel_id": channel_id,
            "message_id": message_id,
            "admin_id": str(admin.id),
            "reason": moderation_request.reason,
            "client_ip": client_ip,
        },
    )

    try:
        chat_service = get_channel_chat_service()
        success = await chat_service.delete_message(
            message_id=message_id,
            channel_id=channel_id,
            actor_id=str(admin.id),
            actor_role="admin",
            reason=moderation_request.reason,
            actor_ip=client_ip,
        )

        if not success:
            raise ValueError("Message not found or wrong channel")

        logger.info("Message deleted", extra={"channel_id": channel_id, "message_id": message_id, "admin_id": str(admin.id)})
        return ModerationResponse(
            success=True, message="Message deleted successfully", action="delete", target=message_id
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(
            "Delete message failed",
            extra={"channel_id": channel_id, "message_id": message_id, "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to delete message")


@router.post("/live/{channel_id}/chat/{user_id}/mute", response_model=ModerationResponse)
async def mute_chat_user(
    channel_id: str,
    user_id: str,
    request: Request,
    moderation_request: ModerationRequest = ModerationRequest(),
    admin: User = Depends(get_current_admin_user),
) -> ModerationResponse:
    """Mute a user in channel chat (Admin only)."""
    validate_id(channel_id, "channel_id")
    validate_id(user_id, "user_id")

    client_ip = request.client.host if request.client else "unknown"

    logger.info(
        "Mute user requested",
        extra={
            "channel_id": channel_id,
            "target_user_id": user_id,
            "admin_id": str(admin.id),
            "reason": moderation_request.reason,
            "client_ip": client_ip,
        },
    )

    try:
        chat_service = get_channel_chat_service()
        success = await chat_service.mute_user(
            channel_id=channel_id,
            target_user_id=user_id,
            actor_id=str(admin.id),
            actor_role="admin",
            reason=moderation_request.reason,
            actor_ip=client_ip,
        )

        if not success:
            raise ValueError("Failed to mute user")

        logger.info("User muted", extra={"channel_id": channel_id, "target_user_id": user_id, "admin_id": str(admin.id)})
        return ModerationResponse(
            success=True, message="User muted successfully", action="mute", target=user_id
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(
            "Mute user failed",
            extra={"channel_id": channel_id, "user_id": user_id, "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to mute user")
