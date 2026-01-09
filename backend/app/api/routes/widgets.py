"""
User Widget Routes - Personal widget management and system widget retrieval
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query

from app.models.user import User
from app.models.widget import (
    Widget, WidgetType, WidgetContent, WidgetPosition,
    WidgetCreateRequest, WidgetUpdateRequest, WidgetPositionUpdate
)
from app.core.security import get_current_active_user, get_optional_user

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


@router.get("")
async def get_my_widgets(
    page_path: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get all widgets applicable to current user.

    Returns:
    - System widgets matching user's role and subscription
    - Personal widgets created by user (if authenticated)

    Optionally filter by page path for targeted widgets.
    Works without authentication (returns only public system widgets).
    """
    user_id = str(current_user.id) if current_user else None
    user_role = (current_user.role if current_user else None) or "user"
    user_subscription = getattr(current_user, 'subscription_tier', None) if current_user else None

    # Get personal widgets for this user (only if authenticated)
    personal_widgets = []
    if user_id:
        personal_widgets = await Widget.find(
            Widget.type == WidgetType.PERSONAL,
            Widget.user_id == user_id,
            Widget.is_active == True
        ).sort(Widget.order).to_list()

    # Get system widgets
    system_widgets = await Widget.find(
        Widget.type == WidgetType.SYSTEM,
        Widget.is_active == True
    ).sort(Widget.order).to_list()

    # Filter system widgets by role and subscription
    filtered_system = []
    for widget in system_widgets:
        # Check role targeting - if "user" is in visible_to_roles, show to everyone
        if widget.visible_to_roles:
            if "user" not in widget.visible_to_roles and user_role not in widget.visible_to_roles:
                continue

        # Check subscription tier targeting (if specified)
        if widget.visible_to_subscription_tiers:
            if not user_subscription or user_subscription not in widget.visible_to_subscription_tiers:
                continue

        # Check page targeting (if specified and page_path provided)
        if page_path and widget.target_pages:
            # Match if page_path starts with any target page
            if not any(page_path.startswith(target) for target in widget.target_pages):
                continue

        filtered_system.append(widget)

    # Combine and return
    all_widgets = filtered_system + personal_widgets

    return {
        "items": [_widget_dict(w) for w in all_widgets],
        "total": len(all_widgets),
    }


@router.get("/{widget_id}")
async def get_widget(
    widget_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific widget by ID."""
    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    # Personal widgets: only owner can view
    if widget.type == WidgetType.PERSONAL:
        if widget.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")

    return _widget_dict(widget)


@router.post("")
async def create_personal_widget(
    data: WidgetCreateRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new personal widget for the current user."""
    widget = Widget(
        type=WidgetType.PERSONAL,
        user_id=str(current_user.id),
        title=data.title,
        description=data.description,
        icon=data.icon,
        content=data.content,
        position=data.position or WidgetPosition(),
        is_muted=data.is_muted,
        is_closable=data.is_closable,
        is_draggable=data.is_draggable,
        # Personal widgets don't use targeting - visible only to owner
        visible_to_roles=[],
        visible_to_subscription_tiers=[],
        target_pages=data.target_pages,  # Can still target specific pages
        order=data.order,
        created_by=str(current_user.id),
    )

    await widget.insert()

    return {"id": str(widget.id), "title": widget.title}


@router.patch("/{widget_id}")
async def update_personal_widget(
    widget_id: str,
    data: WidgetUpdateRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Update a personal widget (owner only)."""
    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    # Only owner can update personal widgets
    if widget.type == WidgetType.PERSONAL:
        if widget.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        # Users cannot update system widgets
        raise HTTPException(status_code=403, detail="Cannot modify system widgets")

    # Apply updates
    if data.title is not None:
        widget.title = data.title
    if data.description is not None:
        widget.description = data.description
    if data.icon is not None:
        widget.icon = data.icon
    if data.content is not None:
        widget.content = data.content
    if data.position is not None:
        widget.position = data.position
    if data.is_active is not None:
        widget.is_active = data.is_active
    if data.is_muted is not None:
        widget.is_muted = data.is_muted
    if data.is_visible is not None:
        widget.is_visible = data.is_visible
    if data.is_closable is not None:
        widget.is_closable = data.is_closable
    if data.is_draggable is not None:
        widget.is_draggable = data.is_draggable
    if data.target_pages is not None:
        widget.target_pages = data.target_pages
    if data.order is not None:
        widget.order = data.order

    widget.updated_at = datetime.utcnow()
    await widget.save()

    return {"message": "Widget updated", "id": widget_id}


@router.delete("/{widget_id}")
async def delete_personal_widget(
    widget_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a personal widget (owner only)."""
    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    # Only owner can delete personal widgets
    if widget.type == WidgetType.PERSONAL:
        if widget.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        # Users cannot delete system widgets
        raise HTTPException(status_code=403, detail="Cannot delete system widgets")

    await widget.delete()

    return {"message": "Widget deleted"}


@router.post("/{widget_id}/position")
async def update_widget_position(
    widget_id: str,
    data: WidgetPositionUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update widget position (lightweight endpoint for drag operations).

    Works for both personal and system widgets - stores user's position preference.
    For now, updates the widget directly. Future enhancement could store per-user preferences.
    """
    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    # For personal widgets, only owner can update
    if widget.type == WidgetType.PERSONAL:
        if widget.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")

    # Update position
    widget.position.x = data.x
    widget.position.y = data.y
    if data.width is not None:
        widget.position.width = data.width
    if data.height is not None:
        widget.position.height = data.height

    widget.updated_at = datetime.utcnow()
    await widget.save()

    return {"message": "Position updated"}


@router.post("/{widget_id}/close")
async def close_widget(
    widget_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Close/hide a widget for the current user.

    For personal widgets: sets is_visible to false.
    For system widgets: future enhancement could store per-user state.
    """
    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget.is_closable:
        raise HTTPException(status_code=400, detail="Widget cannot be closed")

    # For personal widgets, update visibility
    if widget.type == WidgetType.PERSONAL:
        if widget.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        widget.is_visible = False
        widget.updated_at = datetime.utcnow()
        await widget.save()

    # For system widgets, we could store per-user state in future
    # For now, just return success (frontend handles local state)

    return {"message": "Widget closed"}
