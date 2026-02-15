"""Service for managing friendships and friend requests."""

from datetime import datetime
from typing import List, Optional, Tuple

from beanie.operators import And, Or

from app.core.config import settings
from app.core.exceptions import FriendshipError
from app.core.logging_config import get_logger
from app.models.friendship import (FriendRequest, FriendRequestStatus,
                                   UserFriendship)
from app.models.user import User
from app.services.friendship_search_service import (
    are_friends as _are_friends,
    get_friends as _get_friends,
    get_pending_requests as _get_pending_requests,
    search_users as _search_users,
)

logger = get_logger(__name__)


class FriendshipService:
    """Service for managing friendships and friend requests."""

    @staticmethod
    async def send_friend_request(
        sender_id: str, receiver_id: str, message: Optional[str] = None
    ) -> FriendRequest:
        """Send a friend request."""
        if sender_id == receiver_id:
            raise FriendshipError("Cannot send friend request to yourself")

        if await FriendshipService.are_friends(sender_id, receiver_id):
            raise FriendshipError("Already friends with this user")

        existing = await FriendRequest.find_one(
            {"sender_id": sender_id, "receiver_id": receiver_id, "status": FriendRequestStatus.PENDING}
        )
        if existing:
            raise FriendshipError("Friend request already pending")

        max_pending = settings.olorin.social_ws.max_pending_friend_requests
        outbound_count = await FriendRequest.find(
            {"sender_id": sender_id, "status": FriendRequestStatus.PENDING}
        ).count()
        if outbound_count >= max_pending:
            raise FriendshipError("Maximum pending friend requests reached")

        sender = await User.get(sender_id)
        receiver = await User.get(receiver_id)
        if not receiver.allow_friend_requests:
            raise FriendshipError("User is not accepting friend requests")

        request = FriendRequest(
            sender_id=sender_id, sender_name=sender.name, sender_avatar=sender.avatar,
            receiver_id=receiver_id, receiver_name=receiver.name, receiver_avatar=receiver.avatar,
            message=message,
        )
        await request.insert()
        return request

    @staticmethod
    async def accept_friend_request(request_id: str, user_id: str) -> UserFriendship:
        """Accept a friend request."""
        request = await FriendRequest.get(request_id)
        if not request:
            raise FriendshipError("Friend request not found")
        if request.receiver_id != user_id:
            raise FriendshipError("Not authorized to accept this request")
        if request.status != FriendRequestStatus.PENDING:
            raise FriendshipError("Request is not pending")

        request.status = FriendRequestStatus.ACCEPTED
        request.responded_at = datetime.utcnow()
        await request.save()

        friendship = UserFriendship(
            user1_id=request.sender_id, user1_name=request.sender_name,
            user1_avatar=request.sender_avatar, user2_id=request.receiver_id,
            user2_name=request.receiver_name, user2_avatar=request.receiver_avatar,
        )
        await friendship.insert()

        sender = await User.get(request.sender_id)
        receiver = await User.get(request.receiver_id)
        sender.friend_count += 1
        receiver.friend_count += 1
        await sender.save()
        await receiver.save()
        return friendship

    @staticmethod
    async def reject_friend_request(request_id: str, user_id: str) -> FriendRequest:
        """Reject a friend request."""
        request = await FriendRequest.get(request_id)
        if not request:
            raise FriendshipError("Friend request not found")
        if request.receiver_id != user_id:
            raise FriendshipError("Not authorized to reject this request")
        if request.status != FriendRequestStatus.PENDING:
            raise FriendshipError("Request is not pending")
        request.status = FriendRequestStatus.REJECTED
        request.responded_at = datetime.utcnow()
        await request.save()
        return request

    @staticmethod
    async def cancel_friend_request(request_id: str, user_id: str) -> FriendRequest:
        """Cancel a sent friend request."""
        request = await FriendRequest.get(request_id)
        if not request:
            raise FriendshipError("Friend request not found")
        if request.sender_id != user_id:
            raise FriendshipError("Not authorized to cancel this request")
        if request.status != FriendRequestStatus.PENDING:
            raise FriendshipError("Request is not pending")
        request.status = FriendRequestStatus.CANCELLED
        request.responded_at = datetime.utcnow()
        await request.save()
        return request

    @staticmethod
    async def remove_friend(user_id: str, friend_id: str) -> bool:
        """Remove a friendship."""
        friendship = await UserFriendship.find_one(
            {"$or": [
                {"user1_id": user_id, "user2_id": friend_id},
                {"user1_id": friend_id, "user2_id": user_id},
            ]}
        )
        if not friendship:
            raise FriendshipError("Friendship not found")
        await friendship.delete()
        user = await User.get(user_id)
        friend = await User.get(friend_id)
        user.friend_count -= 1
        friend.friend_count -= 1
        await user.save()
        await friend.save()
        return True

    @staticmethod
    async def get_friends(user_id: str, limit: int = 100) -> List[dict]:
        return await _get_friends(user_id, limit)

    @staticmethod
    async def get_pending_requests(user_id: str) -> Tuple[List[FriendRequest], List[FriendRequest]]:
        return await _get_pending_requests(user_id)

    @staticmethod
    async def are_friends(user1_id: str, user2_id: str) -> bool:
        return await _are_friends(user1_id, user2_id)

    @staticmethod
    async def search_users(query: str, current_user_id: str, limit: int = 20) -> List[dict]:
        return await _search_users(query, current_user_id, limit)
