"""
Admin Widget Management Routes - CRUD operations for system widgets
"""

from datetime import datetime
from typing import List, Optional

from app.models.admin import AuditAction, Permission
from app.models.user import User
from app.models.widget import (
    Widget,
    WidgetContent,
    WidgetCreateRequest,
    WidgetPosition,
    WidgetResponse,
    WidgetType,
    WidgetUpdateRequest,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from .admin_content_utils import has_permission, log_audit

router = APIRouter()


def _widget_dict(w: Widget) -> dict:
    """Convert Widget document to API response dict."""
    return {
        "id": str(w.id),
        "type": w.type.value,
        "user_id": w.user_id,
        "title": w.title,
        "description": w.description,
        "icon": w.icon,
        "content": {
            "content_type": w.content.content_type.value,
            "live_channel_id": w.content.live_channel_id,
            "podcast_id": w.content.podcast_id,
            "content_id": w.content.content_id,
            "station_id": w.content.station_id,
            "iframe_url": w.content.iframe_url,
            "iframe_title": w.content.iframe_title,
        },
        "position": {
            "x": w.position.x,
            "y": w.position.y,
            "width": w.position.width,
            "height": w.position.height,
            "z_index": w.position.z_index,
        },
        "is_active": w.is_active,
        "is_muted": w.is_muted,
        "is_visible": w.is_visible,
        "is_closable": w.is_closable,
        "is_draggable": w.is_draggable,
        "visible_to_roles": w.visible_to_roles,
        "visible_to_subscription_tiers": w.visible_to_subscription_tiers,
        "target_pages": w.target_pages,
        "order": w.order,
        "created_by": w.created_by,
        "created_at": w.created_at.isoformat(),
        "updated_at": w.updated_at.isoformat(),
    }


@router.get("/widgets")
async def get_widgets(
    widget_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, le=500),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get all widgets with pagination and filters."""
    query = Widget.find()

    # Filter by type (system/personal)
    if widget_type:
        query = query.find(Widget.type == widget_type)

    # Filter by active status
    if is_active is not None:
        query = query.find(Widget.is_active == is_active)

    total = await query.count()
    items = (
        await query.sort(Widget.order)
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list()
    )

    return {
        "items": [_widget_dict(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/widgets/{widget_id}")
async def get_widget(
    widget_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get single widget by ID."""
    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    return _widget_dict(widget)


@router.post("/widgets")
async def create_widget(
    data: WidgetCreateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Create new system widget."""
    widget = Widget(
        type=WidgetType.SYSTEM,
        title=data.title,
        description=data.description,
        icon=data.icon,
        content=data.content,
        position=data.position or WidgetPosition(),
        is_muted=data.is_muted,
        is_closable=data.is_closable,
        is_draggable=data.is_draggable,
        visible_to_roles=data.visible_to_roles,
        visible_to_subscription_tiers=data.visible_to_subscription_tiers,
        target_pages=data.target_pages,
        order=data.order,
        created_by=str(current_user.id),
    )

    await widget.insert()

    await log_audit(
        str(current_user.id),
        AuditAction.WIDGET_CREATED,
        "widget",
        str(widget.id),
        {"title": widget.title, "type": widget.type.value},
        request,
    )

    return {"id": str(widget.id), "title": widget.title}


@router.patch("/widgets/{widget_id}")
async def update_widget(
    widget_id: str,
    data: WidgetUpdateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Update widget fields."""
    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    changes = {}

    if data.title is not None:
        changes["title"] = {"old": widget.title, "new": data.title}
        widget.title = data.title

    if data.description is not None:
        changes["description"] = {"old": widget.description, "new": data.description}
        widget.description = data.description

    if data.icon is not None:
        changes["icon"] = {"changed": True}
        widget.icon = data.icon

    if data.content is not None:
        changes["content"] = {"changed": True}
        widget.content = data.content

    if data.position is not None:
        changes["position"] = {"changed": True}
        widget.position = data.position

    if data.is_active is not None:
        changes["is_active"] = {"old": widget.is_active, "new": data.is_active}
        widget.is_active = data.is_active

    if data.is_muted is not None:
        changes["is_muted"] = {"old": widget.is_muted, "new": data.is_muted}
        widget.is_muted = data.is_muted

    if data.is_visible is not None:
        changes["is_visible"] = {"old": widget.is_visible, "new": data.is_visible}
        widget.is_visible = data.is_visible

    if data.is_closable is not None:
        changes["is_closable"] = {"old": widget.is_closable, "new": data.is_closable}
        widget.is_closable = data.is_closable

    if data.is_draggable is not None:
        changes["is_draggable"] = {"old": widget.is_draggable, "new": data.is_draggable}
        widget.is_draggable = data.is_draggable

    if data.visible_to_roles is not None:
        changes["visible_to_roles"] = {
            "old": widget.visible_to_roles,
            "new": data.visible_to_roles,
        }
        widget.visible_to_roles = data.visible_to_roles

    if data.visible_to_subscription_tiers is not None:
        changes["visible_to_subscription_tiers"] = {
            "old": widget.visible_to_subscription_tiers,
            "new": data.visible_to_subscription_tiers,
        }
        widget.visible_to_subscription_tiers = data.visible_to_subscription_tiers

    if data.target_pages is not None:
        changes["target_pages"] = {"old": widget.target_pages, "new": data.target_pages}
        widget.target_pages = data.target_pages

    if data.order is not None:
        changes["order"] = {"old": widget.order, "new": data.order}
        widget.order = data.order

    widget.updated_at = datetime.utcnow()
    await widget.save()

    await log_audit(
        str(current_user.id),
        AuditAction.WIDGET_UPDATED,
        "widget",
        widget_id,
        changes,
        request,
    )

    return {"message": "Widget updated", "id": widget_id}


@router.delete("/widgets/{widget_id}")
async def delete_widget(
    widget_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE)),
):
    """Delete widget."""
    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    await log_audit(
        str(current_user.id),
        AuditAction.WIDGET_DELETED,
        "widget",
        widget_id,
        {"title": widget.title},
        request,
    )

    await widget.delete()

    return {"message": "Widget deleted"}


