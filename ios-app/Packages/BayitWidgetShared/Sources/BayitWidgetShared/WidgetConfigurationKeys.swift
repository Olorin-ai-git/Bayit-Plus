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
            fatalError("""
                WIDGET_APP_GROUP_ID not configured.
                Add to Info.plist or set WIDGET_APP_GROUP_ID environment variable.
                Required for widget data sharing.
                """)
        }
        return groupID
    }

    // MARK: - UserDefaults Keys

    /// Keys for shared UserDefaults data exchange between app and widgets.
    public enum DefaultsKey {
        public static let nowPlaying = "tv.bayit.widget.nowPlaying"
        public static let continueWatching = "tv.bayit.widget.continueWatching"
        public static let playlists = "tv.bayit.widget.playlists"
        public static let lastSyncTimestamp = "tv.bayit.widget.lastSync"
        public static let pendingIntent = "tv.bayit.widget.pendingIntent"
    }

    // MARK: - Widget Kind Identifiers

    /// Kind strings used to identify each widget for timeline reloads.
    public enum WidgetKind {
        public static let nowPlaying = "BayitNowPlaying"
        public static let continueWatching = "BayitContinueWatching"
        public static let quickActions = "BayitQuickActions"
        public static let playlist = "BayitPlaylist"
        public static let configurablePlaylist = "BayitConfigurablePlaylist"
    }

    // MARK: - Keychain

    /// Keychain access group for sharing auth tokens with the widget extension.
    public static var keychainAccessGroup: String {
        guard let accessGroup = Bundle.main.object(forInfoDictionaryKey: "KEYCHAIN_ACCESS_GROUP") as? String
            ?? ProcessInfo.processInfo.environment["KEYCHAIN_ACCESS_GROUP"] else {
            fatalError("""
                KEYCHAIN_ACCESS_GROUP not configured.
                Add to Info.plist or set KEYCHAIN_ACCESS_GROUP environment variable.
                Required for keychain data sharing between app and widgets.
                """)
        }
        return accessGroup
    }

    /// Keychain key for the auth token.
    public static let keychainAuthTokenKey = "tv.bayit.widget.authToken"
}
