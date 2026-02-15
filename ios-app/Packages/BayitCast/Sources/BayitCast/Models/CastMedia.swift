import Foundation

/// Media information for casting to a Google Cast device.
public struct CastMedia: Sendable, Equatable {
    public let contentId: String
    public let title: String
    public let streamUrl: URL
    public let posterUrl: URL?
    public let duration: TimeInterval?
    public let subtitleTracks: [SubtitleTrack]

    public init(
        contentId: String,
        title: String,
        streamUrl: URL,
        posterUrl: URL? = nil,
        duration: TimeInterval? = nil,
        subtitleTracks: [SubtitleTrack] = []
    ) {
        self.contentId = contentId
        self.title = title
        self.streamUrl = streamUrl
        self.posterUrl = posterUrl
        self.duration = duration
        self.subtitleTracks = subtitleTracks
    }
}

/// Subtitle track for cast media.
public struct SubtitleTrack: Sendable, Equatable {
    public let language: String
    public let url: URL
    public let name: String?

    public init(
        language: String,
        url: URL,
        name: String? = nil
    ) {
        self.language = language
        self.url = url
        self.name = name
    }
}
