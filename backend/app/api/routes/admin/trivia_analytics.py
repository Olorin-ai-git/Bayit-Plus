"""
Trivia Analytics Admin Endpoints

Provides monitoring dashboards for the live trivia feature:
stats, topics, sessions, and content coverage.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api.routes.admin.auth import has_permission
from app.core.logging_config import get_logger
from app.models.admin import Permission
from app.models.user import User
from app.services.admin import trivia_analytics_service as service

router = APIRouter(
    prefix="/admin/trivia/analytics",
    tags=["admin-trivia-analytics"],
)
logger = get_logger(__name__)


@router.get("/stats")
async def get_trivia_stats(
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
) -> dict:
    """Aggregate trivia statistics for dashboard."""
    return await service.get_stats()


@router.get("/topics")
async def get_recent_topics(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
) -> dict:
    """Paginated list of recently detected trivia topics."""
    return await service.get_recent_topics(limit=limit, offset=offset)


@router.get("/sessions")
async def get_trivia_sessions(
    status: Optional[str] = Query(None, pattern="^(active|ended)$"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
) -> list[dict]:
    """Get active or recent trivia sessions."""
    return await service.get_sessions(status=status, limit=limit)


@router.get("/content-coverage")
async def get_content_coverage(
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
) -> dict:
    """ContentTrivia enrichment statistics."""
    return await service.get_content_coverage()
