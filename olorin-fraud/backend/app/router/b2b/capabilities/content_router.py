"""
B2B Content AI Capabilities Router.

Proxy endpoints for B2B partners to access Content AI capabilities from Bayit+.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field

from app.models.b2b.partner import ServiceCategory
from app.security.b2b_auth import (
    B2BPartnerContext,
    get_b2b_partner_context,
)
from app.service.b2b.partner_service import get_b2b_partner_service
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/capabilities/content", tags=["B2B Content AI"])


# ==================== Request/Response Models ====================


# Dubbing Models
class CreateDubbingSessionRequest(BaseModel):
    """Create dubbing session request."""

    source_language: str = Field(default="he", description="Source language code")
    target_language: str = Field(default="en", description="Target language code")
    voice_id: Optional[str] = Field(default=None, description="ElevenLabs voice ID")


class DubbingSessionResponse(BaseModel):
    """Dubbing session response."""

    session_id: str
    status: str
    source_language: str
    target_language: str
    voice_id: Optional[str]
    websocket_url: str
    message: str


# Search Models
class SemanticSearchRequest(BaseModel):
    """Semantic search request."""

    query: str = Field(..., min_length=1, max_length=1000)
    language: str = Field(default="he")
    content_types: Optional[List[str]] = None
    limit: int = Field(default=20, ge=1, le=100)
    min_score: float = Field(default=0.7, ge=0.0, le=1.0)


class DialogueSearchRequest(BaseModel):
    """Dialogue/subtitle search request."""

    query: str = Field(..., min_length=1, max_length=500)
    language: str = Field(default="he")
    content_id: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=200)
    min_score: float = Field(default=0.6, ge=0.0, le=1.0)


class SearchResult(BaseModel):
    """Search result item."""

    content_id: str
    title: str
    title_en: Optional[str]
    matched_text: str
    match_type: str
    relevance_score: float
    timestamp_seconds: Optional[float]
    deep_link: Optional[str]


class SearchResponse(BaseModel):
    """Search response."""

    query: str
    results: List[SearchResult]
    total_found: int


# Context Models
class ContextDetectionRequest(BaseModel):
    """Cultural context detection request."""

    text: str = Field(..., min_length=1, max_length=5000)
    language: str = Field(default="he")
    target_language: str = Field(default="en")
    min_confidence: float = Field(default=0.7, ge=0.0, le=1.0)


class DetectedReference(BaseModel):
    """Detected cultural reference."""

    reference_id: str
    canonical_name: str
    canonical_name_en: Optional[str]
    category: str
    matched_text: str
    start_position: int
    end_position: int
    confidence: float
    short_explanation: str


class ContextDetectionResponse(BaseModel):
    """Cultural context detection response."""

    original_text: str
    references: List[DetectedReference]
    total_found: int
    tokens_used: int


# Recap Models
class CreateRecapSessionRequest(BaseModel):
    """Create recap session request."""

    channel_id: Optional[str] = None
    stream_url: Optional[str] = None


class RecapSessionResponse(BaseModel):
    """Recap session response."""

    session_id: str
    status: str
    message: str


class AddTranscriptRequest(BaseModel):
    """Add transcript segment request."""

    text: str = Field(..., min_length=1, max_length=5000)
    timestamp_seconds: float = Field(..., ge=0)
    speaker: Optional[str] = None
    language: str = Field(default="he")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class GenerateRecapRequest(BaseModel):
    """Generate recap request."""

    window_minutes: int = Field(default=15, ge=1, le=120)
    target_language: str = Field(default="en")


class RecapResponse(BaseModel):
    """Recap response."""

    summary: str
    key_points: List[str]
    window_start_seconds: float
    window_end_seconds: float
    tokens_used: int


# ==================== Dependency: Require Content AI Capability ====================


async def require_content_ai_capability(
    context: B2BPartnerContext = Depends(get_b2b_partner_context),
) -> B2BPartnerContext:
    """Verify the partner has content AI capability enabled."""
    partner_service = get_b2b_partner_service()

    org = await partner_service.get_organization(context.org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    if not org.has_category(ServiceCategory.CONTENT_AI):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Content AI capability not enabled for this organization",
        )

    if not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization is suspended",
        )

    return context


# ==================== Dubbing Endpoints ====================


@router.post("/dubbing/sessions", response_model=DubbingSessionResponse)
async def create_dubbing_session(
    request: CreateDubbingSessionRequest,
    context: B2BPartnerContext = Depends(require_content_ai_capability),
) -> DubbingSessionResponse:
    """
    Create a new real-time dubbing session.

    Returns a WebSocket URL for audio streaming.
    """
    import secrets
    import os

    session_id = f"dub_{secrets.token_urlsafe(12)}"

    logger.info(
        f"Dubbing session created: {session_id} by org={context.org_id}"
    )

    # Record session start
    await _record_usage(context.org_id, "realtime_dubbing", 1, sessions_created=1)

    # Get base URL from environment
    base_url = os.getenv("OLORIN_B2B_API_URL", "wss://api.olorin.ai")
    websocket_url = f"{base_url}/api/v1/b2b/capabilities/content/dubbing/ws/{session_id}"

    return DubbingSessionResponse(
        session_id=session_id,
        status="created",
        source_language=request.source_language,
        target_language=request.target_language,
        voice_id=request.voice_id,
        websocket_url=websocket_url,
        message="Dubbing session created. Connect to WebSocket to start streaming.",
    )


@router.get("/dubbing/sessions/{session_id}")
async def get_dubbing_session(
    session_id: str,
    context: B2BPartnerContext = Depends(require_content_ai_capability),
) -> dict:
    """
    Get the status of a dubbing session.
    """
    try:
        from app.persistence.mongodb import get_mongodb_client

        client = await get_mongodb_client()
        db = client.get_default_database()
        collection = db["dubbing_sessions"]

        doc = await collection.find_one({"session_id": session_id})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )

        if doc.get("partner_id") != context.org_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session",
            )

        return {
            "session_id": doc.get("session_id"),
            "status": doc.get("status"),
            "source_language": doc.get("source_language"),
            "target_language": doc.get("target_language"),
            "audio_seconds_processed": doc.get("audio_seconds_processed", 0),
            "segments_processed": doc.get("segments_processed", 0),
            "started_at": doc.get("started_at").isoformat() if doc.get("started_at") else None,
            "ended_at": doc.get("ended_at").isoformat() if doc.get("ended_at") else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get dubbing session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get session status",
        )


@router.post("/dubbing/sessions/{session_id}/end")
async def end_dubbing_session(
    session_id: str,
    context: B2BPartnerContext = Depends(require_content_ai_capability),
) -> dict:
    """
    End a dubbing session.
    """
    try:
        from datetime import datetime, timezone

        from app.persistence.mongodb import get_mongodb_client

        client = await get_mongodb_client()
        db = client.get_default_database()
        collection = db["dubbing_sessions"]

        result = await collection.find_one_and_update(
            {"session_id": session_id, "partner_id": context.org_id},
            {
                "$set": {
                    "status": "ended",
                    "ended_at": datetime.now(timezone.utc),
                }
            },
            return_document=True,
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or access denied",
            )

        return {
            "session_id": session_id,
            "status": "ended",
            "message": "Dubbing session ended successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end dubbing session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end session",
        )


@router.get("/dubbing/voices")
async def list_voices(
    context: B2BPartnerContext = Depends(require_content_ai_capability),
) -> dict:
    """
    List available TTS voices.
    """
    # This would integrate with ElevenLabs API
    # For now, return static list
    voices = [
        {"voice_id": "default_male", "name": "Default Male", "language": "en"},
        {"voice_id": "default_female", "name": "Default Female", "language": "en"},
        {"voice_id": "news_anchor", "name": "News Anchor", "language": "en"},
    ]

    return {"voices": voices, "total": len(voices)}


# ==================== Search Endpoints ====================


@router.post("/search/semantic", response_model=SearchResponse)
async def semantic_search(
    request: SemanticSearchRequest,
    context: B2BPartnerContext = Depends(require_content_ai_capability),
) -> SearchResponse:
    """
    Perform semantic search across content.
    """
    logger.info(f"Semantic search: query='{request.query[:50]}...' by org={context.org_id}")

    # Record usage
    await _record_usage(context.org_id, "semantic_search", 1)

    # This would integrate with vector_search_service from Bayit+
    # For now, return empty results
    return SearchResponse(
        query=request.query,
        results=[],
        total_found=0,
    )


@router.post("/search/dialogue", response_model=SearchResponse)
async def dialogue_search(
    request: DialogueSearchRequest,
    context: B2BPartnerContext = Depends(require_content_ai_capability),
) -> SearchResponse:
    """
    Search through dialogue/subtitle content.
    """
    logger.info(f"Dialogue search: query='{request.query[:50]}...' by org={context.org_id}")

    # Record usage
    await _record_usage(context.org_id, "semantic_search", 1)

    return SearchResponse(
        query=request.query,
        results=[],
        total_found=0,
    )


# ==================== Cultural Context Endpoints ====================


@router.post("/context/detect", response_model=ContextDetectionResponse)
async def detect_cultural_context(
    request: ContextDetectionRequest,
    context: B2BPartnerContext = Depends(require_content_ai_capability),
) -> ContextDetectionResponse:
    """
    Detect cultural references in text.
    """
    logger.info(f"Context detection: text_len={len(request.text)} by org={context.org_id}")

    # Record usage
    await _record_usage(context.org_id, "cultural_context", 1)

    # This would integrate with cultural_context_service from Bayit+
    return ContextDetectionResponse(
        original_text=request.text,
        references=[],
        total_found=0,
        tokens_used=0,
    )


@router.get("/context/explain/{reference_id}")
async def explain_reference(
    reference_id: str,
    language: str = "en",
    context: B2BPartnerContext = Depends(require_content_ai_capability),
) -> dict:
    """
    Get detailed explanation for a cultural reference.
    """
    # This would look up the reference in the database
    return {
        "reference_id": reference_id,
        "explanation": "Reference explanation not available",
        "language": language,
    }


# ==================== Recap Endpoints ====================


@router.post("/recap/sessions", response_model=RecapSessionResponse)
async def create_recap_session(
    request: CreateRecapSessionRequest,
    context: B2BPartnerContext = Depends(require_content_ai_capability),
) -> RecapSessionResponse:
    """
    Create a new recap session for live content.
    """
    import secrets

    session_id = f"recap_{secrets.token_urlsafe(12)}"

    logger.info(f"Recap session created: {session_id} by org={context.org_id}")

    # Record usage
    await _record_usage(context.org_id, "recap_agent", 1, sessions_created=1)

    # Create session in database
    try:
        from datetime import datetime, timezone

        from app.persistence.mongodb import get_mongodb_client

        client = await get_mongodb_client()
        db = client.get_default_database()
        collection = db["recap_sessions"]

        await collection.insert_one({
            "session_id": session_id,
            "partner_id": context.org_id,
            "channel_id": request.channel_id,
            "stream_url": request.stream_url,
            "status": "active",
            "transcript_segments": [],
            "recaps": [],
            "started_at": datetime.now(timezone.utc),
            "last_updated_at": datetime.now(timezone.utc),
        })
    except Exception as e:
        logger.error(f"Failed to create recap session: {e}")

    return RecapSessionResponse(
        session_id=session_id,
        status="active",
        message="Recap session created. Add transcript segments to build context.",
    )


@router.post("/recap/sessions/{session_id}/transcript")
async def add_transcript_segment(
    session_id: str,
    request: AddTranscriptRequest,
    context: B2BPartnerContext = Depends(require_content_ai_capability),
) -> dict:
    """
    Add a transcript segment to a recap session.
    """
    try:
        from datetime import datetime, timezone

        from app.persistence.mongodb import get_mongodb_client

        client = await get_mongodb_client()
        db = client.get_default_database()
        collection = db["recap_sessions"]

        segment = {
            "text": request.text,
            "timestamp": request.timestamp_seconds,
            "speaker": request.speaker,
            "language": request.language,
            "confidence": request.confidence,
            "added_at": datetime.now(timezone.utc),
        }

        result = await collection.find_one_and_update(
            {"session_id": session_id, "partner_id": context.org_id, "status": "active"},
            {
                "$push": {"transcript_segments": segment},
                "$set": {"last_updated_at": datetime.now(timezone.utc)},
            },
            return_document=True,
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found, not active, or access denied",
            )

        return {
            "session_id": session_id,
            "segments_count": len(result.get("transcript_segments", [])),
            "message": "Transcript segment added successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add transcript: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add transcript segment",
        )


@router.get("/recap/sessions/{session_id}/recap", response_model=RecapResponse)
async def generate_recap(
    session_id: str,
    window_minutes: int = 15,
    target_language: str = "en",
    context: B2BPartnerContext = Depends(require_content_ai_capability),
) -> RecapResponse:
    """
    Generate a recap/summary for a session.
    """
    logger.info(f"Generating recap for session: {session_id} by org={context.org_id}")

    # Record usage (tokens will be updated after generation)
    await _record_usage(context.org_id, "recap_agent", 1)

    # This would integrate with recap_agent_service from Bayit+
    return RecapResponse(
        summary="Recap generation not yet integrated",
        key_points=["Integration pending"],
        window_start_seconds=0,
        window_end_seconds=window_minutes * 60,
        tokens_used=0,
    )


@router.post("/recap/sessions/{session_id}/end")
async def end_recap_session(
    session_id: str,
    context: B2BPartnerContext = Depends(require_content_ai_capability),
) -> dict:
    """
    End a recap session.
    """
    try:
        from datetime import datetime, timezone

        from app.persistence.mongodb import get_mongodb_client

        client = await get_mongodb_client()
        db = client.get_default_database()
        collection = db["recap_sessions"]

        result = await collection.find_one_and_update(
            {"session_id": session_id, "partner_id": context.org_id},
            {
                "$set": {
                    "status": "ended",
                    "ended_at": datetime.now(timezone.utc),
                }
            },
            return_document=True,
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or access denied",
            )

        return {
            "session_id": session_id,
            "status": "ended",
            "total_segments": len(result.get("transcript_segments", [])),
            "total_recaps": len(result.get("recaps", [])),
            "message": "Recap session ended successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end recap session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end session",
        )


# ==================== Usage Tracking ====================


async def _record_usage(
    org_id: str,
    capability: str,
    request_count: int,
    sessions_created: int = 0,
) -> None:
    """Record API usage for billing."""
    try:
        from datetime import datetime, timezone

        from app.persistence.mongodb import get_mongodb_client

        client = await get_mongodb_client()
        db = client.get_default_database()
        collection = db["usage_records"]

        now = datetime.now(timezone.utc)
        period_start = now.replace(minute=0, second=0, microsecond=0)
        period_end = period_start.replace(hour=period_start.hour + 1)

        await collection.update_one(
            {
                "partner_id": org_id,
                "capability": capability,
                "period_start": period_start,
                "granularity": "hourly",
            },
            {
                "$inc": {
                    "request_count": request_count,
                    "sessions_created": sessions_created,
                },
                "$setOnInsert": {
                    "period_end": period_end,
                    "tokens_consumed": 0,
                    "audio_seconds_processed": 0,
                    "characters_processed": 0,
                    "estimated_cost_usd": 0,
                    "created_at": now,
                },
            },
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"Failed to record usage: {e}")
