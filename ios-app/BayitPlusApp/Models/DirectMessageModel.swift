import Foundation

/// A direct message between friends.
/// Maps to the backend `DirectMessageResponse` pydantic model.
/// Named `DirectMessageModel` to avoid collision with the Beanie document name.
struct DirectMessageModel: Codable, Identifiable, Sendable {
    let id: String
    let senderId: String
    let senderName: String
    let senderAvatar: String?
    let receiverId: String
    let receiverName: String
    let receiverAvatar: String?
    let message: String
    let displayMessage: String
    let messageType: String
    let sourceLanguage: String
    let isTranslated: Bool
    let translationAvailable: Bool
    let read: Bool
    let readAt: Date?
    let reactions: [String: [String]]
    let timestamp: Date

    enum CodingKeys: String, CodingKey {
        case id
        case senderId = "sender_id"
        case senderName = "sender_name"
        case senderAvatar = "sender_avatar"
        case receiverId = "receiver_id"
        case receiverName = "receiver_name"
        case receiverAvatar = "receiver_avatar"
        case message
        case displayMessage = "display_message"
        case messageType = "message_type"
        case sourceLanguage = "source_language"
        case isTranslated = "is_translated"
        case translationAvailable = "translation_available"
        case read
        case readAt = "read_at"
        case reactions
        case timestamp
    }
}
