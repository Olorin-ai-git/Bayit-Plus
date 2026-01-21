"""
Chat Content Resolution Endpoints - Hebronics, content resolution, and voice search

Endpoints for processing mixed-language input, resolving content names,
and handling voice search queries.
"""

from fastapi import APIRouter, Depends

from app.core.security import get_current_active_user
from app.models.content import Content, LiveChannel, Podcast
from app.models.user import User

from .helpers import process_hebronics_input
from .models import (HebronicsRequest, HebronicsResponse,
                     ResolveContentRequest, ResolveContentResponse,
                     ResolvedContentItem, VoiceSearchRequest,
                     VoiceSearchResponse)
from .services import resolve_single_content

router = APIRouter()


@router.post("/hebronics", response_model=HebronicsResponse)
async def process_hebronics(
    request: HebronicsRequest,
    current_user: User = Depends(get_current_active_user),
) -> HebronicsResponse:
    """Process Hebronics (Hebrew-English mixed) input."""
    result = await process_hebronics_input(request.text)
    return HebronicsResponse(**result)


@router.post("/resolve-content", response_model=ResolveContentResponse)
async def resolve_content(
    request: ResolveContentRequest,
    current_user: User = Depends(get_current_active_user),
) -> ResolveContentResponse:
    """Resolve multiple content items by name for voice commands."""
    resolved_items: list[ResolvedContentItem] = []
    unresolved: list[str] = []

    for item in request.items:
        result = await resolve_single_content(
            name=item.name, content_type=item.type, language=request.language
        )

        if result:
            resolved_items.append(result)
            print(
                f"[CHAT] Resolved '{item.name}' -> '{result.name}' "
                f"(type={result.type}, confidence={result.confidence:.2f})"
            )
        else:
            unresolved.append(item.name)
            print(f"[CHAT] Could not resolve: '{item.name}'")

    return ResolveContentResponse(
        items=resolved_items,
        unresolved=unresolved,
        total_requested=len(request.items),
        total_resolved=len(resolved_items),
    )


@router.post("/voice-search", response_model=VoiceSearchResponse)
async def voice_search(
    request: VoiceSearchRequest,
    current_user: User = Depends(get_current_active_user),
) -> VoiceSearchResponse:
    """Process voice search with Hebronics support."""
    processed = await process_hebronics_input(request.transcript)

    search_results: list[dict] = []

    if processed.get("intent") in ["search", "browse", "play"]:
        content_type = processed.get("content_type", "any")

        if content_type in ["any", "movie", "series"]:
            vod_results = (
                await Content.find(Content.is_published == True)  # noqa: E712
                .limit(6)
                .to_list()
            )

            search_results.extend(
                [
                    {
                        "id": str(item.id),
                        "title": item.title,
                        "description": item.description,
                        "thumbnail": item.thumbnail,
                        "type": "vod",
                        "content_type": item.content_type,
                    }
                    for item in vod_results
                ]
            )

        if content_type in ["any", "channel"]:
            channels = (
                await LiveChannel.find(LiveChannel.is_active == True)  # noqa: E712
                .limit(4)
                .to_list()
            )

            search_results.extend(
                [
                    {
                        "id": str(ch.id),
                        "title": ch.name,
                        "description": ch.description,
                        "thumbnail": ch.logo,
                        "type": "live",
                    }
                    for ch in channels
                ]
            )

        if content_type in ["any", "podcast"]:
            podcasts = (
                await Podcast.find(Podcast.is_published == True)  # noqa: E712
                .limit(4)
                .to_list()
            )

            search_results.extend(
                [
                    {
                        "id": str(pod.id),
                        "title": pod.title,
                        "description": pod.description,
                        "thumbnail": pod.thumbnail,
                        "type": "podcast",
                    }
                    for pod in podcasts
                ]
            )

    return VoiceSearchResponse(
        original_transcript=request.transcript,
        normalized_query=processed.get("normalized", request.transcript),
        intent=processed.get("intent"),
        keywords=processed.get("keywords", []),
        content_type=processed.get("content_type"),
        genre=processed.get("genre"),
        search_results=search_results,
    )
