import Foundation

/// Status of a friend request, matching backend `FriendRequestStatus` enum.
enum FriendRequestStatus: String, Codable, Sendable {
    case pending
    case accepted
    case rejected
    case cancelled
}

/// A friend request sent or received by the user.
/// Maps to the backend `FriendRequest` Beanie document (serialized via `.dict()`).
/// Note: APIClient uses `.convertFromSnakeCase` — no CodingKeys needed for snake_case.
/// Beanie outputs `_id` for the document ID, handled via custom `init(from:)`.
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
    let sentAt: Date?
    let respondedAt: Date?

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: DynamicCodingKey.self)
        // Beanie outputs `_id`; convertFromSnakeCase may produce `Id` or `_id`
        if let val = try? container.decode(String.self, forKey: DynamicCodingKey("Id")) {
            id = val
        } else if let val = try? container.decode(String.self, forKey: DynamicCodingKey("id")) {
            id = val
        } else if let val = try? container.decode(String.self, forKey: DynamicCodingKey("_id")) {
            id = val
        } else {
            id = UUID().uuidString
        }
        senderId = try container.decode(String.self, forKey: DynamicCodingKey("senderId"))
        senderName = try container.decode(String.self, forKey: DynamicCodingKey("senderName"))
        senderAvatar = try container.decodeIfPresent(String.self, forKey: DynamicCodingKey("senderAvatar"))
        receiverId = try container.decode(String.self, forKey: DynamicCodingKey("receiverId"))
        receiverName = try container.decode(String.self, forKey: DynamicCodingKey("receiverName"))
        receiverAvatar = try container.decodeIfPresent(String.self, forKey: DynamicCodingKey("receiverAvatar"))
        status = try container.decode(FriendRequestStatus.self, forKey: DynamicCodingKey("status"))
        message = try container.decodeIfPresent(String.self, forKey: DynamicCodingKey("message"))
        sentAt = try container.decodeIfPresent(Date.self, forKey: DynamicCodingKey("sentAt"))
        respondedAt = try container.decodeIfPresent(Date.self, forKey: DynamicCodingKey("respondedAt"))
    }
}

/// Generic coding key for dynamic key lookup.
private struct DynamicCodingKey: CodingKey {
    var stringValue: String
    var intValue: Int?
    init(_ string: String) {
        stringValue = string; intValue = nil
    }

    init?(stringValue: String) {
        self.stringValue = stringValue; intValue = nil
    }

    init?(intValue: Int) {
        self.intValue = intValue; stringValue = "\(intValue)"
    }
}
