import Foundation

/// Content types for player navigation
public enum ContentType: String, Hashable, Codable, Sendable {
    case live
    case liveTV
    case movie
    case series
    case episode
    case radio
    case podcast
    case audiobook

    /// Maps to the string expected by the downloads backend API
    var backendString: String {
        switch self {
        case .movie, .series: return "vod"
        case .episode: return "vod"
        case .podcast: return "podcast_episode"
        case .audiobook: return "audiobook"
        case .live, .liveTV: return "live"
        case .radio: return "radio"
        }
    }
}
