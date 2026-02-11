import Foundation

/// A channel chat message.
struct ChannelChatMessage: Decodable, Sendable, Identifiable {
    let id: String
    let userId: String?
    let username: String?
    let avatarUrl: String?
    let content: String
    let timestamp: String?
    let type: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case username
        case avatarUrl = "avatar_url"
        case content
        case timestamp
        case type
    }
}

/// Request to send a channel chat message.
struct ChannelChatSendRequest: Encodable, Sendable {
    let content: String
    let channelId: String

    enum CodingKeys: String, CodingKey {
        case content
        case channelId = "channel_id"
    }
}

/// Response from channel chat history endpoint.
struct ChannelChatHistoryResponse: Decodable, Sendable {
    let messages: [ChannelChatMessage]?
    let channelId: String?

    enum CodingKeys: String, CodingKey {
        case messages
        case channelId = "channel_id"
    }
}

/// Stream limit error response from backend.
struct StreamLimitErrorResponse: Decodable, Sendable {
    let error: String?
    let maxStreams: Int?
    let activeDevices: [ActiveDevice]?

    enum CodingKeys: String, CodingKey {
        case error
        case maxStreams = "max_streams"
        case activeDevices = "active_devices"
    }
}

/// An active streaming device.
struct ActiveDevice: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let type: String?
    let lastActive: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case type
        case lastActive = "last_active"
    }
}
