import Foundation

/// Response from the Pause & Ask backend endpoint.
/// Contains animated lip-sync videos for both the user avatar and character.
struct PauseAskResponse: Codable {
    let userPolishedText: String
    let userAudioUrl: String
    let userAnimatedVideoUrl: String
    let userVideoDuration: Double
    let characterName: String
    let characterResponseText: String
    let characterAudioUrl: String
    let characterAnimatedVideoUrl: String
    let characterVideoDuration: Double
}

/// Tracks the current phase of a Pause & Ask interaction.
enum PauseAskPhase: String {
    case selecting
    case input
    case polishing
    case userSpeaking
    case transition
    case characterSpeaking
    case idle
    case error
}
