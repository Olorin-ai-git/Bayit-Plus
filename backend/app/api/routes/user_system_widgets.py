"""
User System Widget Routes - Browse and subscribe to system widgets

Enables the opt-in model where users can browse available system widgets
and choose which ones to add to their collection.
"""

from typing import Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.core.logging_config import get_logger
from app.core.security import get_current_active_user, get_optional_user
from app.models.content import Content, LiveChannel, Podcast, RadioStation
from app.models.user import User
from app.models.user_system_widget import (UserSystemWidget,
                                           UserSystemWidgetPositionUpdate,
                                           UserSystemWidgetPreferencesUpdate)
from app.models.widget import Widget, WidgetContentType, WidgetPosition, WidgetType

logger = get_logger(__name__)

router = APIRouter()


async def _resolve_cover_urls(widgets: List[Widget]) -> Dict[str, str]:
    """Resolve cover images from referenced content for a batch of widgets."""
    cover_map: Dict[str, str] = {}

    # Collect IDs by content type for batch fetching
    channel_ids: List[str] = []
    station_ids: List[str] = []
    podcast_ids: List[str] = []
    vod_ids: List[str] = []

    for w in widgets:
        if w.cover_url:
            cover_map[str(w.id)] = w.cover_url
            continue
        if not w.content:
            continue
        ct = w.content.content_type
        if ct in (WidgetContentType.LIVE_CHANNEL, WidgetContentType.LIVE):
            if w.content.live_channel_id:
                channel_ids.append(w.content.live_channel_id)
        elif ct == WidgetContentType.RADIO:
            if w.content.station_id:
                station_ids.append(w.content.station_id)
        elif ct == WidgetContentType.PODCAST:
            if w.content.podcast_id:
                podcast_ids.append(w.content.podcast_id)
        elif ct == WidgetContentType.VOD:
            if w.content.content_id:
                vod_ids.append(w.content.content_id)

    # Batch fetch referenced content
    if channel_ids:
        channels = await LiveChannel.find(
            {"_id": {"$in": [ObjectId(i) for i in channel_ids]}}
        ).to_list()
        for ch in channels:
            cover_map[str(ch.id)] = ch.logo or ch.thumbnail or ""

    if station_ids:
        stations = await RadioStation.find(
            {"_id": {"$in": [ObjectId(i) for i in station_ids]}}
        ).to_list()
        for st in stations:
            if st.logo:
                cover_map[str(st.id)] = st.logo

    if podcast_ids:
        podcasts = await Podcast.find(
            {"_id": {"$in": [ObjectId(i) for i in podcast_ids]}}
        ).to_list()
        for p in podcasts:
            if p.cover:
                cover_map[str(p.id)] = p.cover

    if vod_ids:
        vod_items = await Content.find(
            {"_id": {"$in": [ObjectId(i) for i in vod_ids]}}
        ).to_list()
        for v in vod_items:
            cover_map[str(v.id)] = v.poster_url or v.thumbnail or ""

    # Map content IDs back to widget IDs
    result: Dict[str, str] = {}
    for w in widgets:
        wid = str(w.id)
        if w.cover_url:
            result[wid] = w.cover_url
            continue
        if not w.content:
            continue
        ref_id = _get_content_ref_id(w)
        if ref_id and ref_id in cover_map and cover_map[ref_id]:
            result[wid] = cover_map[ref_id]

    return result


def _get_content_ref_id(w: Widget) -> Optional[str]:
    """Get the referenced content ID from a widget."""
    if not w.content:
        return None
    ct = w.content.content_type
    if ct in (WidgetContentType.LIVE_CHANNEL, WidgetContentType.LIVE):
        return w.content.live_channel_id
    elif ct == WidgetContentType.RADIO:
        return w.content.station_id
    elif ct == WidgetContentType.PODCAST:
        return w.content.podcast_id
    elif ct == WidgetContentType.VOD:
        return w.content.content_id
    return None


