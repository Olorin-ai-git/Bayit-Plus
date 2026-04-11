"""Shared helpers for training content endpoint guards."""

import logging

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from app.models.content import Content, ProcessingState

logger = logging.getLogger(__name__)


def coerce_content_oid(content_id: str) -> PydanticObjectId:
    """Parse *content_id* into a PydanticObjectId or raise HTTP 404.

    Catches InvalidId, TypeError, and ValueError so callers never expose
    a 422/500 on a malformed ID string.
    """
    try:
        return PydanticObjectId(content_id)
    except (InvalidId, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )


async def load_content_for_partner(
    content_id: str,
    partner_id: str,
    *,
    user_role: str = "admin",
) -> Content:
    """Load and authorise a Content document for a given partner.

    Steps:
    1. Coerce *content_id* to an ObjectId (404 on bad format).
    2. Fetch from DB (404 if missing).
    3. Verify *partner_id* matches (404 on mismatch — no tenant leak).
    4. If *user_role* is not "admin" or "teacher", require
       ``processing_state == READY`` (404 otherwise — matches the list
       endpoint's trainee visibility rule).
    """
    oid = coerce_content_oid(content_id)
    content = await Content.get(oid)
    if not content or content.partner_id != partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )
    if user_role not in ("admin", "teacher"):
        if content.processing_state != ProcessingState.READY:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found",
            )
    return content
