"""
User System Widget Routes - Browse and subscribe to system widgets

Enables the opt-in model where users can browse available system widgets
and choose which ones to add to their collection.
"""

from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from app.models.user import User
from app.models.widget import Widget, WidgetType, WidgetPosition
from app.models.user_system_widget import (
    UserSystemWidget,
    UserSystemWidgetPositionUpdate,
    UserSystemWidgetPreferencesUpdate,
)
from app.core.security import get_current_active_user

router = APIRouter()


def _widget_dict(w: Widget, is_added: bool = False, user_prefs: Optional[UserSystemWidget] = None) -> dict:
    """Convert Widget document to API response dict with user subscription info."""
    result = {
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
        # Subscription info
        "is_added": is_added,
    }

    # If user has custom preferences, apply them
    if user_prefs:
        if user_prefs.position:
            result["position"] = {
                "x": user_prefs.position.x,
                "y": user_prefs.position.y,
                "width": user_prefs.position.width,
                "height": user_prefs.position.height,
                "z_index": user_prefs.position.z_index,
            }
        result["is_muted"] = user_prefs.is_muted
        result["is_visible"] = user_prefs.is_visible
        result["order"] = user_prefs.order

    return result


@router.get("/available")
async def get_available_system_widgets(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all available system widgets that user can add.

    Returns all active system widgets with an is_added flag indicating
    whether the user has added each widget to their collection.
    """
    user_id = str(current_user.id)
    user_role = current_user.role or "user"
    user_subscription = getattr(current_user, 'subscription_tier', None)

    # Get all active system widgets
    system_widgets = await Widget.find(
        Widget.type == WidgetType.SYSTEM,
        Widget.is_active == True
    ).sort(Widget.order).to_list()

    # Get user's subscribed widget IDs
    user_subscriptions = await UserSystemWidget.find(
        UserSystemWidget.user_id == user_id
    ).to_list()
    subscribed_ids = {sub.widget_id for sub in user_subscriptions}

    # Filter by role and subscription, add is_added flag
    result = []
    for widget in system_widgets:
        # Check role targeting
        if widget.visible_to_roles:
            if "user" not in widget.visible_to_roles and user_role not in widget.visible_to_roles:
                continue

        # Check subscription tier targeting
        if widget.visible_to_subscription_tiers:
            if not user_subscription or user_subscription not in widget.visible_to_subscription_tiers:
                continue

        is_added = str(widget.id) in subscribed_ids
        result.append(_widget_dict(widget, is_added=is_added))

    return {
        "items": result,
        "total": len(result),
    }


@router.get("/my")
async def get_my_system_widgets(
    page_path: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get user's subscribed system widgets with their preferences applied.

    These are the system widgets the user has explicitly added to their collection.
    """
    user_id = str(current_user.id)

    # Get user's subscriptions
    user_subscriptions = await UserSystemWidget.find(
        UserSystemWidget.user_id == user_id,
        UserSystemWidget.is_visible == True  # Only visible (not closed)
    ).sort(UserSystemWidget.order).to_list()

    if not user_subscriptions:
        return {"items": [], "total": 0}

    # Get the actual widget documents
    widget_ids = [ObjectId(sub.widget_id) for sub in user_subscriptions]
    widgets = await Widget.find(
        {"_id": {"$in": widget_ids}},
        Widget.is_active == True
    ).to_list()

    # Create a lookup for quick access
    widget_lookup = {str(w.id): w for w in widgets}
    sub_lookup = {sub.widget_id: sub for sub in user_subscriptions}

    # Build result with user preferences applied
    result = []
    for sub in user_subscriptions:
        widget = widget_lookup.get(sub.widget_id)
        if not widget:
            continue

        # Check page targeting if specified
        if page_path and widget.target_pages:
            if not any(page_path.startswith(target) for target in widget.target_pages):
                continue

        result.append(_widget_dict(widget, is_added=True, user_prefs=sub))

    return {
        "items": result,
        "total": len(result),
    }


@router.post("/{widget_id}/add")
async def add_system_widget(
    widget_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Add a system widget to user's collection."""
    user_id = str(current_user.id)

    # Verify widget exists and is a system widget
    try:
        widget = await Widget.get(widget_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Widget not found")

    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    if widget.type != WidgetType.SYSTEM:
        raise HTTPException(status_code=400, detail="Can only add system widgets")

    if not widget.is_active:
        raise HTTPException(status_code=400, detail="Widget is not active")

    # Check if already subscribed
    existing = await UserSystemWidget.find_one(
        UserSystemWidget.user_id == user_id,
        UserSystemWidget.widget_id == widget_id
    )
    if existing:
        # Already added, just return success
        return {"message": "Widget already added", "id": str(existing.id)}

    # Get next order number
    last_sub = await UserSystemWidget.find(
        UserSystemWidget.user_id == user_id
    ).sort(-UserSystemWidget.order).first_or_none()
    next_order = (last_sub.order + 1) if last_sub else 0

    # Create subscription
    subscription = UserSystemWidget(
        user_id=user_id,
        widget_id=widget_id,
        is_muted=widget.is_muted,  # Start with widget defaults
        is_visible=True,
        order=next_order,
    )
    await subscription.insert()

    return {
        "message": "Widget added",
        "id": str(subscription.id),
        "widget_id": widget_id,
    }


@router.delete("/{widget_id}/remove")
async def remove_system_widget(
    widget_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Remove a system widget from user's collection."""
    user_id = str(current_user.id)

    # Find the subscription
    subscription = await UserSystemWidget.find_one(
        UserSystemWidget.user_id == user_id,
        UserSystemWidget.widget_id == widget_id
    )

    if not subscription:
        raise HTTPException(status_code=404, detail="Widget not in your collection")

    await subscription.delete()

    return {"message": "Widget removed"}


@router.patch("/{widget_id}/position")
async def update_system_widget_position(
    widget_id: str,
    data: UserSystemWidgetPositionUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update user's custom position for a system widget."""
    user_id = str(current_user.id)

    # Find the subscription
    subscription = await UserSystemWidget.find_one(
        UserSystemWidget.user_id == user_id,
        UserSystemWidget.widget_id == widget_id
    )

    if not subscription:
        raise HTTPException(status_code=404, detail="Widget not in your collection")

    # Update position
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


@router.patch("/{widget_id}/preferences")
async def update_system_widget_preferences(
    widget_id: str,
    data: UserSystemWidgetPreferencesUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update user's preferences for a system widget (mute, visibility, order)."""
    user_id = str(current_user.id)

    # Find the subscription
    subscription = await UserSystemWidget.find_one(
        UserSystemWidget.user_id == user_id,
        UserSystemWidget.widget_id == widget_id
    )

    if not subscription:
        raise HTTPException(status_code=404, detail="Widget not in your collection")

    # Apply updates
    if data.is_muted is not None:
        subscription.is_muted = data.is_muted
    if data.is_visible is not None:
        subscription.is_visible = data.is_visible
    if data.order is not None:
        subscription.order = data.order

    await subscription.save()

    return {"message": "Preferences updated"}


@router.post("/{widget_id}/close")
async def close_system_widget(
    widget_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Close/hide a system widget for the current user."""
    user_id = str(current_user.id)

    # Find the subscription
    subscription = await UserSystemWidget.find_one(
        UserSystemWidget.user_id == user_id,
        UserSystemWidget.widget_id == widget_id
    )

    if not subscription:
        raise HTTPException(status_code=404, detail="Widget not in your collection")

    # Verify widget is closable
    try:
        widget = await Widget.get(widget_id)
        if widget and not widget.is_closable:
            raise HTTPException(status_code=400, detail="Widget cannot be closed")
    except Exception:
        pass

    subscription.is_visible = False
    await subscription.save()

    return {"message": "Widget closed"}


@router.post("/{widget_id}/show")
async def show_system_widget(
    widget_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Show/restore a previously closed system widget."""
    user_id = str(current_user.id)

    # Find the subscription
    subscription = await UserSystemWidget.find_one(
        UserSystemWidget.user_id == user_id,
        UserSystemWidget.widget_id == widget_id
    )

    if not subscription:
        raise HTTPException(status_code=404, detail="Widget not in your collection")

    subscription.is_visible = True
    await subscription.save()

    return {"message": "Widget shown"}
