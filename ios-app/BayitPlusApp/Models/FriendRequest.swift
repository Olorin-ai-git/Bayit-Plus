import Foundation

/// Status of a friend request, matching backend `FriendRequestStatus` enum.
enum FriendRequestStatus: String, Codable, Sendable {
    case pending
    case accepted
    case rejected
    case cancelled
}

/// A friend request sent or received by the user.
/// Maps to the backend `FriendRequest` document model.
struct FriendRequest: Codable, Identifiable, Sendable {
    let id: String
    let senderId: String
    let senderName: String
    let senderAvatar: String?
    let receiverId: String
    let receiverName: String
    let receiverAvatar: String?
    let status: FriendRequestStatus
    let message: String?
    let sentAt: Date
    let respondedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case senderId = "sender_id"
        case senderName = "sender_name"
        case senderAvatar = "sender_avatar"
        case receiverId = "receiver_id"
        case receiverName = "receiver_name"
        case receiverAvatar = "receiver_avatar"
        case status
        case message
        case sentAt = "sent_at"
        case respondedAt = "responded_at"
    }
}
