import Foundation

/// Represents the current state of media playback.
public enum PlaybackState: Sendable, Equatable {
    /// No media loaded.
    case idle
    /// Media is loading / buffering before first play.
    case loading
    /// Pre-buffering: stream is ready but filling buffer before playback.
    case preBuffering
    /// Media is ready to play but paused.
    case ready
    /// Actively playing.
    case playing
    /// Paused by user.
    case paused
    /// Buffering during playback (stalled).
    case buffering
    /// Playback completed (reached end).
    case ended
    /// An error occurred.
    case failed(String)

    public var isActive: Bool {
        switch self {
        case .playing, .buffering:
            return true
        default:
            return false
        }
    }

    public var canPlay: Bool {
        switch self {
        case .loading, .preBuffering, .ready, .paused, .ended:
            return true
        default:
            return false
        }
    }
}

/// Type of media content for audio session configuration.
public enum MediaContentType: String, Sendable {
    /// Live TV channel (HLS, no seek).
    case liveTV
    /// Video on demand (HLS/MP4, seekable).
    case vod
    /// Radio station (continuous audio stream).
    case radio
    /// Podcast episode (audio, seekable).
    case podcast
    /// Audiobook chapter (audio, seekable).
    case audiobook
    /// YouTube video on demand (seekable, no download).
    case youtubeVOD
    /// YouTube live stream (not seekable, no recording).
    case youtubeLive

    /// Whether this content type supports seeking.
    public var isSeekable: Bool {
        switch self {
        case .vod, .podcast, .audiobook, .youtubeVOD:
            return true
        case .liveTV, .radio, .youtubeLive:
            return false
        }
    }

    /// Whether this content type is audio-only (enables background playback).
    public var isAudioOnly: Bool {
        switch self {
        case .radio, .podcast, .audiobook:
            return true
        case .liveTV, .vod, .youtubeVOD, .youtubeLive:
            return false
        }
    }

    /// Whether this content type is a live stream.
    public var isLive: Bool {
        switch self {
        case .liveTV, .radio, .youtubeLive:
            return true
        case .vod, .podcast, .audiobook, .youtubeVOD:
            return false
        }
    }

    /// Whether this content originates from a YouTube source.
    public var isYouTubeSource: Bool {
        switch self {
        case .youtubeVOD, .youtubeLive:
            return true
        default:
            return false
        }
    }
}

/// Metadata for the currently playing media item.
public struct NowPlayingMetadata: Sendable {
    public let title: String
    public let artist: String?
    public let albumTitle: String?
    public let artworkURL: URL?
    public let duration: TimeInterval?
    public let contentType: MediaContentType
    public let isLiveStream: Bool

    public init(
        title: String,
        artist: String? = nil,
        albumTitle: String? = nil,
        artworkURL: URL? = nil,
        duration: TimeInterval? = nil,
        contentType: MediaContentType,
        isLiveStream: Bool = false
    ) {
        self.title = title
        self.artist = artist
        self.albumTitle = albumTitle
        self.artworkURL = artworkURL
        self.duration = duration
        self.contentType = contentType
        self.isLiveStream = isLiveStream
    }
}
