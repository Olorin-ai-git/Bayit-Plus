"""
Librarian series linking endpoints.

Handles episode linking to series and duplicate resolution.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.admin import require_admin
from app.api.routes.librarian.models import (LinkEpisodeRequest,
                                             ResolveDuplicatesRequest)
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/admin/librarian/unlinked-episodes")
async def get_unlinked_episodes(
    limit: int = 100, current_user: User = Depends(require_admin())
):
    """
    Get episodes that are not linked to any parent series.
    """
    try:
        from app.services.series_linker_service import \
            get_series_linker_service

        service = get_series_linker_service()
        unlinked = await service.find_unlinked_episodes(limit=limit)

        return {
            "total": len(unlinked),
            "episodes": [
                {
                    "content_id": ep.content_id,
                    "title": ep.title,
                    "title_en": ep.title_en,
                    "extracted_series_name": ep.extracted_series_name,
                    "season": ep.season,
                    "episode": ep.episode,
                    "created_at": ep.created_at.isoformat() if ep.created_at else None,
                }
                for ep in unlinked
            ],
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get unlinked episodes: {str(e)}",
        )


@router.post("/admin/librarian/link-episode")
async def link_episode_to_series(
    request: LinkEpisodeRequest, current_user: User = Depends(require_admin())
):
    """
    Manually link an episode to its parent series.
    """
    try:
        from app.services.series_linker_service import \
            get_series_linker_service

        service = get_series_linker_service()
        result = await service.link_episode_to_series(
            episode_id=request.episode_id,
            series_id=request.series_id,
            season=request.season,
            episode_num=request.episode,
            audit_id=None,
            dry_run=request.dry_run,
            reason=request.reason or "Manual linking by admin",
        )

        if result.success:
            return {
                "success": True,
                "episode_id": result.episode_id,
                "series_id": result.series_id,
                "series_title": result.series_title,
                "action": result.action,
                "dry_run": result.dry_run,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error or "Failed to link episode",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to link episode: {str(e)}",
        )


@router.get("/admin/librarian/duplicate-episodes")
async def get_duplicate_episodes(
    series_id: Optional[str] = None, current_user: User = Depends(require_admin())
):
    """
    Get groups of duplicate episodes (same series + season + episode).
    """
    try:
        from app.services.series_linker_service import \
            get_series_linker_service

        service = get_series_linker_service()
        duplicates = await service.find_duplicate_episodes(series_id=series_id)

        return {
            "total_groups": len(duplicates),
            "groups": [
                {
                    "series_id": group.series_id,
                    "series_title": group.series_title,
                    "season": group.season,
                    "episode": group.episode,
                    "episode_count": len(group.episode_ids),
                    "episode_ids": group.episode_ids,
                    "episode_titles": group.episode_titles,
                    "file_sizes": group.file_sizes,
                    "resolutions": group.resolutions,
                }
                for group in duplicates
            ],
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get duplicate episodes: {str(e)}",
        )


@router.post("/admin/librarian/resolve-duplicate-episodes")
async def resolve_duplicate_episodes(
    request: ResolveDuplicatesRequest, current_user: User = Depends(require_admin())
):
    """
    Resolve a group of duplicate episodes by keeping one and unpublishing/deleting the others.
    """
    try:
        from app.services.series_linker_service import \
            get_series_linker_service

        service = get_series_linker_service()
        result = await service.resolve_duplicate_episode_group(
            episode_ids=request.episode_ids,
            keep_id=request.keep_id,
            action=request.action,
            audit_id=None,
            dry_run=request.dry_run,
            reason=request.reason or "Manual resolution by admin",
        )

        return {
            "success": result.success,
            "duplicates_found": result.duplicates_found,
            "duplicates_resolved": result.duplicates_resolved,
            "kept_episode_ids": result.kept_episode_ids,
            "removed_episode_ids": result.removed_episode_ids,
            "dry_run": result.dry_run,
            "errors": result.errors,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve duplicates: {str(e)}",
        )
