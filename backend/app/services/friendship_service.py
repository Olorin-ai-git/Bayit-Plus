from typing import List, Optional, Tuple
from datetime import datetime
from app.models.friendship import (
    FriendRequest,
    UserFriendship,
    FriendRequestStatus,
)
from app.models.user import User
from app.core.exceptions import FriendshipError
from beanie.operators import In, Or, And


class FriendshipService:
    """Service for managing friendships and friend requests"""

    @staticmethod
    async def send_friend_request(
        sender_id: str,
        receiver_id: str,
        message: Optional[str] = None
    ) -> FriendRequest:
        """Send a friend request"""
        if sender_id == receiver_id:
            raise FriendshipError("Cannot send friend request to yourself")

        # Check if already friends
        is_friends = await FriendshipService.are_friends(sender_id, receiver_id)
        if is_friends:
            raise FriendshipError("Already friends with this user")

        # Check for existing pending request
        existing = await FriendRequest.find_one(
            And(
                FriendRequest.sender_id == sender_id,
                FriendRequest.receiver_id == receiver_id,
                FriendRequest.status == FriendRequestStatus.PENDING
            )
        )
        if existing:
            raise FriendshipError("Friend request already pending")

        # Get user details
        sender = await User.get(sender_id)
        receiver = await User.get(receiver_id)

        if not receiver.allow_friend_requests:
            raise FriendshipError("User is not accepting friend requests")

        # Create request
        request = FriendRequest(
            sender_id=sender_id,
            sender_name=sender.name,
            sender_avatar=sender.avatar,
            receiver_id=receiver_id,
            receiver_name=receiver.name,
            receiver_avatar=receiver.avatar,
            message=message,
        )

        await request.insert()
        return request

    @staticmethod
    async def accept_friend_request(request_id: str, user_id: str) -> UserFriendship:
        """Accept a friend request"""
        request = await FriendRequest.get(request_id)
        if not request:
            raise FriendshipError("Friend request not found")

        if request.receiver_id != user_id:
            raise FriendshipError("Not authorized to accept this request")

        if request.status != FriendRequestStatus.PENDING:
            raise FriendshipError("Request is not pending")

        # Update request status
        request.status = FriendRequestStatus.ACCEPTED
        request.responded_at = datetime.utcnow()
        await request.save()

        # Create bidirectional friendship
        friendship = UserFriendship(
            user1_id=request.sender_id,
            user1_name=request.sender_name,
            user1_avatar=request.sender_avatar,
            user2_id=request.receiver_id,
            user2_name=request.receiver_name,
            user2_avatar=request.receiver_avatar,
        )
        await friendship.insert()

        # Update friend counts
        sender = await User.get(request.sender_id)
        receiver = await User.get(request.receiver_id)
        sender.friend_count += 1
        receiver.friend_count += 1
        await sender.save()
        await receiver.save()

        return friendship

    @staticmethod
    async def reject_friend_request(request_id: str, user_id: str) -> FriendRequest:
        """Reject a friend request"""
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
        """Cancel a sent friend request"""
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
        """Remove a friendship"""
        friendship = await UserFriendship.find_one(
            Or(
                And(
                    UserFriendship.user1_id == user_id,
                    UserFriendship.user2_id == friend_id
                ),
                And(
                    UserFriendship.user1_id == friend_id,
                    UserFriendship.user2_id == user_id
                )
            )
        )

        if not friendship:
            raise FriendshipError("Friendship not found")

        await friendship.delete()

        # Update friend counts
        user = await User.get(user_id)
        friend = await User.get(friend_id)
        user.friend_count -= 1
        friend.friend_count -= 1
        await user.save()
        await friend.save()

        return True

    @staticmethod
    async def get_friends(user_id: str, limit: int = 100) -> List[dict]:
        """Get user's friend list with basic info"""
        friendships = await UserFriendship.find(
            Or(
                UserFriendship.user1_id == user_id,
                UserFriendship.user2_id == user_id
            )
        ).limit(limit).to_list()

        friends = []
        for friendship in friendships:
            # Get the other user's info
            if friendship.user1_id == user_id:
                friend_info = {
                    "user_id": friendship.user2_id,
                    "name": friendship.user2_name,
                    "avatar": friendship.user2_avatar,
                }
            else:
                friend_info = {
                    "user_id": friendship.user1_id,
                    "name": friendship.user1_name,
                    "avatar": friendship.user1_avatar,
                }

            friend_info["friendship_id"] = str(friendship.id)
            friend_info["friends_since"] = friendship.created_at
            friend_info["last_game_at"] = friendship.last_game_at

            friends.append(friend_info)

        return friends

    @staticmethod
    async def get_pending_requests(user_id: str) -> Tuple[List[FriendRequest], List[FriendRequest]]:
        """Get incoming and outgoing pending requests"""
        incoming = await FriendRequest.find(
            And(
                FriendRequest.receiver_id == user_id,
                FriendRequest.status == FriendRequestStatus.PENDING
            )
        ).sort("-sent_at").to_list()

        outgoing = await FriendRequest.find(
            And(
                FriendRequest.sender_id == user_id,
                FriendRequest.status == FriendRequestStatus.PENDING
            )
        ).sort("-sent_at").to_list()

        return incoming, outgoing

    @staticmethod
    async def are_friends(user1_id: str, user2_id: str) -> bool:
        """Check if two users are friends"""
        friendship = await UserFriendship.find_one(
            Or(
                And(
                    UserFriendship.user1_id == user1_id,
                    UserFriendship.user2_id == user2_id
                ),
                And(
                    UserFriendship.user1_id == user2_id,
                    UserFriendship.user2_id == user1_id
                )
            )
        )
        return friendship is not None

    @staticmethod
    async def search_users(
        query: str,
        current_user_id: str,
        limit: int = 20
    ) -> List[dict]:
        """Search for users to add as friends"""
        # Search by name (case-insensitive)
        users = await User.find(
            User.name.regex(query, "i")
        ).limit(limit).to_list()

        # Get current user's friends
        friends = await FriendshipService.get_friends(current_user_id)
        friend_ids = {f["user_id"] for f in friends}

        # Get pending requests
        incoming, outgoing = await FriendshipService.get_pending_requests(current_user_id)
        incoming_ids = {r.sender_id for r in incoming}
        outgoing_ids = {r.receiver_id for r in outgoing}

        results = []
        for user in users:
            if str(user.id) == current_user_id:
                continue  # Skip self

            user_dict = {
                "user_id": str(user.id),
                "name": user.name,
                "avatar": user.avatar,
                "friend_count": user.friend_count,
                "games_played": user.games_played,
            }

            # Add relationship status
            if str(user.id) in friend_ids:
                user_dict["relationship"] = "friend"
            elif str(user.id) in outgoing_ids:
                user_dict["relationship"] = "request_sent"
            elif str(user.id) in incoming_ids:
                user_dict["relationship"] = "request_received"
            else:
                user_dict["relationship"] = "none"

            results.append(user_dict)

        return results
