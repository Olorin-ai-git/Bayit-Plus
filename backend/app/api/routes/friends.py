from typing import Optional

from app.core.security import get_current_user
from app.models.user import User
from app.services.friendship_service import FriendshipService
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/friends", tags=["friends"])


class SendFriendRequestRequest(BaseModel):
    receiver_id: str
    message: Optional[str] = None


class RespondToRequestRequest(BaseModel):
    request_id: str


class SearchUsersRequest(BaseModel):
    query: str
    limit: int = 20


@router.post("/request")
async def send_friend_request(
    request: SendFriendRequestRequest, user: User = Depends(get_current_user)
):
    """Send a friend request"""
    try:
        friend_request = await FriendshipService.send_friend_request(
            sender_id=str(user.id),
            receiver_id=request.receiver_id,
            message=request.message,
        )
        return {"success": True, "request": friend_request.dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/request/accept")
async def accept_friend_request(
    request: RespondToRequestRequest, user: User = Depends(get_current_user)
):
    """Accept a friend request"""
    try:
        friendship = await FriendshipService.accept_friend_request(
            request_id=request.request_id, user_id=str(user.id)
        )
        return {"success": True, "friendship": friendship.dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/request/reject")
async def reject_friend_request(
    request: RespondToRequestRequest, user: User = Depends(get_current_user)
):
    """Reject a friend request"""
    try:
        rejected = await FriendshipService.reject_friend_request(
            request_id=request.request_id, user_id=str(user.id)
        )
        return {"success": True, "request": rejected.dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/request/cancel")
async def cancel_friend_request(
    request: RespondToRequestRequest, user: User = Depends(get_current_user)
):
    """Cancel a sent friend request"""
    try:
        cancelled = await FriendshipService.cancel_friend_request(
            request_id=request.request_id, user_id=str(user.id)
        )
        return {"success": True, "request": cancelled.dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{friend_id}")
async def remove_friend(friend_id: str, user: User = Depends(get_current_user)):
    """Remove a friend"""
    try:
        await FriendshipService.remove_friend(str(user.id), friend_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/list")
async def get_friends(user: User = Depends(get_current_user)):
    """Get user's friend list"""
    friends = await FriendshipService.get_friends(str(user.id))
    return {"friends": friends}


@router.get("/requests")
async def get_friend_requests(user: User = Depends(get_current_user)):
    """Get pending friend requests (incoming and outgoing)"""
    incoming, outgoing = await FriendshipService.get_pending_requests(str(user.id))
    return {
        "incoming": [r.dict() for r in incoming],
        "outgoing": [r.dict() for r in outgoing],
    }


@router.post("/search")
async def search_users(
    request: SearchUsersRequest, user: User = Depends(get_current_user)
):
    """Search for users to add as friends"""
    results = await FriendshipService.search_users(
        query=request.query, current_user_id=str(user.id), limit=request.limit
    )
    return {"users": results}
