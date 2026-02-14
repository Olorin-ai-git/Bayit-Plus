package tv.bayit.plus.core.model

import kotlinx.serialization.Serializable

@Serializable
data class Friend(
    val id: String,
    val displayName: String,
    val avatarUrl: String? = null,
    val isOnline: Boolean = false,
    val lastSeen: String? = null,
)

@Serializable
data class FriendRequest(
    val id: String,
    val fromUser: Friend,
    val status: String,
    val createdAt: String,
)

@Serializable
data class DirectMessage(
    val id: String,
    val senderId: String,
    val content: String,
    val timestamp: String,
    val isRead: Boolean = false,
)

@Serializable
data class ConversationSummary(
    val friendId: String,
    val friendName: String,
    val friendAvatarUrl: String? = null,
    val lastMessage: String? = null,
    val lastMessageTime: String? = null,
    val unreadCount: Int = 0,
)

@Serializable
data class WatchParty(
    val id: String,
    val hostId: String,
    val contentId: String,
    val participants: List<Friend> = emptyList(),
    val status: String,
    val createdAt: String,
)

@Serializable
data class ChessGame(
    val id: String,
    val whitePlayerId: String,
    val blackPlayerId: String,
    val fen: String,
    val status: String,
    val moves: List<String> = emptyList(),
    val lastMoveAt: String? = null,
)
