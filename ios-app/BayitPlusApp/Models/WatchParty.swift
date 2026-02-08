import Foundation

/// A participant's state within a watch party.
/// Maps to backend `ParticipantState` pydantic model.
struct ParticipantState: Codable, Sendable, Identifiable {
    var id: String { userId }
    let userId: String
    let userName: String
    let isSpeaking: Bool
    let isMuted: Bool
    let isVideoOn: Bool
    let joinedAt: Date

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case userName = "user_name"
        case isSpeaking = "is_speaking"
        case isMuted = "is_muted"
        case isVideoOn = "is_video_on"
        case joinedAt = "joined_at"
    }
}

/// A watch party / viewing room for shared content viewing.
/// Maps to backend `WatchPartyResponse` pydantic model.
struct WatchParty: Codable, Identifiable, Sendable {
    let id: String
    let hostId: String
    let hostName: String
    let contentId: String
    let contentType: String
    let contentTitle: String?
    let roomCode: String
    let isPrivate: Bool
    let maxParticipants: Int
    let audioEnabled: Bool
    let chatEnabled: Bool
    let syncPlayback: Bool
    let participants: [ParticipantState]
    let participantCount: Int
    let isActive: Bool
    let createdAt: Date
    let startedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case hostId = "host_id"
        case hostName = "host_name"
        case contentId = "content_id"
        case contentType = "content_type"
        case contentTitle = "content_title"
        case roomCode = "room_code"
        case isPrivate = "is_private"
        case maxParticipants = "max_participants"
        case audioEnabled = "audio_enabled"
        case chatEnabled = "chat_enabled"
        case syncPlayback = "sync_playback"
        case participants
        case participantCount = "participant_count"
        case isActive = "is_active"
        case createdAt = "created_at"
        case startedAt = "started_at"
    }
}
