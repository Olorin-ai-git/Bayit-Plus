import BayitCore
import BayitMedia
import BayitWidgetShared
import Foundation
import Observation

/// Bridges MediaPlayer state changes to WidgetDataSyncService for immediate widget updates.
/// Observes media player state and syncs to widgets when playback starts, pauses, or changes.
@Observable
@MainActor
final class MediaPlayerWidgetBridge {
    private let mediaPlayer: MediaPlayer
    private let widgetSync: WidgetDataSyncService
    private let logger = BayitLogger(category: "MediaPlayerWidgetBridge")

    private var lastSyncedState: MediaPlayerState?

    init(mediaPlayer: MediaPlayer, widgetSync: WidgetDataSyncService) {
        self.mediaPlayer = mediaPlayer
        self.widgetSync = widgetSync
    }

    /// Sync current media player state to widgets immediately.
    /// Call this when playback starts, pauses, or content changes.
    func syncNow(
        channelID: String,
        channelName: String,
        showTitle: String,
        logoURL: URL?,
        contentType: SharedContentType,
        nextShowTitle: String? = nil,
        nextShowTime: String? = nil
    ) async {
        let currentState = MediaPlayerState(
            channelID: channelID,
            isPlaying: mediaPlayer.state == .playing,
            progress: mediaPlayer.progress
        )

        // Skip sync if state hasn't changed
        if let last = lastSyncedState, last == currentState {
            return
        }

        await widgetSync.syncNowPlaying(
            channelName: channelName,
            showTitle: showTitle,
            logoURL: logoURL,
            progress: mediaPlayer.progress,
            isPlaying: mediaPlayer.state == .playing,
            contentType: contentType,
            nextShowTitle: nextShowTitle,
            nextShowTime: nextShowTime,
            channelID: channelID
        )

        lastSyncedState = currentState
        logger.info("Synced media state to widgets", context: [
            "channel": channelName,
            "isPlaying": String(mediaPlayer.state == .playing),
        ])
    }

    /// Sync using app ContentType (automatically mapped to SharedContentType).
    func syncNow(
        contentID: String,
        contentType: ContentType,
        title: String,
        subtitle: String?,
        artworkURL: URL?
    ) async {
        let widgetContentType = mapContentType(contentType)
        await syncNow(
            channelID: contentID,
            channelName: title,
            showTitle: subtitle ?? title,
            logoURL: artworkURL,
            contentType: widgetContentType,
            nextShowTitle: nil,
            nextShowTime: nil
        )
    }

    /// Clear Now Playing widget when playback stops.
    func clearNowPlaying() async {
        await widgetSync.clearNowPlaying()
        lastSyncedState = nil
        logger.info("Cleared Now Playing widget")
    }

    /// Map app ContentType to widget SharedContentType.
    private func mapContentType(_ type: ContentType) -> SharedContentType {
        switch type {
        case .live, .liveTV: return .liveTV
        case .radio: return .radio
        case .podcast: return .podcast
        case .audiobook: return .audiobook
        case .movie, .series, .episode: return .vod
        case .youtubeVOD: return .vod
        case .youtubeLive: return .liveTV
        }
    }
}

/// Minimal state tracker to avoid redundant syncs.
private struct MediaPlayerState: Equatable {
    let channelID: String
    let isPlaying: Bool
    let progress: Double
}
