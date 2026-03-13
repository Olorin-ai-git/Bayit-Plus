#if os(tvOS)
    import BayitCore
    import Foundation
    import Observation

    /// Persists and restores the last visited tab and route for a given user.
    /// Storage uses the shared App Group UserDefaults so data survives reinstalls
    /// when the group container is preserved by the OS.
    @Observable
    final class TVLastVisitedRouteManager {
        // MARK: - Constants

        private enum Keys {
            static let tabSuffix = "tab"
            static let pathSuffix = "path"
        }

        // MARK: - Dependencies

        private let defaults: UserDefaults
        private let appGroupIdentifier: String
        private let logger = BayitLogger(category: "TVLastVisitedRoute")

        // MARK: - Init

        init(appGroupIdentifier: String) {
            self.appGroupIdentifier = appGroupIdentifier
            defaults = UserDefaults(suiteName: appGroupIdentifier) ?? .standard
        }

        // MARK: - Storage Keys

        private func tabKey(for userId: String) -> String {
            "tvLastVisitedRoute.\(userId).\(Keys.tabSuffix)"
        }

        private func pathKey(for userId: String) -> String {
            "tvLastVisitedRoute.\(userId).\(Keys.pathSuffix)"
        }

        // MARK: - Public API

        /// Persist the current tab and optional route for the given user.
        func save(tab: TVTab, route: TVRoute? = nil, userId: String) {
            defaults.set(tab.rawValue, forKey: tabKey(for: userId))
            if let deepLinkPath = route?.toDeepLinkPath() {
                defaults.set(deepLinkPath, forKey: pathKey(for: userId))
                logger.debug("Saved last visited: tab=\(tab.rawValue) path=\(deepLinkPath) user=\(userId)")
            } else {
                defaults.removeObject(forKey: pathKey(for: userId))
                logger.debug("Saved last visited: tab=\(tab.rawValue) (no route) user=\(userId)")
            }
        }

        /// Restore the last visited tab and route for the given user.
        /// Returns `nil` if no saved state exists.
        func restore(userId: String) -> (tab: TVTab, route: TVRoute?)? {
            guard let rawTab = defaults.string(forKey: tabKey(for: userId)),
                  let tab = TVTab(rawValue: rawTab)
            else {
                logger.debug("No last visited state for user=\(userId)")
                return nil
            }
            let route: TVRoute?
            if let path = defaults.string(forKey: pathKey(for: userId)) {
                route = TVRoute.restored(fromDeepLinkPath: path)
                logger.debug("Restored last visited: tab=\(rawTab) path=\(path) user=\(userId)")
            } else {
                route = nil
                logger.debug("Restored last visited: tab=\(rawTab) (no route) user=\(userId)")
            }
            return (tab: tab, route: route)
        }

        /// Remove all saved state for the given user (e.g. on sign-out).
        func clear(userId: String) {
            defaults.removeObject(forKey: tabKey(for: userId))
            defaults.removeObject(forKey: pathKey(for: userId))
            logger.debug("Cleared last visited state for user=\(userId)")
        }
    }
#endif
