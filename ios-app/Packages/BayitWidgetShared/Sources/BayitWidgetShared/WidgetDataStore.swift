import Foundation
import BayitCore

/// Actor-based data store for reading and writing widget data via SharedDefaults.
///
/// All access is serialized through the actor to prevent data races
/// between the main app writing and the widget extension reading.
public actor WidgetDataStore {

    private let defaults: SharedDefaults
    private let logger = BayitLogger(category: "WidgetDataStore")

    /// Shared instance using the default SharedDefaults.
    public static let shared = WidgetDataStore()

    public init(defaults: SharedDefaults = .shared) {
        self.defaults = defaults
    }

    // MARK: - Now Playing

    public func writeNowPlaying(_ data: SharedNowPlayingData) {
        defaults.encode(data, forKey: WidgetConfigurationKeys.DefaultsKey.nowPlaying)
        logger.debug("Wrote now playing data", context: ["channel": data.channelName])
    }

    public func readNowPlaying() -> SharedNowPlayingData? {
        defaults.decode(SharedNowPlayingData.self, forKey: WidgetConfigurationKeys.DefaultsKey.nowPlaying)
    }

    public func clearNowPlaying() {
        defaults.removeObject(forKey: WidgetConfigurationKeys.DefaultsKey.nowPlaying)
    }

    // MARK: - Continue Watching

    public func writeContinueWatching(_ items: [SharedContinueWatchingItem]) {
        defaults.encode(items, forKey: WidgetConfigurationKeys.DefaultsKey.continueWatching)
        logger.debug("Wrote continue watching", context: ["count": String(items.count)])
    }

    public func readContinueWatching() -> [SharedContinueWatchingItem] {
        defaults.decode(
            [SharedContinueWatchingItem].self,
            forKey: WidgetConfigurationKeys.DefaultsKey.continueWatching
        ) ?? []
    }

    // MARK: - Playlists

    public func writePlaylists(_ items: [SharedPlaylistItem]) {
        defaults.encode(items, forKey: WidgetConfigurationKeys.DefaultsKey.playlists)
        logger.debug("Wrote playlists", context: ["count": String(items.count)])
    }

    public func readPlaylists() -> [SharedPlaylistItem] {
        defaults.decode(
            [SharedPlaylistItem].self,
            forKey: WidgetConfigurationKeys.DefaultsKey.playlists
        ) ?? []
    }

    // MARK: - Pending Intent

    public func writePendingIntent(_ intent: SharedPendingIntent) {
        defaults.encode(intent, forKey: WidgetConfigurationKeys.DefaultsKey.pendingIntent)
        logger.debug("Wrote pending intent", context: ["action": intent.action])
    }

    public func readPendingIntent() -> SharedPendingIntent? {
        defaults.decode(SharedPendingIntent.self, forKey: WidgetConfigurationKeys.DefaultsKey.pendingIntent)
    }

    public func clearPendingIntent() {
        defaults.removeObject(forKey: WidgetConfigurationKeys.DefaultsKey.pendingIntent)
    }
}
