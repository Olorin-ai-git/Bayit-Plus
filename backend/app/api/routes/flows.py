from datetime import datetime
from typing import List, Optional

from app.core.security import get_current_active_user
from app.models.flow import (
    SYSTEM_FLOWS,
    Flow,
    FlowCreate,
    FlowItem,
    FlowResponse,
    FlowUpdate,
)
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException, Query, status

router = APIRouter()


async def ensure_system_flows():
    """Ensure system flows exist in database."""
    for flow_data in SYSTEM_FLOWS:
        existing = await Flow.find_one(
            Flow.flow_type == "system",
            Flow.name == flow_data["name"],
        )
        if not existing:
            flow = Flow(**flow_data)
            await flow.insert()


@router.get("", response_model=List[FlowResponse])
async def get_flows(
    current_user: User = Depends(get_current_active_user),
):
    """Get all flows (system + user's custom flows)."""
    # Ensure system flows exist
    await ensure_system_flows()

    # Get system flows
    system_flows = await Flow.find(Flow.flow_type == "system").to_list()

    # Get user's custom flows
    user_flows = await Flow.find(
        Flow.user_id == str(current_user.id),
        Flow.flow_type == "custom",
    ).to_list()

    all_flows = system_flows + user_flows
    return [f.to_response() for f in all_flows]


@router.get("/active")
async def get_active_flow(
    current_user: User = Depends(get_current_active_user),
):
    """Check if any flow should be triggered now based on time/conditions."""
    await ensure_system_flows()

    now = datetime.now()
    current_time = now.strftime("%H:%M")
    current_day = now.weekday()  # 0=Monday, 6=Sunday in Python
    # Convert to our format (0=Sunday)
    current_day = (current_day + 1) % 7

    # Get all active flows
    flows = await Flow.find(Flow.is_active == True).to_list()

    for flow in flows:
        for trigger in flow.triggers:
            if trigger.type == "time":
                # Check time range
                start = trigger.start_time
                end = trigger.end_time
                if start and end and start <= current_time <= end:
                    # Check days if specified
                    if trigger.days is None or current_day in trigger.days:
                        # Check if user has skipped today
                        skip_key = f"flow_{flow.id}_skipped_date"
                        today = now.strftime("%Y-%m-%d")
                        if current_user.preferences.get(skip_key) != today:
                            return {
                                "active_flow": flow.to_response(),
                                "should_show": True,
                            }

    return {"active_flow": None, "should_show": False}


@router.get("/{flow_id}", response_model=FlowResponse)
async def get_flow(
    flow_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific flow."""
    flow = await Flow.get(flow_id)

    if not flow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow not found",
        )

    # Check access (system flows are public, custom flows belong to user)
    if flow.flow_type == "custom" and flow.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return flow.to_response()


@router.post("", response_model=FlowResponse)
async def create_flow(
    flow_data: FlowCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Create a custom flow."""
    flow = Flow(
        user_id=str(current_user.id),
        flow_type="custom",
        name=flow_data.name,
        name_en=flow_data.name_en,
        name_es=flow_data.name_es,
        description=flow_data.description,
        icon=flow_data.icon,
        items=flow_data.items,
        triggers=flow_data.triggers,
        auto_play=flow_data.auto_play,
        ai_enabled=flow_data.ai_enabled,
        ai_brief_enabled=flow_data.ai_brief_enabled,
    )
    await flow.insert()
    return flow.to_response()


@router.put("/{flow_id}", response_model=FlowResponse)
async def update_flow(
    flow_id: str,
    updates: FlowUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update a custom flow."""
    flow = await Flow.get(flow_id)

    if not flow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow not found",
        )

    # Cannot edit system flows
    if flow.flow_type == "system":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot edit system flows",
        )

    # Check ownership
    if flow.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Apply updates
    if updates.name is not None:
        flow.name = updates.name
    if updates.name_en is not None:
        flow.name_en = updates.name_en
    if updates.name_es is not None:
        flow.name_es = updates.name_es
    if updates.description is not None:
        flow.description = updates.description
    if updates.icon is not None:
        flow.icon = updates.icon
    if updates.is_active is not None:
        flow.is_active = updates.is_active
    if updates.items is not None:
        flow.items = updates.items
    if updates.triggers is not None:
        flow.triggers = updates.triggers
    if updates.auto_play is not None:
        flow.auto_play = updates.auto_play
    if updates.ai_enabled is not None:
        flow.ai_enabled = updates.ai_enabled
    if updates.ai_brief_enabled is not None:
        flow.ai_brief_enabled = updates.ai_brief_enabled

    flow.updated_at = datetime.utcnow()
    await flow.save()
    return flow.to_response()


@router.delete("/{flow_id}")
async def delete_flow(
    flow_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Delete a custom flow."""
    flow = await Flow.get(flow_id)

    if not flow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow not found",
        )

    # Cannot delete system flows
    if flow.flow_type == "system":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system flows",
        )

    # Check ownership
    if flow.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    await flow.delete()
    return {"message": "Flow deleted successfully"}


