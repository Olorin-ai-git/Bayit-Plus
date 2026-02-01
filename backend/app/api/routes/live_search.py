"""
Live Transcript Search REST API Endpoints.

Provides endpoints for:
- Search live transcripts
- Get recent transcripts
- Search index status
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.api.routes.catchup_models import validate_id
from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.core.security import get_current_user
from app.models.live_transcript_index import LiveTranscriptIndex
from app.models.user import User
from app.services.search_index import get_search_index_service

router = APIRouter()
logger = get_logger(__name__)


class TranscriptMatch(BaseModel):
    """Single transcript match result."""

    text: str
    timestamp: str
    source_lang: str
    score: Optional[float] = None


class SearchResponse(BaseModel):
    """Search results response."""

    query: str
    results: List[TranscriptMatch]
    total: int
    channel_id: str


class RecentTranscriptsResponse(BaseModel):
    """Recent transcripts response."""

    transcripts: List[TranscriptMatch]
    total: int
    channel_id: str


class IndexStatusResponse(BaseModel):
    """Index status for a channel."""

    channel_id: str
    is_indexing: bool
    indexed_count: int
    config: dict


@router.get(
    "/live/{channel_id}/search",
    response_model=SearchResponse,
)
@limiter.limit("60/minute")
async def search_transcripts(
    request: Request,
    channel_id: str,
    q: str = Query(..., min_length=2, max_length=200),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """
    Search live transcripts for a channel.

    Uses MongoDB text index for full-text search.
    Returns matching transcript segments with timestamps.
    """
    validate_id(channel_id, "channel_id")
    logger.info(
        "Searching transcripts",
        extra={
            "channel_id": channel_id,
            "query": q,
            "user_id": str(current_user.id),
            "limit": limit,
        },
    )

    try:
        service = get_search_index_service()
        results = await service.search(
            channel_id=channel_id,
            query=q,
            limit=limit,
        )

        return SearchResponse(
            query=q,
            results=[
                TranscriptMatch(
                    text=r["text"],
                    timestamp=r["timestamp"],
                    source_lang=r["source_lang"],
                    score=r.get("score"),
                )
                for r in results
            ],
            total=len(results),
            channel_id=channel_id,
        )

    except Exception as e:
        logger.error(
            "Search failed",
            extra={"channel_id": channel_id, "query": q, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail="Search failed")


@router.get(
    "/live/{channel_id}/transcripts/recent",
    response_model=RecentTranscriptsResponse,
)
@limiter.limit("60/minute")
async def get_recent_transcripts(
    request: Request,
    channel_id: str,
    limit: int = Query(50, ge=1, le=200),
    minutes: int = Query(15, ge=1, le=60),
    current_user: User = Depends(get_current_user),
):
    """
    Get recent transcripts for a channel.

    Returns transcripts from the last N minutes.
    Useful for displaying transcript timeline.
    """
    validate_id(channel_id, "channel_id")
    logger.info(
        "Getting recent transcripts",
        extra={
            "channel_id": channel_id,
            "user_id": str(current_user.id),
            "limit": limit,
            "minutes": minutes,
        },
    )

    try:
        service = get_search_index_service()
        results = await service.get_recent(
            channel_id=channel_id,
            limit=limit,
            minutes=minutes,
        )

        return RecentTranscriptsResponse(
            transcripts=[
                TranscriptMatch(
                    text=r["text"],
                    timestamp=r["timestamp"],
                    source_lang=r["source_lang"],
                )
                for r in results
            ],
            total=len(results),
            channel_id=channel_id,
        )

    except Exception as e:
        logger.error(
            "Failed to get recent transcripts",
            extra={"channel_id": channel_id, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail="Failed to get transcripts")


@router.get(
    "/live/{channel_id}/search/status",
    response_model=IndexStatusResponse,
)
@limiter.limit("60/minute")
async def get_index_status(
    request: Request,
    channel_id: str,
    current_user: User = Depends(get_current_user),
):
    """Check if search indexing is active for a channel."""
    validate_id(channel_id, "channel_id")
    try:
        service = get_search_index_service()
        active_channels = service.get_active_channels()
        is_indexing = channel_id in active_channels

        since = datetime.utcnow() - timedelta(hours=24)
        count = await LiveTranscriptIndex.find(
            {"channel_id": channel_id, "created_at": {"$gte": since}}
        ).count()

        config = settings.olorin.search_index
        return IndexStatusResponse(
            channel_id=channel_id,
            is_indexing=is_indexing,
            indexed_count=count,
            config={
                "enabled": config.enabled,
                "batch_size": config.batch_size,
                "flush_interval": config.flush_interval_seconds,
                "ttl_hours": config.ttl_hours,
            },
        )

    except Exception as e:
        logger.error(
            "Failed to get index status",
            extra={"channel_id": channel_id, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail="Failed to get status")


@router.post("/live/{channel_id}/search/start")
@limiter.limit("10/minute")
async def start_indexing(
    request: Request,
    channel_id: str,
    current_user: User = Depends(get_current_user),
):
    """Start search indexing for a channel (admin only)."""
    validate_id(channel_id, "channel_id")
    if not current_user.is_admin_user():
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        service = get_search_index_service()
        await service.start_indexing(channel_id)

        logger.info(
            "Indexing started",
            extra={"channel_id": channel_id, "user_id": str(current_user.id)},
        )

        return {"status": "started", "channel_id": channel_id}

    except Exception as e:
        logger.error(
            "Failed to start indexing",
            extra={"channel_id": channel_id, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail="Failed to start indexing")


@router.post("/live/{channel_id}/search/stop")
@limiter.limit("10/minute")
async def stop_indexing(
    request: Request,
    channel_id: str,
    current_user: User = Depends(get_current_user),
):
    """Stop search indexing for a channel (admin only)."""
    validate_id(channel_id, "channel_id")
    if not current_user.is_admin_user():
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        service = get_search_index_service()
        await service.stop_indexing(channel_id)

        logger.info(
            "Indexing stopped",
            extra={"channel_id": channel_id, "user_id": str(current_user.id)},
        )

        return {"status": "stopped", "channel_id": channel_id}

    except Exception as e:
        logger.error(
            "Failed to stop indexing",
            extra={"channel_id": channel_id, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail="Failed to stop indexing")
