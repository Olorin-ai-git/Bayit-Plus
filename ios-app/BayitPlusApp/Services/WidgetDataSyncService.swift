import BayitCore
import BayitWidgetShared
import Foundation
import Observation
import WidgetKit

/// Bridges main app state to WidgetKit widgets by writing shared data
/// and triggering timeline reloads for each widget kind.
@Observable
@MainActor
final class WidgetDataSyncService {

    // MARK: - Dependencies

    private let store: WidgetDataStore
    private let logger = BayitLogger(category: "WidgetDataSync")

    // MARK: - Init

    init(store: WidgetDataStore = .shared) {
        self.store = store
    }

    // MARK: - Now Playing

    func syncNowPlaying(
        channelName: String,
        showTitle: String,
        logoURL: URL?,
        progress: Double,
        isPlaying: Bool,
        contentType: SharedContentType,
        nextShowTitle: String?,
        nextShowTime: String?,
        channelID: String
    ) async {
        let data = SharedNowPlayingData(
            channelName: channelName,
            showTitle: showTitle,
            logoURL: logoURL,
            progress: progress,
            isPlaying: isPlaying,
            contentType: contentType,
            nextShowTitle: nextShowTitle,
            nextShowTime: nextShowTime,
            channelID: channelID
        )
        await store.writeNowPlaying(data)
        WidgetCenter.shared.reloadTimelines(
            ofKind: WidgetConfigurationKeys.WidgetKind.nowPlaying
        )
        logger.info("Synced now playing", context: [
            "channel": channelName,
            "show": showTitle
        ])
    }

    func clearNowPlaying() async {
        await store.clearNowPlaying()
        WidgetCenter.shared.reloadTimelines(
            ofKind: WidgetConfigurationKeys.WidgetKind.nowPlaying
        )
        logger.info("Cleared now playing data")
    }

    // MARK: - Continue Watching

    func syncContinueWatching(_ items: [SharedContinueWatchingItem]) async {
        await store.writeContinueWatching(items)
        WidgetCenter.shared.reloadTimelines(
            ofKind: WidgetConfigurationKeys.WidgetKind.continueWatching
        )
        logger.info("Synced continue watching", context: [
            "count": String(items.count)
        ])
    }

    // MARK: - Playlists

    func syncPlaylists(_ items: [SharedPlaylistItem]) async {
        await store.writePlaylists(items)
        WidgetCenter.shared.reloadTimelines(
            ofKind: WidgetConfigurationKeys.WidgetKind.playlist
        )
        WidgetCenter.shared.reloadTimelines(
            ofKind: WidgetConfigurationKeys.WidgetKind.configurablePlaylist
        )
        logger.info("Synced playlists", context: [
            "count": String(items.count)
        ])
    }
}
