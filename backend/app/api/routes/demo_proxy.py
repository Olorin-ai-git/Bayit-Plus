"""
Demo Portal Proxy Routes

Endpoints for demo.olorin.ai that accept Firebase Bearer tokens
instead of B2B API keys. Delegates to internal services directly.

Routes:
  POST /api/v1/demo/validate-code  — validate a private demo access code
  POST /api/v1/demo/search         — dialogue search (Firebase-authed)
  POST /api/v1/demo/recap          — content recap (Firebase-authed)
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.demo_proxy_schemas import (DemoRecapRequest,
                                               DemoRecapResponse,
                                               DemoSearchRequest,
                                               DemoSearchResponse,
                                               DemoSearchResultItem,
                                               ValidateCodeRequest,
                                               ValidateCodeResponse)
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.content_embedding import DialogueSearchQuery
from app.models.demo_code import DemoCode
from app.models.subtitles import SubtitleTrackDoc
from app.models.user import User
from app.services.olorin.recap_agent_service import recap_agent_service
from app.services.olorin.vector_search_service import vector_search_service

logger = get_logger(__name__)

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post(
    "/validate-code",
    response_model=ValidateCodeResponse,
    summary="Validate a private demo access code",
)
async def validate_demo_code(
    request: ValidateCodeRequest,
    _user: User = Depends(get_current_user),
) -> ValidateCodeResponse:
    """Look up code, verify expiry and max_uses, increment use_count."""
    demo_code = await DemoCode.find_one({"code": request.code})
    if not demo_code:
        return ValidateCodeResponse(valid=False)

    now = datetime.now(timezone.utc)
    expires_at = demo_code.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now:
        return ValidateCodeResponse(valid=False)

    if demo_code.max_uses is not None and demo_code.use_count >= demo_code.max_uses:
        return ValidateCodeResponse(valid=False)

    demo_code.use_count += 1
    await demo_code.save()

    return ValidateCodeResponse(valid=True, unlocked_content=demo_code.content_ids)


@router.post(
    "/search",
    response_model=DemoSearchResponse,
    summary="Dialogue search within demo content (Firebase-authed)",
)
async def demo_search(
    request: DemoSearchRequest,
    _user: User = Depends(get_current_user),
) -> DemoSearchResponse:
    """Delegate to vector_search_service scoped to a single content_id."""
    try:
        query = DialogueSearchQuery(
            query=request.query,
            language=request.language,
            content_id=request.content_id,
            limit=request.limit,
            min_score=request.min_score,
        )
        results = await vector_search_service.dialogue_search(query=query)

        items: List[DemoSearchResultItem] = []
        for r in results:
            deep_link = None
            if r.timestamp_seconds is not None:
                deep_link = f"/watch/{r.content_id}?t={int(r.timestamp_seconds)}"
            items.append(
                DemoSearchResultItem(
                    content_id=r.content_id,
                    title=r.title,
                    matched_text=r.matched_text,
                    match_type=r.match_type,
                    relevance_score=r.relevance_score,
                    timestamp_seconds=r.timestamp_seconds,
                    timestamp_formatted=r.timestamp_formatted,
                    deep_link=deep_link,
                )
            )

        return DemoSearchResponse(
            query=request.query, results=items, total_results=len(items)
        )

    except Exception as e:
        logger.error(
            "Demo search failed",
            extra={"content_id": request.content_id, "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed. Please try again.",
        )


@router.post(
    "/recap",
    response_model=DemoRecapResponse,
    summary="Generate content recap (Firebase-authed)",
)
async def demo_recap(
    request: DemoRecapRequest,
    _user: User = Depends(get_current_user),
) -> DemoRecapResponse:
    """Feed subtitle cues into recap_agent_service and return the summary."""
    try:
        track = await SubtitleTrackDoc.find_one(
            {"content_id": request.content_id, "language": "he"}
        )
        if track is None:
            track = await SubtitleTrackDoc.find_one({"content_id": request.content_id})

        if track is None or not track.cues:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No subtitle track found for this content.",
            )

        session = await recap_agent_service.create_session(partner_id=None)
        for cue in track.cues:
            await recap_agent_service.add_transcript_segment(
                session_id=session.session_id,
                text=cue.text,
                timestamp=cue.start_time,
                language=track.language,
            )

        result = await recap_agent_service.generate_recap(
            session_id=session.session_id,
            target_language=request.target_language,
        )
        await recap_agent_service.end_session(session.session_id)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Recap generation failed.",
            )

        return DemoRecapResponse(
            content_id=request.content_id,
            summary=result["summary"],
            key_points=result["key_points"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Demo recap failed",
            extra={"content_id": request.content_id, "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Recap failed. Please try again.",
        )