@router.post("/{flow_id}/items", response_model=FlowResponse)
async def add_flow_item(
    flow_id: str,
    item: FlowItem,
    current_user: User = Depends(get_current_active_user),
):
    """Add content item to a flow."""
    flow = await Flow.get(flow_id)

    if not flow or (
        flow.flow_type == "custom" and flow.user_id != str(current_user.id)
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow not found",
        )

    if flow.flow_type == "system":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system flows",
        )

    item.order = len(flow.items)
    flow.items.append(item)
    flow.updated_at = datetime.utcnow()
    await flow.save()

    return flow.to_response()


@router.delete("/{flow_id}/items/{item_index}")
async def remove_flow_item(
    flow_id: str,
    item_index: int,
    current_user: User = Depends(get_current_active_user),
):
    """Remove content item from a flow."""
    flow = await Flow.get(flow_id)

    if not flow or (
        flow.flow_type == "custom" and flow.user_id != str(current_user.id)
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow not found",
        )

    if flow.flow_type == "system":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system flows",
        )

    if item_index < 0 or item_index >= len(flow.items):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid item index",
        )

    flow.items.pop(item_index)
    # Reorder remaining items
    for i, item in enumerate(flow.items):
        item.order = i

    flow.updated_at = datetime.utcnow()
    await flow.save()

    return {"message": "Item removed successfully"}


@router.post("/{flow_id}/skip-today")
async def skip_flow_today(
    flow_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Skip a flow for today."""
    flow = await Flow.get(flow_id)

    if not flow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow not found",
        )

    # Store skip date in user preferences
    today = datetime.now().strftime("%Y-%m-%d")
    current_user.preferences[f"flow_{flow_id}_skipped_date"] = today
    await current_user.save()

    return {"message": "Flow skipped for today"}


@router.get("/{flow_id}/content")
async def get_flow_content(
    flow_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get flow content with actual stream URLs."""
    from app.models.content import Content, LiveChannel, RadioStation

    flow = await Flow.get(flow_id)

    if not flow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow not found",
        )

    content_items = []

    # If flow has items, resolve them to actual content
    if flow.items:
        for item in flow.items:
            content_items.append(item.dict())
    elif flow.flow_type == "system":
        # Fetch content based on system flow type
        flow_name = flow.name.lower()

        if "בוקר" in flow_name or "morning" in flow_name.lower():
            # Morning flow: news, weather-related content
            live_channels = (
                await LiveChannel.find(LiveChannel.category.in_(["news", "music"]))
                .limit(3)
                .to_list()
            )
            for ch in live_channels:
                content_items.append(
                    {
                        "content_id": str(ch.id),
                        "content_type": "live",
                        "title": ch.name,
                        "thumbnail": ch.logo,
                        "duration_hint": 1800,
                        "order": len(content_items),
                    }
                )

        elif "שבת" in flow_name or "shabbat" in flow_name.lower():
            # Shabbat flow: Jewish music, relaxing content
            radio_stations = (
                await RadioStation.find(
                    RadioStation.category.in_(["jewish", "music", "religious"])
                )
                .limit(3)
                .to_list()
            )
            for st in radio_stations:
                content_items.append(
                    {
                        "content_id": str(st.id),
                        "content_type": "radio",
                        "title": st.name,
                        "thumbnail": st.logo,
                        "duration_hint": 3600,
                        "order": len(content_items),
                    }
                )

        elif "שינה" in flow_name or "bedtime" in flow_name.lower():
            # Bedtime flow: relaxing music
            radio_stations = (
                await RadioStation.find(
                    RadioStation.category.in_(["music", "relaxing"])
                )
                .limit(2)
                .to_list()
            )
            for st in radio_stations:
                content_items.append(
                    {
                        "content_id": str(st.id),
                        "content_type": "radio",
                        "title": st.name,
                        "thumbnail": st.logo,
                        "duration_hint": 1800,
                        "order": len(content_items),
                    }
                )

        elif "ילדים" in flow_name or "kids" in flow_name.lower():
            # Kids flow: children's content
            kids_content = (
                await Content.find(Content.is_kids_content == True).limit(5).to_list()
            )
            for c in kids_content:
                content_items.append(
                    {
                        "content_id": str(c.id),
                        "content_type": "vod",
                        "title": c.title,
                        "thumbnail": c.thumbnail,
                        "duration_hint": c.duration or 1200,
                        "order": len(content_items),
                    }
                )

    return {
        "flow": flow.to_response(),
        "content": content_items,
        "ai_brief": flow.ai_brief_enabled,
    }
