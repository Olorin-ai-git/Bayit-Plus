import Foundation

/// Types of WebSocket messages received from the watch party backend.
enum WatchPartyMessageType: String, Codable, Sendable {
    case connected
    case chatMessage = "chat_message"
    case participantJoined = "participant_joined"
    case participantLeft = "participant_left"
    case playbackSync = "playback_sync"
    case hostChanged = "host_changed"
    case partyEnded = "party_ended"
    case error
}

/// Incoming WebSocket message envelope for watch party events.
struct WatchPartyWSMessage: Codable, Sendable {
    let type: WatchPartyMessageType
    let userId: String?
    let userName: String?
    let message: String?
    let position: Double?
    let isPlaying: Bool?
    let newHostId: String?
    let newHostName: String?
    let timestamp: Date?

    enum CodingKeys: String, CodingKey {
        case type
        case userId = "user_id"
        case userName = "user_name"
        case message
        case position
        case isPlaying = "is_playing"
        case newHostId = "new_host_id"
        case newHostName = "new_host_name"
        case timestamp
    }
}

/// A chat message displayed in the watch party chat feed.
struct PartyChatMessage: Identifiable, Sendable {
    let id: String
    let userId: String
    let userName: String
    let message: String
    let timestamp: Date
    let isSent: Bool
}

/// Request body for creating a watch party.
struct CreatePartyRequest: Encodable, Sendable {
    let contentId: String
    let contentType: String
    let isPrivate: Bool
    let maxParticipants: Int
    let chatEnabled: Bool
    let syncPlayback: Bool

    enum CodingKeys: String, CodingKey {
        case contentId = "content_id"
        case contentType = "content_type"
        case isPrivate = "is_private"
        case maxParticipants = "max_participants"
        case chatEnabled = "chat_enabled"
        case syncPlayback = "sync_playback"
    }
}

/// Request body for sending a chat message in a watch party.
struct PartyChatRequest: Encodable, Sendable {
    let partyId: String
    let message: String

    enum CodingKeys: String, CodingKey {
        case partyId = "party_id"
        case message
    }
}

/// Request body for syncing playback in a watch party.
struct PlaybackSyncRequest: Encodable, Sendable {
    let partyId: String
    let position: Double
    let isPlaying: Bool

    enum CodingKeys: String, CodingKey {
        case partyId = "party_id"
        case position
        case isPlaying = "is_playing"
    }
}
