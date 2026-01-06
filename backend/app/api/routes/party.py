"""
Watch Party REST API endpoints.
Handles party creation, joining, and management.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query

from app.models.user import User
from app.models.realtime import (
    WatchParty,
    WatchPartyCreate,
    WatchPartyResponse,
    ChatMessage,
    ChatMessageCreate,
    ChatMessageResponse
)
from app.core.security import get_current_active_user
from app.services.room_manager import room_manager

router = APIRouter()


@router.post("/create", response_model=WatchPartyResponse)
async def create_party(
    data: WatchPartyCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new watch party"""
    party = await room_manager.create_party(
        host_id=str(current_user.id),
        host_name=current_user.name,
        data=data
    )
    return room_manager.to_response(party)


@router.get("/my-parties", response_model=List[WatchPartyResponse])
async def get_my_parties(
    current_user: User = Depends(get_current_active_user)
):
    """Get all active parties where user is host or participant"""
    parties = await room_manager.get_user_parties(str(current_user.id))
    return [room_manager.to_response(p) for p in parties]


@router.get("/join/{room_code}", response_model=WatchPartyResponse)
async def join_by_code(
    room_code: str,
    current_user: User = Depends(get_current_active_user)
):
    """Join a party using room code"""
    party = await room_manager.get_party_by_code(room_code)
    if not party:
        raise HTTPException(status_code=404, detail="Party not found or ended")

    if party.participant_count >= party.max_participants:
        raise HTTPException(status_code=400, detail="Party is full")

    party = await room_manager.join_party(
        party_id=str(party.id),
        user_id=str(current_user.id),
        user_name=current_user.name
    )

    return room_manager.to_response(party)


@router.get("/{party_id}", response_model=WatchPartyResponse)
async def get_party(
    party_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get party details"""
    party = await room_manager.get_party(party_id)
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    # Check if user is a participant
    if not any(p.user_id == str(current_user.id) for p in party.participants):
        raise HTTPException(status_code=403, detail="Not a member of this party")

    return room_manager.to_response(party)


@router.post("/{party_id}/join", response_model=WatchPartyResponse)
async def join_party(
    party_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Join a party by ID"""
    party = await room_manager.join_party(
        party_id=party_id,
        user_id=str(current_user.id),
        user_name=current_user.name
    )

    if not party:
        raise HTTPException(status_code=400, detail="Cannot join party")

    return room_manager.to_response(party)


@router.post("/{party_id}/leave")
async def leave_party(
    party_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Leave a party"""
    party = await room_manager.leave_party(
        party_id=party_id,
        user_id=str(current_user.id)
    )

    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    return {"status": "left", "party_ended": party.ended_at is not None}


@router.post("/{party_id}/end")
async def end_party(
    party_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """End a party (host only)"""
    success = await room_manager.end_party(
        party_id=party_id,
        user_id=str(current_user.id)
    )

    if not success:
        raise HTTPException(
            status_code=403,
            detail="Only the host can end the party"
        )

    return {"status": "ended"}


@router.post("/{party_id}/chat", response_model=ChatMessageResponse)
async def send_message(
    party_id: str,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Send a chat message"""
    message = await room_manager.send_chat_message(
        party_id=party_id,
        user_id=str(current_user.id),
        user_name=current_user.name,
        data=data
    )

    if not message:
        raise HTTPException(status_code=400, detail="Cannot send message")

    return ChatMessageResponse(
        id=str(message.id),
        party_id=message.party_id,
        user_id=message.user_id,
        user_name=message.user_name,
        message=message.message,
        message_type=message.message_type,
        reactions=message.reactions,
        timestamp=message.timestamp
    )


@router.get("/{party_id}/chat", response_model=List[ChatMessageResponse])
async def get_chat_history(
    party_id: str,
    limit: int = Query(default=50, le=100),
    before: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get chat message history"""
    before_dt = datetime.fromisoformat(before) if before else None

    messages = await room_manager.get_chat_history(
        party_id=party_id,
        limit=limit,
        before=before_dt
    )

    return [
        ChatMessageResponse(
            id=str(m.id),
            party_id=m.party_id,
            user_id=m.user_id,
            user_name=m.user_name,
            message=m.message,
            message_type=m.message_type,
            reactions=m.reactions,
            timestamp=m.timestamp
        )
        for m in messages
    ]


@router.post("/{party_id}/chat/{message_id}/react")
async def add_reaction(
    party_id: str,
    message_id: str,
    emoji: str = Query(..., min_length=1, max_length=10),
    current_user: User = Depends(get_current_active_user)
):
    """Add a reaction to a message"""
    message = await room_manager.add_reaction(
        message_id=message_id,
        user_id=str(current_user.id),
        emoji=emoji
    )

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    return {"status": "added", "emoji": emoji}


@router.delete("/{party_id}/chat/{message_id}/react")
async def remove_reaction(
    party_id: str,
    message_id: str,
    emoji: str = Query(..., min_length=1, max_length=10),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a reaction from a message"""
    message = await room_manager.remove_reaction(
        message_id=message_id,
        user_id=str(current_user.id),
        emoji=emoji
    )

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    return {"status": "removed", "emoji": emoji}


@router.post("/{party_id}/sync")
async def sync_playback(
    party_id: str,
    position: float = Query(..., ge=0),
    is_playing: bool = Query(default=True),
    current_user: User = Depends(get_current_active_user)
):
    """Sync playback position (host only)"""
    success = await room_manager.sync_playback(
        party_id=party_id,
        user_id=str(current_user.id),
        position=position,
        is_playing=is_playing
    )

    if not success:
        raise HTTPException(
            status_code=403,
            detail="Only the host can control playback"
        )

    return {"status": "synced", "position": position, "is_playing": is_playing}