def _widget_dict(
    w: Widget,
    is_added: bool = False,
    user_prefs: Optional[UserSystemWidget] = None,
    cover_url: Optional[str] = None,
) -> dict:
    """Convert Widget document to API response dict with user subscription info."""
    result = {
        "id": str(w.id),
        "type": w.type.value,
        "user_id": w.user_id,
        "title": w.title,
        "description": w.description,
        "icon": w.icon,
        "cover_url": cover_url or w.cover_url,
        "content": {
            "content_type": w.content.content_type.value if w.content else None,
            "live_channel_id": (
                str(w.content.live_channel_id)
                if w.content and w.content.live_channel_id
                else None
            ),
            "podcast_id": (
                str(w.content.podcast_id)
                if w.content and w.content.podcast_id
                else None
            ),
            "content_id": (
                str(w.content.content_id)
                if w.content and w.content.content_id
                else None
            ),
            "station_id": (
                str(w.content.station_id)
                if w.content and w.content.station_id
                else None
            ),
            "iframe_url": w.content.iframe_url if w.content else None,
            "iframe_title": w.content.iframe_title if w.content else None,
            "component_name": (
                w.content.component_name
                if w.content and hasattr(w.content, "component_name")
                else None
            ),
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
        "created_at": w.created_at.isoformat() if w.created_at else None,
        "updated_at": w.updated_at.isoformat() if w.updated_at else None,
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
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get all available system widgets that user can add.

    Returns all active system widgets with an is_added flag indicating
    whether the user has added each widget to their collection.
    Works for both authenticated and unauthenticated users.
    """
    # Default values for unauthenticated users
    user_id = str(current_user.id) if current_user else None
    user_role = current_user.role if current_user else "guest"
    user_subscription = (
        getattr(current_user, "subscription_tier", None) if current_user else None
    )

    # Get all active system widgets
    system_widgets = (
        await Widget.find({"type": WidgetType.SYSTEM, "is_active": True})
        .sort(Widget.order)
        .to_list()
    )

    # Get user's subscribed widget IDs (empty for unauthenticated users)
    if user_id:
        user_subscriptions = await UserSystemWidget.find(
            {"user_id": user_id}
).to_list()
        subscribed_ids = {sub.widget_id for sub in user_subscriptions}
    else:
        subscribed_ids = set()

    # Filter by role and subscription
    filtered_widgets = []
    for widget in system_widgets:
        # Check role targeting
        if widget.visible_to_roles:
            if (
                "user" not in widget.visible_to_roles
                and user_role not in widget.visible_to_roles
            ):
                continue

        # Check subscription tier targeting
        if widget.visible_to_subscription_tiers:
            if (
                not user_subscription
                or user_subscription not in widget.visible_to_subscription_tiers
            ):
                continue

        filtered_widgets.append(widget)

    # Batch resolve cover images from referenced content
    cover_urls = await _resolve_cover_urls(filtered_widgets)

    # Build response with cover URLs
    result = []
    for widget in filtered_widgets:
        is_added = str(widget.id) in subscribed_ids
        result.append(
            _widget_dict(
                widget,
                is_added=is_added,
                cover_url=cover_urls.get(str(widget.id)),
            )
        )

    return {
        "items": result,
        "total": len(result),
    }


@router.get("/my")
async def get_my_system_widgets(
    page_path: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get user's subscribed system widgets with their preferences applied.

    These are the system widgets the user has explicitly added to their collection.
    """
    user_id = str(current_user.id)

    # Get user's subscriptions
    user_subscriptions = (
        await UserSystemWidget.find(
            {"user_id": user_id}, 
            {"is_visible": True},   # Only visible (not closed)
        )
        .sort(UserSystemWidget.order)
        .to_list()
    )

    if not user_subscriptions:
        return {"items": [], "total": 0}

    # Get the actual widget documents
    widget_ids = [ObjectId(sub.widget_id) for sub in user_subscriptions]
    widgets = await Widget.find(
        {"_id": {"$in": widget_ids}},  {"is_active": True}).to_list()

    # Create a lookup for quick access
    widget_lookup = {str(w.id): w for w in widgets}
    sub_lookup = {sub.widget_id: sub for sub in user_subscriptions}

    # Filter by page targeting
    page_filtered = []
    for sub in user_subscriptions:
        widget = widget_lookup.get(sub.widget_id)
        if not widget:
            continue
        if page_path and widget.target_pages:
            if not any(page_path.startswith(target) for target in widget.target_pages):
                continue
        page_filtered.append((widget, sub))

    # Batch resolve cover images
    cover_urls = await _resolve_cover_urls([w for w, _ in page_filtered])

    # Build result with user preferences applied
    result = []
    for widget, sub in page_filtered:
        result.append(
            _widget_dict(
                widget,
                is_added=True,
                user_prefs=sub,
                cover_url=cover_urls.get(str(widget.id)),
            )
        )

    return {
        "items": result,
        "total": len(result),
    }


@router.post("/{widget_id}/add")
async def add_system_widget(
    widget_id: str, current_user: User = Depends(get_current_active_user)
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
        {"user_id": user_id, "widget_id": widget_id}
)
    if existing:
        # Already added, just return success
        return {"message": "Widget already added", "id": str(existing.id)}

    # Get next order number
    last_sub = (
        await UserSystemWidget.find({"user_id": user_id})
        .sort(-UserSystemWidget.order)
        .first_or_none()
    )
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
    widget_id: str, current_user: User = Depends(get_current_active_user)
):
    """Remove a system widget from user's collection."""
    user_id = str(current_user.id)

    # Find the subscription
    subscription = await UserSystemWidget.find_one(
        {"user_id": user_id, "widget_id": widget_id}
)

    if not subscription:
        raise HTTPException(status_code=404, detail="Widget not in your collection")

    await subscription.delete()

    return {"message": "Widget removed"}


@router.patch("/{widget_id}/position")
async def update_system_widget_position(
    widget_id: str,
    data: UserSystemWidgetPositionUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update user's custom position for a system widget."""
    user_id = str(current_user.id)

    # Find the subscription
    subscription = await UserSystemWidget.find_one(
        {"user_id": user_id, "widget_id": widget_id}
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
    current_user: User = Depends(get_current_active_user),
):
    """Update user's preferences for a system widget (mute, visibility, order)."""
    user_id = str(current_user.id)

    # Find the subscription
    subscription = await UserSystemWidget.find_one(
        {"user_id": user_id, "widget_id": widget_id}
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
    widget_id: str, current_user: User = Depends(get_current_active_user)
):
    """Close/hide a system widget for the current user."""
    user_id = str(current_user.id)

    # Find the subscription
    subscription = await UserSystemWidget.find_one(
        {"user_id": user_id, "widget_id": widget_id}
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
    widget_id: str, current_user: User = Depends(get_current_active_user)
):
    """Show/restore a previously closed system widget."""
    user_id = str(current_user.id)

    # Find the subscription
    subscription = await UserSystemWidget.find_one(
        {"user_id": user_id, "widget_id": widget_id}
)

    if not subscription:
        raise HTTPException(status_code=404, detail="Widget not in your collection")

    subscription.is_visible = True
    await subscription.save()

    return {"message": "Widget shown"}
