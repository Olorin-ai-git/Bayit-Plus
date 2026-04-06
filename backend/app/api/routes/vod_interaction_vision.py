"""
Vision-Grounded Questions API Route

REST endpoint for vision-grounded questions. Users pause a video,
tap on an area of the frame, and the character responds about
what they're pointing at using Claude's multimodal vision API.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.user import User
from app.models.vod_interaction import (
    DialogueExchange,
    VODInteractionSession,
)
from app.schemas.vision_grounded import VisionAskRequest, VisionAskResponse
from app.services.beta.credit_service import credit_service
from app.services.vod_interaction.character_animator import (
    character_animator_service,
)
from app.services.vod_interaction.vision_grounded_service import (
    vision_grounded_service,
)

logger = get_logger(__name__)

router = APIRouter(
    prefix="/vod-interactions",
    tags=["VOD Interactions - Vision"],
)


@router.post(
    "/sessions/{session_id}/vision-ask",
    response_model=VisionAskResponse,
    status_code=status.HTTP_200_OK,
)
@limiter.limit(RATE_LIMITS.get("vod_interaction_vision_ask", "10/minute"))
async def vision_ask(
    request: Request,
    session_id: str,
    body: VisionAskRequest,
    current_user: User = Depends(get_current_user),
):
    """Process a vision-grounded question on a paused video frame."""
    if not settings.VOD_VISION_GROUNDED_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vision-grounded questions are not enabled",
        )

    session = await VODInteractionSession.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    if session.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session does not belong to this user",
        )
    if session.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is not active: {session.status}",
        )
    if len(session.dialogue_exchanges) >= settings.VOD_INTERACTION_MAX_EXCHANGES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum dialogue exchanges reached",
        )

    is_demo_content = (
        settings.DEMO_CONTENT_ID
        and session.content_id == settings.DEMO_CONTENT_ID
    )

    credit_amount = (
        settings.CREDIT_RATE_VOD_PAUSE_ASK_VOICE_ONLY
        if body.voice_only
        else settings.CREDIT_RATE_VOD_PAUSE_ASK
    )

    if not is_demo_content:
        has_balance = await credit_service.has_sufficient_credits(
            user_id=str(current_user.id),
            amount=credit_amount,
        )
        if not has_balance:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Insufficient credits for vision question",
            )

    try:
        character_response = (
            await vision_grounded_service.process_vision_question(
                session=session,
                frame_b64=body.frame_b64,
                tap_x=body.tap_x,
                tap_y=body.tap_y,
                user_message=body.user_message,
            )
        )

        question_text = (
            body.user_message or settings.VOD_VISION_DEFAULT_QUESTION
        )
        user_exchange = DialogueExchange(
            speaker="user",
            message_text=question_text,
            timestamp=datetime.utcnow(),
            tap_x=body.tap_x,
            tap_y=body.tap_y,
            is_vision_grounded=True,
        )
        session.dialogue_exchanges.append(user_exchange)

        voice_id = (
            session.character_voice_id
            or settings.CHARACTER_VOICE_DEFAULT
        )

        if body.voice_only:
            animated = (
                await character_animator_service.generate_audio_only(
                    character_name=session.character_name,
                    dialogue_text=character_response.text,
                    voice_id=voice_id,
                )
            )
        else:
            animated = (
                await character_animator_service.animate_character_response(
                    character_name=session.character_name,
                    dialogue_text=character_response.text,
                    character_frame_url=session.character_frame_url or "",
                    voice_id=voice_id,
                )
            )

        character_exchange = DialogueExchange(
            speaker="character",
            message_text=character_response.text,
            audio_url=animated.audio_url,
            animated_video_url=animated.video_url,
            timestamp=datetime.utcnow(),
            tap_x=body.tap_x,
            tap_y=body.tap_y,
            is_vision_grounded=True,
        )
        session.dialogue_exchanges.append(character_exchange)
        session.updated_at = datetime.utcnow()
        await session.save()

        if not is_demo_content:
            await credit_service.charge_credits(
                user_id=str(current_user.id),
                amount=credit_amount,
                reason="vod_vision_grounded_question",
                metadata={"session_id": str(session.id)},
            )

        logger.info(
            "Vision question processed",
            extra={
                "session_id": str(session.id),
                "character_name": session.character_name,
                "tap_x": body.tap_x,
                "tap_y": body.tap_y,
            },
        )

        return VisionAskResponse(
            character_name=session.character_name,
            response_text=character_response.text,
            audio_url=animated.audio_url,
            animated_video_url=animated.video_url,
            tap_x=body.tap_x,
            tap_y=body.tap_y,
        )

    except ValueError as ve:
        logger.warning(
            "Vision question validation error",
            extra={"session_id": session_id, "error": str(ve)},
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Vision question processing failed",
            extra={"session_id": session_id, "error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process vision question",
        )
