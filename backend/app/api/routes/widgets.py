"""
User Widget Routes - Personal widget management and system widget retrieval

System widgets now use an opt-in subscription model. Users must explicitly
add system widgets to their collection via /widgets/system/add.
"""

from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_active_user, get_optional_user
from app.models.user import User
from app.models.user_system_widget import UserSystemWidget
from app.models.widget import (Widget, WidgetContent, WidgetCreateRequest,
                               WidgetPosition, WidgetPositionUpdate,
                               WidgetType, WidgetUpdateRequest)

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
        "is_minimized": w.is_minimized,
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
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get all widgets applicable to current user.

    Returns:
    - System widgets the user has explicitly added to their collection
    - Personal widgets created by user (if authenticated)

    System widgets use an opt-in model - users must add widgets via
    /widgets/system/{id}/add before they appear here.

    Optionally filter by page path for targeted widgets.
    Works without authentication (returns empty for unauthenticated users).
    """
    user_id = str(current_user.id) if current_user else None

    if not user_id:
        # Unauthenticated users don't see any widgets
        return {"items": [], "total": 0}

    # Get personal widgets for this user
    personal_widgets = (
        await Widget.find(
            Widget.type == WidgetType.PERSONAL,
            Widget.user_id == user_id,
            Widget.is_active == True,
        )
        .sort(Widget.order)
        .to_list()
    )

    # Get user's subscribed system widgets
    user_subscriptions = (
        await UserSystemWidget.find(
            UserSystemWidget.user_id == user_id,
            UserSystemWidget.is_visible == True,  # Only visible (not closed)
        )
        .sort(UserSystemWidget.order)
        .to_list()
    )

    # Build list of subscribed system widgets
    subscribed_system_widgets = []
    if user_subscriptions:
        # Get the actual widget documents
        widget_ids = [ObjectId(sub.widget_id) for sub in user_subscriptions]
        system_widgets = await Widget.find(
            {"_id": {"$in": widget_ids}}, Widget.is_active == True
        ).to_list()

        # Create lookup for widget documents and subscriptions
        widget_lookup = {str(w.id): w for w in system_widgets}
        sub_lookup = {sub.widget_id: sub for sub in user_subscriptions}

        # Build result with user preferences applied
        for sub in user_subscriptions:
            widget = widget_lookup.get(sub.widget_id)
            if not widget:
                continue

            # Check page targeting if specified
            if page_path and widget.target_pages:
                if not any(
                    page_path.startswith(target) for target in widget.target_pages
                ):
                    continue

            # Create widget dict with user's preferences applied
            widget_data = _widget_dict(widget)

            # Apply user's custom preferences
            if sub.position:
                widget_data["position"] = {
                    "x": sub.position.x,
                    "y": sub.position.y,
                    "width": sub.position.width,
                    "height": sub.position.height,
                    "z_index": sub.position.z_index,
                }
            widget_data["is_muted"] = sub.is_muted
            widget_data["is_visible"] = sub.is_visible
            widget_data["is_minimized"] = sub.is_minimized

            subscribed_system_widgets.append(widget_data)

    # Combine and return - system widgets first, then personal
    all_widgets = subscribed_system_widgets + [
        _widget_dict(w) for w in personal_widgets
    ]

    return {
        "items": all_widgets,
        "total": len(all_widgets),
    }


@router.get("/{widget_id}")
async def get_widget(
    widget_id: str, current_user: User = Depends(get_current_active_user)
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
    data: WidgetCreateRequest, current_user: User = Depends(get_current_active_user)
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
    current_user: User = Depends(get_current_active_user),
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
    if data.is_minimized is not None:
        widget.is_minimized = data.is_minimized
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
    widget_id: str, current_user: User = Depends(get_current_active_user)
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
    current_user: User = Depends(get_current_active_user),
):
    """
    Update widget position (lightweight endpoint for drag operations).

    For personal widgets: updates the widget directly.
    For system widgets: updates user's custom position in UserSystemWidget.
    """
    user_id = str(current_user.id)

    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    if widget.type == WidgetType.PERSONAL:
        # For personal widgets, only owner can update
        if widget.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Update position directly on widget
        widget.position.x = data.x
        widget.position.y = data.y
        if data.width is not None:
            widget.position.width = data.width
        if data.height is not None:
            widget.position.height = data.height

        widget.updated_at = datetime.utcnow()
        await widget.save()
    else:
        # For system widgets, update user's subscription preference
        subscription = await UserSystemWidget.find_one(
            UserSystemWidget.user_id == user_id, UserSystemWidget.widget_id == widget_id
        )

        if not subscription:
            # Auto-create subscription if it doesn't exist
            # This provides seamless UX - users can interact with system widgets immediately
            subscription = UserSystemWidget(
                user_id=user_id,
                widget_id=widget_id,
                is_minimized=widget.is_minimized,
                is_muted=widget.is_muted,
                is_visible=True,
                position=WidgetPosition(
                    x=data.x,
                    y=data.y,
                    width=data.width if data.width is not None else widget.position.width,
                    height=data.height if data.height is not None else widget.position.height,
                    z_index=widget.position.z_index,
                ),
                order=widget.order,
                added_at=datetime.utcnow(),
            )
            await subscription.insert()
        else:
            # Initialize position if needed
            if not subscription.position:
                subscription.position = WidgetPosition()

            subscription.position.x = data.x
            subscription.position.y = data.y
            if data.width is not None:
                subscription.position.width = data.width
            if data.height is not None:
                subscription.position.height = data.height

            await subscription.save()

    return {"message": "Position updated"}


@router.post("/{widget_id}/close")
async def close_widget(
    widget_id: str, current_user: User = Depends(get_current_active_user)
):
    """
    Close/hide a widget for the current user.

    For personal widgets: sets is_visible to false on the widget.
    For system widgets: sets is_visible to false on user's subscription.
    """
    user_id = str(current_user.id)

    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget.is_closable:
        raise HTTPException(status_code=400, detail="Widget cannot be closed")

    if widget.type == WidgetType.PERSONAL:
        # For personal widgets, update visibility on the widget itself
        if widget.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        widget.is_visible = False
        widget.updated_at = datetime.utcnow()
        await widget.save()
    else:
        # For system widgets, update user's subscription
        subscription = await UserSystemWidget.find_one(
            UserSystemWidget.user_id == user_id, UserSystemWidget.widget_id == widget_id
        )

        if not subscription:
            # Auto-create subscription if it doesn't exist (though closing immediately)
            # This ensures the state is persisted correctly
            subscription = UserSystemWidget(
                user_id=user_id,
                widget_id=widget_id,
                is_minimized=widget.is_minimized,
                is_muted=widget.is_muted,
                is_visible=False,  # Closing it
                position=widget.position,
                order=widget.order,
                added_at=datetime.utcnow(),
            )
            await subscription.insert()
        else:
            subscription.is_visible = False
            await subscription.save()

    return {"message": "Widget closed"}


@router.post("/{widget_id}/minimize")
async def toggle_widget_minimize(
    widget_id: str,
    is_minimized: bool,
    current_user: User = Depends(get_current_active_user),
):
    """
    Toggle widget minimized state for the current user.

    For personal widgets: updates is_minimized on the widget.
    For system widgets: updates is_minimized on user's subscription.
    """
    user_id = str(current_user.id)

    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    if widget.type == WidgetType.PERSONAL:
        # For personal widgets, update minimized state on the widget itself
        if widget.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        widget.is_minimized = is_minimized
        widget.updated_at = datetime.utcnow()
        await widget.save()
    else:
        # For system widgets, update user's subscription
        subscription = await UserSystemWidget.find_one(
            UserSystemWidget.user_id == user_id, UserSystemWidget.widget_id == widget_id
        )

        if not subscription:
            # Auto-create subscription if it doesn't exist
            # This provides seamless UX - users can interact with system widgets immediately
            subscription = UserSystemWidget(
                user_id=user_id,
                widget_id=widget_id,
                is_minimized=is_minimized,
                is_muted=widget.is_muted,
                is_visible=True,
                position=widget.position,
                order=widget.order,
                added_at=datetime.utcnow(),
            )
            await subscription.insert()
        else:
            subscription.is_minimized = is_minimized
            await subscription.save()

    return {"message": f"Widget {'minimized' if is_minimized else 'restored'}"}
