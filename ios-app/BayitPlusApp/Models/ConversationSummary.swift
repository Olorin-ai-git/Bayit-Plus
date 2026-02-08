import Foundation

/// Summary of a conversation with a friend.
/// Maps to backend `ConversationSummary` pydantic model.
struct ConversationSummary: Codable, Identifiable, Sendable {
    var id: String { friendId }
    let friendId: String
    let friendName: String
    let friendAvatar: String?
    let lastMessage: String
    let lastMessageAt: Date
    let unreadCount: Int

    enum CodingKeys: String, CodingKey {
        case friendId = "friend_id"
        case friendName = "friend_name"
        case friendAvatar = "friend_avatar"
        case lastMessage = "last_message"
        case lastMessageAt = "last_message_at"
        case unreadCount = "unread_count"
    }
}
