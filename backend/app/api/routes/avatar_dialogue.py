"""
Avatar Dialogue API

Endpoints for the hybrid dialogue system.
"""

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.avatar_dialogue_service import (
    get_dialogue,
    get_predetermined_dialogue,
    PREDETERMINED_DIALOGUES,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/avatar/dialogue", tags=["Avatar Dialogue"])


class DialogueRequest(BaseModel):
    """Request for dialogue generation."""

    category: Optional[str] = Field(
        None,
        description="Dialogue category (wake, greeting, presenting, fuzzy_search, etc.)",
    )
    user_message: Optional[str] = Field(
        None,
        description="User's message for AI-generated response",
    )
    count: Optional[int] = Field(
        None,
        description="Result count for presenting dialogues",
    )
    query: Optional[str] = Field(
        None,
        description="Search query for context (used in fuzzy_search, clarification)",
    )
    context: Optional[dict[str, Any]] = Field(
        None,
        description="Additional context for AI generation",
    )
    personality_context: Optional[str] = Field(
        None,
        description="Context for personality dialogues (complex_request, obscure_find, polite_user)",
    )
    force_ai: bool = Field(
        False,
        description="Force AI generation even for known categories",
    )


class DialogueResponse(BaseModel):
    """Response with dialogue text and gesture."""

    text: str
    gesture: str
    source: str = Field(description="Source: 'predetermined', 'ai', or 'fallback'")
    tts_required: bool = Field(
        default=True,
        description="Whether TTS conversion is needed (always true - text needs speech synthesis)",
    )


@router.post("", response_model=DialogueResponse)
async def generate_dialogue(request: DialogueRequest) -> DialogueResponse:
    """
    Generate dialogue using hybrid approach.

    - Uses predetermined responses for known categories (faster, no AI latency)
    - Falls back to AI for complex queries
    - Supports force_ai flag to always use AI
    - All responses require TTS conversion on the frontend

    Predetermined categories include: wake, greeting, listening, processing,
    presenting_media, presenting_list, presenting_single, fuzzy_search,
    nothing_found, clarification, confirmation, dismissal, interruption,
    error, idle_timeout, success, warning, agreement, disagreement, personality
    """
    try:
        result = await get_dialogue(
            category=request.category,
            user_message=request.user_message,
            count=request.count,
            query=request.query,
            context=request.context,
            personality_context=request.personality_context,
            force_ai=request.force_ai,
        )

        return DialogueResponse(
            text=result["text"],
            gesture=result["gesture"],
            source=result.get("source", "unknown"),
            tts_required=result.get("tts_required", True),
        )

    except Exception as e:
        logger.error(f"Dialogue generation failed: {e}")
        raise HTTPException(status_code=500, detail="Dialogue generation failed")


@router.get("/categories")
async def list_categories() -> dict[str, list[str]]:
    """List all available predetermined dialogue categories."""
    return {"categories": list(PREDETERMINED_DIALOGUES.keys())}


@router.get("/preview/{category}")
async def preview_category(category: str) -> dict[str, Any]:
    """Preview all dialogues in a category."""
    dialogues = PREDETERMINED_DIALOGUES.get(category)
    if not dialogues:
        raise HTTPException(status_code=404, detail=f"Category '{category}' not found")

    return {
        "category": category,
        "count": len(dialogues),
        "dialogues": dialogues,
    }


@router.post("/predetermined")
async def get_predetermined(
    category: str,
    count: Optional[int] = None,
    query: Optional[str] = None,
) -> DialogueResponse:
    """Get a predetermined dialogue (no AI)."""
    result = get_predetermined_dialogue(category, count, query)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No predetermined dialogue for category '{category}'",
        )

    return DialogueResponse(
        text=result["text"],
        gesture=result["gesture"],
        source="predetermined",
    )
