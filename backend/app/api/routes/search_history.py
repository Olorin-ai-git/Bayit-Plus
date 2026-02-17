"""
Search History API Routes.

Provides CRUD endpoints for user search history:
- GET /search/history - Fetch user's recent searches
- POST /search/history - Save a search query
- DELETE /search/history - Clear all or remove single item
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.search_history import SearchHistory
from app.models.user import User

router = APIRouter(prefix="/search", tags=["search", "history"])
logger = get_logger(__name__)


class SaveSearchRequest(BaseModel):
    """Request body for saving a search query."""

    query: str = Field(..., min_length=1, max_length=200)
    content_type: Optional[str] = None


@router.get("/history")
async def get_search_history(
    limit: int = Query(
        default=20,
        ge=1,
        le=50,
        description="Maximum history entries to return",
    ),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's recent search history."""
    try:
        queries = await SearchHistory.get_user_history(
            user_id=str(current_user.id),
            limit=limit,
        )
        return {"history": queries}
    except Exception as e:
        logger.error(
            "Failed to get search history",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve search history",
        )


@router.post("/history", status_code=status.HTTP_201_CREATED)
async def save_search_history(
    request: SaveSearchRequest,
    current_user: User = Depends(get_current_user),
):
    """Save a search query to user history."""
    try:
        await SearchHistory.save_query(
            user_id=str(current_user.id),
            query=request.query.strip(),
            content_type_filter=request.content_type,
        )
        return {"success": True}
    except Exception as e:
        logger.error(
            "Failed to save search history",
            extra={
                "user_id": str(current_user.id),
                "query": request.query,
                "error": str(e),
            },
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save search history",
        )


@router.delete("/history")
async def delete_search_history(
    q: Optional[str] = Query(
        default=None,
        description="Specific query to remove. Omit to clear all.",
    ),
    current_user: User = Depends(get_current_user),
):
    """Clear all search history or remove a single entry."""
    try:
        if q:
            removed = await SearchHistory.remove_query(
                user_id=str(current_user.id),
                query=q,
            )
            return {"removed": removed, "query": q}

        removed = await SearchHistory.clear_user_history(
            user_id=str(current_user.id),
        )
        return {"removed": removed}
    except Exception as e:
        logger.error(
            "Failed to delete search history",
            extra={
                "user_id": str(current_user.id),
                "query": q,
                "error": str(e),
            },
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete search history",
        )
