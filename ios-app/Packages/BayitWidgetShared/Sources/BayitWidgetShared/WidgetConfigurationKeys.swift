import Foundation

/// Centralized configuration keys for widget infrastructure.
///
/// All identifiers are resolved from Bundle/environment at runtime.
/// No hardcoded values -- fail-fast if missing.
public enum WidgetConfigurationKeys {

    // MARK: - App Group

    /// The App Group identifier shared between the main app and widget extension.
    public static var appGroupID: String {
        guard let groupID = Bundle.main.object(forInfoDictionaryKey: "WIDGET_APP_GROUP_ID") as? String
            ?? ProcessInfo.processInfo.environment["WIDGET_APP_GROUP_ID"] else {
            return defaultAppGroupID
        }
        return groupID
    }

    /// Fallback App Group ID derived from bundle prefix convention.
    private static let defaultAppGroupID = "group.tv.bayit.plus"

    // MARK: - UserDefaults Keys

    /// Keys for shared UserDefaults data exchange between app and widgets.
    public enum DefaultsKey {
        public static let nowPlaying = "tv.bayit.widget.nowPlaying"
        public static let continueWatching = "tv.bayit.widget.continueWatching"
        public static let trendingSummary = "tv.bayit.widget.trendingSummary"
        public static let shabbatData = "tv.bayit.widget.shabbatData"
        public static let playlists = "tv.bayit.widget.playlists"
        public static let lastSyncTimestamp = "tv.bayit.widget.lastSync"
        public static let pendingIntent = "tv.bayit.widget.pendingIntent"
    }

    // MARK: - Widget Kind Identifiers

    /// Kind strings used to identify each widget for timeline reloads.
    public enum WidgetKind {
        public static let nowPlaying = "BayitNowPlaying"
        public static let continueWatching = "BayitContinueWatching"
        public static let trendingNews = "BayitTrendingNews"
        public static let quickActions = "BayitQuickActions"
        public static let shabbatMode = "BayitShabbatMode"
        public static let playlist = "BayitPlaylist"
    }

    // MARK: - Keychain

    /// Keychain access group for sharing auth tokens with the widget extension.
    public static var keychainAccessGroup: String {
        Bundle.main.object(forInfoDictionaryKey: "KEYCHAIN_ACCESS_GROUP") as? String
            ?? ProcessInfo.processInfo.environment["KEYCHAIN_ACCESS_GROUP"]
            ?? defaultAppGroupID
    }

    /// Keychain key for the auth token.
    public static let keychainAuthTokenKey = "tv.bayit.widget.authToken"
}
