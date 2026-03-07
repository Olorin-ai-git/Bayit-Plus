import Foundation

/// AI capabilities available for a given BYOC source type.
public struct BYOCCapabilities: Sendable, Equatable {
    public let dubbing: Bool
    public let liveSubtitles: Bool
    public let interactiveSubtitles: Bool
    public let trivia: Bool
    public let audioOverlayOnly: Bool

    public static let full = BYOCCapabilities(
        dubbing: true,
        liveSubtitles: true,
        interactiveSubtitles: false,
        trivia: true,
        audioOverlayOnly: false
    )

    public static let audioOnly = BYOCCapabilities(
        dubbing: false,
        liveSubtitles: false,
        interactiveSubtitles: false,
        trivia: false,
        audioOverlayOnly: true
    )

    public static let none = BYOCCapabilities(
        dubbing: false,
        liveSubtitles: false,
        interactiveSubtitles: false,
        trivia: false,
        audioOverlayOnly: false
    )

    /// Resolve capabilities for a source type.
    public static func capabilities(for sourceType: BYOCSourceType) -> BYOCCapabilities {
        switch sourceType {
        case .iptv, .xtream, .plex:
            return .full
        case .youtube:
            return .audioOnly
        }
    }
}
