import BayitCore
import Foundation

/// Manages recent search queries persisted in UserDefaults.
/// iOS equivalent of the web app's localStorage recent searches.
struct RecentSearchesService: Sendable {

    private let userDefaultsKey: String
    private let maxItems: Int
    private let logger = BayitLogger(category: "RecentSearchesService")

    init(
        userDefaultsKey: String = "bayit_recent_searches",
        maxItems: Int = 5
    ) {
        self.userDefaultsKey = userDefaultsKey
        self.maxItems = maxItems
    }

    /// Load recent searches from UserDefaults.
    func load() -> [String] {
        let stored = UserDefaults.standard.stringArray(forKey: userDefaultsKey) ?? []
        let capped = Array(stored.prefix(maxItems))
        logger.debug("Loaded recent searches", context: ["count": String(capped.count)])
        return capped
    }

    /// Save a new query to recent searches. Deduplicates and caps at maxItems.
    ///
    /// - Parameters:
    ///   - query: The search query to save.
    ///   - existing: Current recent searches list.
    /// - Returns: Updated recent searches list.
    func save(_ query: String, existing: [String]) -> [String] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return existing }

        var updated = existing.filter { $0 != trimmed }
        updated.insert(trimmed, at: 0)
        let capped = Array(updated.prefix(maxItems))
        UserDefaults.standard.set(capped, forKey: userDefaultsKey)
        logger.debug("Saved recent search", context: ["query": trimmed, "count": String(capped.count)])
        return capped
    }

    /// Clear all recent searches.
    func clear() {
        UserDefaults.standard.removeObject(forKey: userDefaultsKey)
        logger.debug("Cleared recent searches")
    }
}
