"""
Admin endpoint for triggering bulk trailer extraction.

Finds all published content with a YouTube trailer_url but no
trailer_stream_url and runs the extraction pipeline.
"""

import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status

from app.api.routes.admin_content_utils import has_permission
from app.models.admin import Permission
from app.models.content import Content
from app.models.user import User
from app.services.trailer_extraction.pipeline import extract_trailer_for_content

router = APIRouter()
logger = logging.getLogger(__name__)


async def _run_extraction_batch(batch_limit: int) -> dict:
    """Run extraction for a batch of content items."""
    candidates = await Content.find(
        Content.is_published == True,  # noqa: E712
        Content.trailer_url != None,  # noqa: E711
        Content.trailer_stream_url == None,  # noqa: E711
    ).limit(batch_limit).to_list()

    results = {"total": len(candidates), "extracted": 0, "failed": 0, "details": []}

    for content in candidates:
        gcs_url = await extract_trailer_for_content(content)
        entry = {
            "content_id": str(content.id),
            "title": content.title,
            "trailer_url": content.trailer_url,
        }
        if gcs_url:
            results["extracted"] += 1
            entry["status"] = "extracted"
            entry["gcs_url"] = gcs_url
        else:
            results["failed"] += 1
            entry["status"] = "failed"
        results["details"].append(entry)

    logger.info(
        "Admin trailer extraction batch complete",
        extra={
            "total": results["total"],
            "extracted": results["extracted"],
            "failed": results["failed"],
        },
    )

    return results


@router.post(
    "/trailers/extract",
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_trailer_extraction(
    background_tasks: BackgroundTasks,
    batch_limit: Optional[int] = Query(
        default=None,
        ge=1,
        le=100,
        description="Max trailers to extract in this batch",
    ),
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """
    Trigger bulk trailer extraction for content missing GCS trailers.

    Runs in the background and returns immediately with 202 Accepted.
    """
    from app.core.config import settings

    limit = batch_limit if batch_limit is not None else settings.TRAILER_EXTRACTION_BATCH_LIMIT

    background_tasks.add_task(_run_extraction_batch, limit)

    logger.info(
        "Trailer extraction triggered by admin",
        extra={
            "admin_id": str(current_user.id),
            "batch_limit": limit,
        },
    )

    return {
        "status": "accepted",
        "batch_limit": limit,
        "message": "Trailer extraction started in background",
    }
