import Foundation

// MARK: - Avatar Mode

/// Visual and behavioral states for the AI avatar.
enum AvatarState: String, Codable, Sendable {
    case idle
    case listening
    case thinking
    case speaking
    case celebrating
}

/// User preferences for the AI avatar appearance and behavior.
struct AvatarPreference: Decodable, Sendable {
    let avatarStyle: String?
    let voiceId: String?
    let personality: String?
    let animationLevel: String?
}

/// Request body for updating avatar preferences.
struct AvatarPreferenceUpdate: Encodable, Sendable {
    let avatarStyle: String?
    let voiceId: String?
    let personality: String?
    let animationLevel: String?
}

/// A dialogue line spoken by the AI avatar.
struct AvatarDialogue: Decodable, Sendable, Identifiable {
    let id: String
    let text: String?
    let emotion: String?
    let action: String?
}
