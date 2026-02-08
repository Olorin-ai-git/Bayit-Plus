"""
Friendship search and query operations.
Extracted from friendship_service.py to keep files under 200 lines.
"""

import re
from typing import List, Tuple

from beanie.operators import And, Or

from app.core.logging_config import get_logger
from app.models.friendship import (FriendRequest, FriendRequestStatus,
                                   UserFriendship)
from app.models.user import User

logger = get_logger(__name__)


async def get_friends(user_id: str, limit: int = 100) -> List[dict]:
    """Get user's friend list with basic info."""
    friendships = (
        await UserFriendship.find(
            Or(
                UserFriendship.user1_id == user_id,
                UserFriendship.user2_id == user_id,
            )
        )
        .limit(limit)
        .to_list()
    )

    friends = []
    for friendship in friendships:
        if friendship.user1_id == user_id:
            info = {
                "user_id": friendship.user2_id,
                "name": friendship.user2_name,
                "avatar": friendship.user2_avatar,
            }
        else:
            info = {
                "user_id": friendship.user1_id,
                "name": friendship.user1_name,
                "avatar": friendship.user1_avatar,
            }
        info["friendship_id"] = str(friendship.id)
        info["friends_since"] = friendship.created_at
        info["last_game_at"] = friendship.last_game_at
        friends.append(info)

    return friends


async def get_pending_requests(
    user_id: str,
) -> Tuple[List[FriendRequest], List[FriendRequest]]:
    """Get incoming and outgoing pending requests."""
    incoming = (
        await FriendRequest.find(
            And(
                FriendRequest.receiver_id == user_id,
                FriendRequest.status == FriendRequestStatus.PENDING,
            )
        )
        .sort("-sent_at")
        .to_list()
    )
    outgoing = (
        await FriendRequest.find(
            And(
                FriendRequest.sender_id == user_id,
                FriendRequest.status == FriendRequestStatus.PENDING,
            )
        )
        .sort("-sent_at")
        .to_list()
    )
    return incoming, outgoing


async def are_friends(user1_id: str, user2_id: str) -> bool:
    """Check if two users are friends."""
    friendship = await UserFriendship.find_one(
        Or(
            And(
                UserFriendship.user1_id == user1_id,
                UserFriendship.user2_id == user2_id,
            ),
            And(
                UserFriendship.user1_id == user2_id,
                UserFriendship.user2_id == user1_id,
            ),
        )
    )
    return friendship is not None


async def search_users(
    query: str, current_user_id: str, limit: int = 20
) -> List[dict]:
    """Search for users to add as friends. Query is escaped to prevent regex injection."""
    escaped_query = re.escape(query)
    users = await User.find(User.name.regex(escaped_query, "i")).limit(limit).to_list()

    friends = await get_friends(current_user_id)
    friend_ids = {f["user_id"] for f in friends}

    incoming, outgoing = await get_pending_requests(current_user_id)
    incoming_ids = {r.sender_id for r in incoming}
    outgoing_ids = {r.receiver_id for r in outgoing}

    results = []
    for user in users:
        uid = str(user.id)
        if uid == current_user_id:
            continue
        user_dict = {
            "user_id": uid, "name": user.name, "avatar": user.avatar,
            "friend_count": user.friend_count, "games_played": user.games_played,
        }
        if uid in friend_ids:
            user_dict["relationship"] = "friend"
        elif uid in outgoing_ids:
            user_dict["relationship"] = "request_sent"
        elif uid in incoming_ids:
            user_dict["relationship"] = "request_received"
        else:
            user_dict["relationship"] = "none"
        results.append(user_dict)

    return results
