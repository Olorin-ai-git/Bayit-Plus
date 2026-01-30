"""Channel chat REST API endpoints for history and translation."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.routes.channel_chat_models import (
    ChatHistoryResponse,
    TranslationResponse,
    validate_id,
)
from app.core.config import Settings, get_settings
from app.core.database import get_database
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.channel_chat_service import get_channel_chat_service
from app.services.chat_translation_service import ChatTranslationService
from app.services.olorin.metering.service import MeteringService

router = APIRouter()
logger = get_logger(__name__)


async def get_credit_service(
    settings: Settings = Depends(get_settings),
    db=Depends(get_database),
) -> BetaCreditService:
    """Get BetaCreditService dependency with proper initialization."""
    metering_service = MeteringService()
    return BetaCreditService(settings=settings, metering_service=metering_service, db=db)


@router.get("/live/{channel_id}/chat/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    channel_id: str,
    before: Optional[str] = Query(None, description="Cursor/message ID for pagination"),
    limit: int = Query(50, ge=1, le=200, description="Number of messages to fetch"),
    current_user: User = Depends(get_current_user),
) -> ChatHistoryResponse:
    """Get paginated chat history for a channel."""
    validate_id(channel_id, "channel_id")
    if before:
        validate_id(before, "cursor")

    logger.info(
        "Fetching chat history",
        extra={
            "channel_id": channel_id,
            "user_id": str(current_user.id),
            "before": before,
            "limit": limit,
        },
    )

    try:
        chat_service = get_channel_chat_service()
        messages = await chat_service.get_recent_messages(
            channel_id=channel_id, limit=limit, before_id=before
        )

        message_dicts = [
            {
                "id": str(msg.id),
                "user_id": msg.user_id,
                "user_name": msg.user_name,
                "message": msg.message,
                "timestamp": msg.timestamp.isoformat(),
                "original_language": msg.original_language,
                "is_pinned": msg.is_pinned,
            }
            for msg in messages
        ]

        has_more = len(messages) == limit
        next_cursor = str(messages[-1].id) if has_more and messages else None

        return ChatHistoryResponse(
            messages=message_dicts, has_more=has_more, next_cursor=next_cursor
        )

    except Exception as e:
        logger.error(
            "Failed to fetch chat history",
            extra={"channel_id": channel_id, "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history")


@router.get("/live/{channel_id}/chat/translate", response_model=TranslationResponse)
async def translate_chat_message(
    channel_id: str,
    text: str = Query(..., min_length=1, max_length=5000, description="Text to translate"),
    from_lang: Optional[str] = Query(None, description="Source language code"),
    to_lang: str = Query(..., description="Target language code"),
    current_user: User = Depends(get_current_user),
    credit_service: BetaCreditService = Depends(get_credit_service),
) -> TranslationResponse:
    """Translate chat message on-demand (Beta users only)."""
    validate_id(channel_id, "channel_id")

    logger.info(
        "Translation requested",
        extra={
            "channel_id": channel_id,
            "user_id": str(current_user.id),
            "from_lang": from_lang,
            "to_lang": to_lang,
            "text_length": len(text),
        },
    )

    try:
        balance = await credit_service.get_balance(str(current_user.id))
        if balance is None:
            raise HTTPException(
                status_code=403,
                detail="Chat translation is only available for Beta 500 users",
            )

        if from_lang:
            result = await ChatTranslationService.translate_message(
                message=text, source_lang=from_lang, target_lang=to_lang
            )
        else:
            result = await ChatTranslationService.detect_and_translate(
                message=text, target_lang=to_lang
            )

        return TranslationResponse(
            original_text=text,
            translated_text=result.translated_text,
            from_lang=result.source_language,
            to_lang=result.target_language,
            confidence=result.confidence,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Translation failed",
            extra={"channel_id": channel_id, "user_id": str(current_user.id), "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Translation service unavailable")
