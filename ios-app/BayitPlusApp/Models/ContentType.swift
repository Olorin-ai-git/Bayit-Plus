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
}
