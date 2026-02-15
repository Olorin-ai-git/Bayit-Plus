"""
Widget Toggle Routes - One-click widget creation/removal from content cards.

Provides toggle and batch-check endpoints for the widget toggle button
that appears on content cards across all pages.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_active_user
from app.models.user import User
from app.models.widget import (
    Widget,
    WidgetContent,
    WidgetContentType,
    WidgetPosition,
    WidgetType,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Mapping from frontend content_type strings to WidgetContentType enum values
CONTENT_TYPE_MAP: Dict[str, WidgetContentType] = {
    "live_channel": WidgetContentType.LIVE_CHANNEL,
    "podcast": WidgetContentType.PODCAST,
    "vod": WidgetContentType.VOD,
    "movie": WidgetContentType.VOD,
    "series": WidgetContentType.VOD,
    "radio": WidgetContentType.RADIO,
    "audiobook": WidgetContentType.AUDIOBOOK,
    "live": WidgetContentType.LIVE,
}

# Mapping from content_type to the WidgetContent field that holds the ID
CONTENT_ID_FIELD_MAP: Dict[str, str] = {
    "live_channel": "live_channel_id",
    "podcast": "podcast_id",
    "vod": "content_id",
    "movie": "content_id",
    "series": "content_id",
    "radio": "station_id",
    "audiobook": "audiobook_id",
    "live": "live_channel_id",
}


class WidgetToggleRequest(BaseModel):
    """Request body for toggling a widget."""

    content_type: str
    content_id: str
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    cover_url: Optional[str] = None


class WidgetToggleResponse(BaseModel):
    """Response for widget toggle operation."""

    exists: bool
    widget_id: Optional[str] = None


class BatchCheckItem(BaseModel):
    """Single item in a batch check request."""

    content_type: str
    content_id: str


class BatchCheckRequest(BaseModel):
    """Request body for batch-checking widget existence."""

    items: List[BatchCheckItem]


class BatchCheckResponse(BaseModel):
    """Response for batch check operation."""

    results: Dict[str, bool]


def _build_content_query(content_type: str, content_id: str) -> dict:
    """Build a MongoDB query to find a widget by content type and ID."""
    widget_content_type = CONTENT_TYPE_MAP.get(content_type)
    if not widget_content_type:
        return {}

    id_field = CONTENT_ID_FIELD_MAP.get(content_type)
    if not id_field:
        return {}

    return {
        "content.content_type": widget_content_type.value,
        f"content.{id_field}": content_id,
    }


@router.post("/widgets/toggle", response_model=WidgetToggleResponse)
async def toggle_widget(
    data: WidgetToggleRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Toggle a personal widget for the current user.

    If a widget for this content exists, delete it and return exists=false.
    If no widget exists, create one and return exists=true.
    """
    user_id = str(current_user.id)

    # Validate content_type
    widget_content_type = CONTENT_TYPE_MAP.get(data.content_type)
    if not widget_content_type:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content_type: {data.content_type}",
        )

    id_field = CONTENT_ID_FIELD_MAP.get(data.content_type)
    if not id_field:
        raise HTTPException(
            status_code=400,
            detail=f"No ID field mapping for content_type: {data.content_type}",
        )

    # Build query to find existing personal widget
    content_query = _build_content_query(data.content_type, data.content_id)
    if not content_query:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot build query for content_type: {data.content_type}",
        )

    # Search for existing personal widget matching this content
    existing = await Widget.find_one(
        {"type": WidgetType.PERSONAL}, 
        {"user_id": user_id}, 
        {"is_active": True}, 
        Widget.is_deleted != True, 
        content_query, 
    )

    if existing:
        # Widget exists - soft delete it (toggle off)
        existing.is_deleted = True
        existing.deleted_at = datetime.utcnow()
        existing.updated_at = datetime.utcnow()
        await existing.save()
        logger.info(
            "Widget toggled off",
            extra={
                "user_id": user_id,
                "content_type": data.content_type,
                "content_id": data.content_id,
            },
        )
        return WidgetToggleResponse(exists=False, widget_id=None)

    # Widget does not exist - create it (toggle on)
    content_kwargs = {
        "content_type": widget_content_type,
        id_field: data.content_id,
    }
    widget_content = WidgetContent(**content_kwargs)

    widget = Widget(
        type=WidgetType.PERSONAL,
        user_id=user_id,
        title=data.title,
        description=data.description,
        icon=data.icon,
        cover_url=data.cover_url,
        content=widget_content,
        position=WidgetPosition(),
        is_closable=True,
        is_draggable=True,
        visible_to_roles=[],
        visible_to_subscription_tiers=[],
        target_pages=[],
        order=0,
        created_by=user_id,
    )

    await widget.insert()

    logger.info(
        "Widget toggled on",
        extra={
            "user_id": user_id,
            "widget_id": str(widget.id),
            "content_type": data.content_type,
            "content_id": data.content_id,
        },
    )

    return WidgetToggleResponse(exists=True, widget_id=str(widget.id))


@router.post("/widgets/check-batch", response_model=BatchCheckResponse)
async def check_batch(
    data: BatchCheckRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Batch-check which content items have personal widgets for the current user.

    Returns a map of "content_type:content_id" -> boolean for each item.
    """
    user_id = str(current_user.id)

    # Fetch all active personal widgets for this user (exclude soft-deleted)
    personal_widgets = await Widget.find(
        {"type": WidgetType.PERSONAL}, 
        {"user_id": user_id}, 
        {"is_active": True}, 
        Widget.is_deleted != True, 
    ).to_list()

    # Build a set of existing widget content keys for fast lookup
    existing_keys: set = set()
    for widget in personal_widgets:
        content = widget.content
        content_type_value = content.content_type.value

        # Map each widget back to its key based on content type and ID field
        if content_type_value == "live_channel" and content.live_channel_id:
            existing_keys.add(f"live_channel:{content.live_channel_id}")
        if content_type_value == "podcast" and content.podcast_id:
            existing_keys.add(f"podcast:{content.podcast_id}")
        if content_type_value == "vod" and content.content_id:
            existing_keys.add(f"vod:{content.content_id}")
        if content_type_value == "radio" and content.station_id:
            existing_keys.add(f"radio:{content.station_id}")
        if content_type_value == "audiobook" and content.audiobook_id:
            existing_keys.add(f"audiobook:{content.audiobook_id}")
        if content_type_value == "live" and content.live_channel_id:
            existing_keys.add(f"live:{content.live_channel_id}")

    # Check each requested item against the existing set
    results: Dict[str, bool] = {}
    for item in data.items:
        key = f"{item.content_type}:{item.content_id}"

        # Normalize: movie/series map to vod for lookup
        lookup_type = item.content_type
        if lookup_type in ("movie", "series"):
            lookup_type = "vod"

        lookup_key = f"{lookup_type}:{item.content_id}"
        results[key] = lookup_key in existing_keys

    return BatchCheckResponse(results=results)