@router.post("/widgets/{widget_id}/publish")
async def publish_widget(
    widget_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Activate/publish a widget."""
    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    widget.is_active = True
    widget.updated_at = datetime.utcnow()
    await widget.save()

    await log_audit(
        str(current_user.id),
        AuditAction.WIDGET_PUBLISHED,
        "widget",
        widget_id,
        {"title": widget.title},
        request,
    )

    return {"message": "Widget published", "id": widget_id}


@router.post("/widgets/{widget_id}/unpublish")
async def unpublish_widget(
    widget_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Deactivate/unpublish a widget."""
    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    widget.is_active = False
    widget.updated_at = datetime.utcnow()
    await widget.save()

    await log_audit(
        str(current_user.id),
        AuditAction.WIDGET_UNPUBLISHED,
        "widget",
        widget_id,
        {"title": widget.title},
        request,
    )

    return {"message": "Widget unpublished", "id": widget_id}


class ReorderRequest(BaseModel):
    """Request body for reordering widgets."""

    order_data: dict  # widget_id -> order position


@router.post("/widgets/reorder")
async def reorder_widgets(
    data: ReorderRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Reorder widgets by dragging (bulk update)."""
    for widget_id, position in data.order_data.items():
        try:
            if widget := await Widget.get(widget_id):
                widget.order = position
                await widget.save()
        except Exception:
            pass

    await log_audit(
        str(current_user.id),
        AuditAction.WIDGET_UPDATED,
        "widget",
        None,
        {"action": "bulk_reorder", "count": len(data.order_data)},
        request,
    )

    return {"message": "Widgets reordered"}
