package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Friend(
    @SerialName("user_id") val id: String,
    @SerialName("name") val displayName: String,
    @SerialName("avatar") val avatarUrl: String? = null,
    @SerialName("is_online") val isOnline: Boolean = false,
    @SerialName("last_seen") val lastSeen: String? = null,
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

enum class PlayerColor { WHITE, BLACK }

enum class ChessGameMode { PVP, BOT }

enum class BotDifficulty { EASY, MEDIUM, HARD }

enum class ChessGameStatus {
    WAITING, ACTIVE, CHECKMATE, STALEMATE, DRAW, RESIGNED, TIMEOUT
}

@Serializable
data class ChessPlayer(
    @SerialName("user_id") val userId: String,
    @SerialName("user_name") val userName: String,
    val color: String,
    @SerialName("is_connected") val isConnected: Boolean = false,
    @SerialName("is_bot") val isBot: Boolean = false,
    @SerialName("time_remaining_ms") val timeRemainingMs: Long? = null,
    @SerialName("joined_at") val joinedAt: String? = null,
)

@Serializable
data class ChessMoveEntry(
    @SerialName("move_number") val moveNumber: Int = 0,
    val san: String,
    val piece: String,
    val captured: String? = null,
    val timestamp: String? = null,
)

@Serializable
data class ChessGame(
    val id: String,
    @SerialName("game_code") val gameCode: String,
    @SerialName("white_player") val whitePlayer: ChessPlayer? = null,
    @SerialName("black_player") val blackPlayer: ChessPlayer? = null,
    @SerialName("current_turn") val currentTurn: String = "white",
    val status: String,
    @SerialName("board_fen") val boardFen: String,
    @SerialName("chat_enabled") val chatEnabled: Boolean = true,
    @SerialName("voice_enabled") val voiceEnabled: Boolean = false,
    @SerialName("time_control") val timeControl: Int? = null,
    @SerialName("game_mode") val gameMode: String = "pvp",
    @SerialName("bot_difficulty") val botDifficulty: String? = null,
    @SerialName("move_history") val moveHistory: List<ChessMoveEntry> = emptyList(),
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = "",
    @SerialName("invited_user_id") val invitedUserId: String? = null,
    @SerialName("invite_status") val inviteStatus: String? = null,
)

@Serializable
data class ChessChatMessage(
    val id: String = "",
    @SerialName("game_id") val gameId: String = "",
    @SerialName("user_id") val userId: String = "",
    @SerialName("user_name") val userName: String = "",
    val message: String = "",
    @SerialName("display_message") val displayMessage: String = "",
    @SerialName("is_translated") val isTranslated: Boolean = false,
    @SerialName("translation_available") val translationAvailable: Boolean = false,
    @SerialName("is_bot_request") val isBotRequest: Boolean = false,
    @SerialName("bot_response") val botResponse: String? = null,
    @SerialName("source_language") val sourceLanguage: String = "",
    val timestamp: String = "",
) {
    val isBot: Boolean get() = userId == "BOT"
    val isSystem: Boolean get() = userId == "SYSTEM"
}
