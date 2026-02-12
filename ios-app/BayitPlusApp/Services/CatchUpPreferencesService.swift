import BayitCore
import Foundation

/// Persists per-channel catch-up auto-prompt dismiss state in UserDefaults.
/// Follows the same pattern as `RecentSearchesService`.
struct CatchUpPreferencesService: Sendable {

    private let keyPrefix: String
    private let logger = BayitLogger(category: "CatchUpPreferences")

    init(keyPrefix: String = "bayit_catchup_dismissed_") {
        self.keyPrefix = keyPrefix
    }

    /// Whether the auto-prompt has been dismissed for a specific channel.
    func isDismissed(channelId: String) -> Bool {
        let key = keyPrefix + channelId
        let dismissed = UserDefaults.standard.bool(forKey: key)
        logger.debug("Check dismissed", context: [
            "channelId": channelId,
            "dismissed": String(dismissed)
        ])
        return dismissed
    }

    /// Persist that the user dismissed the auto-prompt for this channel.
    func setDismissed(channelId: String) {
        let key = keyPrefix + channelId
        UserDefaults.standard.set(true, forKey: key)
        logger.debug("Set dismissed", context: ["channelId": channelId])
    }

    /// Clear the dismiss state for a specific channel (re-enables auto-prompt).
    func clearDismissed(channelId: String) {
        let key = keyPrefix + channelId
        UserDefaults.standard.removeObject(forKey: key)
        logger.debug("Cleared dismissed", context: ["channelId": channelId])
    }
}
