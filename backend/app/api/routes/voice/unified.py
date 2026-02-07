"""
Unified Voice Endpoint
Single endpoint for all voice interactions across platforms
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.security import get_current_user
from app.services.voice.intent_router import IntentRouter
from app.services.voice.error_codes import VoiceErrorCode, get_error_detail
from app.services.voice.error_messages import get_error_message
from app.models.user import User
from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter, RATE_LIMITS

logger = get_logger(__name__)
router = APIRouter()

class UnifiedVoiceRequest(BaseModel):
    """Request model for unified voice endpoint"""
    transcript: str = Field(..., description="Voice input transcript", min_length=1, max_length=500)
    language: str = Field(default="en", description="Language code (ISO 639-1)", pattern="^[a-z]{2}$")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for context", max_length=100)
    platform: str = Field(default="web", description="Platform: web, ios, android, tvos")
    trigger_type: str = Field(default="manual", description="Trigger: manual or wake-word")

    @field_validator('transcript')
    @classmethod
    def validate_transcript(cls, v: str) -> str:
        """Validate and sanitize transcript"""
        v = v.strip()
        if not v:
            raise ValueError("Transcript cannot be empty or whitespace only")
        if len(v) > 500:
            raise ValueError("Transcript exceeds maximum length of 500 characters")
        return v

    @field_validator('platform')
    @classmethod
    def validate_platform(cls, v: str) -> str:
        """Validate platform value"""
        allowed_platforms = ['web', 'ios', 'android', 'tvos']
        if v not in allowed_platforms:
            raise ValueError(f"Platform must be one of: {', '.join(allowed_platforms)}")
        return v

    @field_validator('trigger_type')
    @classmethod
    def validate_trigger_type(cls, v: str) -> str:
        """Validate trigger type"""
        allowed_triggers = ['manual', 'wake-word']
        if v not in allowed_triggers:
            raise ValueError(f"Trigger type must be one of: {', '.join(allowed_triggers)}")
        return v


class VoiceAction(BaseModel):
    """Action to execute based on intent"""
    type: str = Field(..., description="Action type")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Action payload")


class GestureState(BaseModel):
    """Wizard gesture/animation state"""
    gesture: str = Field(..., description="Gesture type")
    duration: Optional[int] = Field(None, description="Duration in ms")


class UnifiedVoiceResponse(BaseModel):
    """Response model for unified voice endpoint"""
    intent: str = Field(..., description="Detected intent: CHAT, SEARCH, NAVIGATION, etc.")
    spoken_response: str = Field(..., description="TTS response text")
    action: Optional[VoiceAction] = Field(None, description="Action to execute")
    conversation_id: str = Field(..., description="Conversation ID")
    confidence: float = Field(..., description="Intent confidence (0-1)")
    gesture: Optional[GestureState] = Field(None, description="Wizard gesture to display")


@router.post(
    "/unified",
    response_model=UnifiedVoiceResponse,
    summary="Unified Voice Interaction",
    description="Process voice transcript and route to appropriate handler"
)
@limiter.limit(RATE_LIMITS["voice_unified"])
async def unified_voice_interaction(
    http_request: Request,
    request: UnifiedVoiceRequest,
    current_user: User = Depends(get_current_user)
) -> UnifiedVoiceResponse:
    """Classify intent, route to handler, return structured response."""

    logger.info(
        "Voice interaction started",
        extra={
            "user_id": str(current_user.id),
            "platform": request.platform,
            "trigger_type": request.trigger_type,
            "language": request.language,
            "transcript_length": len(request.transcript),
        }
    )

    try:
        # Initialize intent router
        intent_router = IntentRouter(
            language=request.language,
            platform=request.platform,
            user_id=str(current_user.id),
            conversation_id=request.conversation_id
        )

        # Process transcript and route intent
        response = await intent_router.process_and_route(
            transcript=request.transcript,
            trigger_type=request.trigger_type
        )

        logger.info(
            "Voice interaction completed",
            extra={
                "user_id": str(current_user.id),
                "intent": response.intent,
                "confidence": response.confidence,
                "conversation_id": response.conversation_id,
            }
        )

        return response

    except ValueError as e:
        error_detail = get_error_detail(VoiceErrorCode.VALIDATION_TRANSCRIPT_EMPTY)
        logger.warning(
            "Voice interaction validation error",
            extra={
                "user_id": str(current_user.id),
                "error": str(e),
                "error_code": VoiceErrorCode.VALIDATION_TRANSCRIPT_EMPTY.value,
                "transcript": request.transcript[:50],
            }
        )
        raise HTTPException(
            status_code=error_detail.http_status,
            detail={
                "error_code": VoiceErrorCode.VALIDATION_TRANSCRIPT_EMPTY.value,
                "message": str(e),
                "spoken_response": get_error_message(
                    error_detail.message_key, request.language
                ),
            },
        )
    except Exception as e:
        error_detail = get_error_detail(VoiceErrorCode.INTERNAL_ERROR)
        logger.error(
            "Voice interaction failed",
            extra={
                "user_id": str(current_user.id),
                "error": str(e),
                "error_code": VoiceErrorCode.INTERNAL_ERROR.value,
                "error_type": type(e).__name__,
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=error_detail.http_status,
            detail={
                "error_code": VoiceErrorCode.INTERNAL_ERROR.value,
                "message": error_detail.description,
                "spoken_response": get_error_message(
                    error_detail.message_key, request.language
                ),
            },
        )
