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

    /// Whether this content type belongs to the owner's private library.
    /// When `ownerMode` is false, content of these types should be filtered out.
    var isOwnerOnly: Bool {
        switch self {
        case .movie, .series, .episode:
            return true
        case .live, .liveTV, .radio, .podcast, .audiobook:
            return false
        }
    }

    /// Returns true if the raw type string represents owner-only content.
    /// Handles backend type strings like "vod", "movie", "series", "episode",
    /// "film", "kids", "children", "music", "documentary".
    static func isOwnerOnlyType(_ typeString: String?) -> Bool {
        guard let raw = typeString?.lowercased() else { return false }
        let ownerTypes = ["vod", "movie", "series", "episode", "film",
                          "kids", "children", "music", "documentary"]
        return ownerTypes.contains(where: { raw.contains($0) })
    }

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
