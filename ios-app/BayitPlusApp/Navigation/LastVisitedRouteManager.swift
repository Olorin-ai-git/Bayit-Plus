import BayitCore
import BayitWidgetShared
import Foundation

// MARK: - Persistence Model

private struct LastVisitedData: Codable {
    let tab: String
    let deepLinkPath: String?
}

// MARK: - LastVisitedRouteManager

/// Persists and restores the last visited tab and route per user.
///
/// Uses the app-group `SharedDefaults` so the data survives process restarts
/// and is accessible to extensions (widgets, etc.). Storage is keyed per
/// user ID so multi-account devices stay isolated.
@Observable
final class LastVisitedRouteManager {
    private let defaults: SharedDefaults
    private let logger = BayitLogger(category: "LastVisitedRoute")

    private enum StorageKey {
        static let prefix = "lastVisitedRoute"

        static func forUser(_ userId: String) -> String {
            "\(prefix)_\(userId)"
        }
    }

    init(defaults: SharedDefaults = .shared) {
        self.defaults = defaults
    }

    // MARK: - Save

    /// Persists the current tab, and optionally the top-of-stack route, for the
    /// given user. Only restorable routes (those with a `toDeepLinkPath`) are
    /// stored; for non-restorable routes only the tab is saved.
    func save(tab: AppTab, route: Route? = nil, userId: String) {
        let path = route?.toDeepLinkPath
        let data = LastVisitedData(tab: tab.rawValue, deepLinkPath: path)
        defaults.encode(data, forKey: StorageKey.forUser(userId))
        logger.debug(
            "Saved last visited",
            context: ["tab": tab.rawValue, "path": path ?? "nil", "user": userId]
        )
    }

    // MARK: - Restore

    /// Returns the tab and route previously saved for the given user, or `nil`
    /// if no entry exists or the stored data is stale/invalid.
    func restore(userId: String) -> (tab: AppTab, route: Route?)? {
        guard let data: LastVisitedData = defaults.decode(
            LastVisitedData.self,
            forKey: StorageKey.forUser(userId)
        ) else {
            return nil
        }

        guard let tab = AppTab(rawValue: data.tab) else {
            logger.warning(
                "Stored tab value is no longer valid; clearing entry",
                context: ["storedTab": data.tab, "user": userId]
            )
            clear(userId: userId)
            return nil
        }

        var route: Route?
        if let path = data.deepLinkPath,
           let url = URL(string: "bayitplus://\(path)")
        {
            route = DeepLink.route(from: url)
            if route == nil {
                logger.warning(
                    "Stored deep link path did not resolve to a route",
                    context: ["path": path, "user": userId]
                )
            }
        }

        logger.debug(
            "Restored last visited",
            context: ["tab": tab.rawValue, "path": data.deepLinkPath ?? "nil", "user": userId]
        )
        return (tab, route)
    }

    // MARK: - Clear

    /// Removes the stored entry for the given user (e.g. on sign-out).
    func clear(userId: String) {
        defaults.removeObject(forKey: StorageKey.forUser(userId))
        logger.debug("Cleared last visited", context: ["user": userId])
    }
}
