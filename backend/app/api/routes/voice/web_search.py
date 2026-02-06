"""
Voice Web Search Endpoint
Provides web search functionality for voice commands.
Returns structured results suitable for iFrame widget display.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.user import User
from app.services.voice.web_search_service import voice_web_search

logger = get_logger(__name__)
router = APIRouter()


class VoiceWebSearchRequest(BaseModel):
    """Request model for voice web search"""

    query: str = Field(
        ..., description="Search query", min_length=1, max_length=300
    )
    language: str = Field(
        default="en",
        description="Language code (ISO 639-1)",
        pattern="^[a-z]{2}$",
    )
    max_results: int = Field(
        default=5, ge=1, le=10, description="Maximum results"
    )


class WebSearchResult(BaseModel):
    """Single web search result"""

    title: str
    url: str
    snippet: str


class VoiceWebSearchResponse(BaseModel):
    """Response model for voice web search"""

    query: str
    results: list[WebSearchResult] = Field(default_factory=list)
    total_found: int = 0
    spoken_response: str = Field(
        default="", description="TTS response text"
    )


@router.post(
    "/web-search",
    response_model=VoiceWebSearchResponse,
    summary="Voice Web Search",
    description="Search the web via voice command for iFrame widget display",
)
@limiter.limit(RATE_LIMITS.get("voice_unified", "60/minute"))
async def voice_web_search_endpoint(
    http_request: Request,
    request: VoiceWebSearchRequest,
    current_user: User = Depends(get_current_user),
) -> VoiceWebSearchResponse:
    """
    Voice-initiated web search endpoint.

    Returns structured results with URLs for iFrame rendering.

    Rate Limit: 60 requests/minute per user
    Authentication: Required (JWT token)
    """
    logger.info(
        "Voice web search request",
        extra={
            "user_id": str(current_user.id),
            "query": request.query[:50],
            "language": request.language,
        },
    )

    try:
        search_result = await voice_web_search(
            query=request.query,
            language=request.language,
            max_results=request.max_results,
        )

        results = [
            WebSearchResult(**r) for r in search_result.get("results", [])
        ]

        count = len(results)
        if count > 0:
            spoken = _build_spoken_response(count, request.language)
        else:
            spoken = _no_results_response(request.language)

        return VoiceWebSearchResponse(
            query=request.query,
            results=results,
            total_found=count,
            spoken_response=spoken,
        )

    except Exception as e:
        logger.error(
            "Voice web search endpoint failed",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Web search failed",
        )


def _build_spoken_response(count: int, language: str) -> str:
    """Build TTS response for successful search."""
    responses = {
        "he": f"מצאתי {count} תוצאות",
        "en": f"I found {count} results",
        "es": f"Encontre {count} resultados",
    }
    return responses.get(language, responses["en"])


def _no_results_response(language: str) -> str:
    """Build TTS response when no results found."""
    responses = {
        "he": "לא מצאתי תוצאות באינטרנט",
        "en": "No web results found",
        "es": "No se encontraron resultados en la web",
    }
    return responses.get(language, responses["en"])
