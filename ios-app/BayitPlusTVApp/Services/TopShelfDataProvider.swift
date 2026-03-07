import BayitCore
import Foundation

/// Caches continue watching and trending data into App Groups shared storage
/// so the Top Shelf extension can display real content.
///
/// Data is written to `UserDefaults(suiteName: "group.tv.bayit.plus")`
/// and read by `TopShelfProvider` in the extension target.
enum TopShelfDataProvider {
    private static let logger = BayitLogger(category: "TopShelfData")

    // MARK: - Shared Keys

    static let continueWatchingKey = "topshelf.continueWatching"
    static let trendingKey = "topshelf.trending"
    static let liveChannelsKey = "topshelf.liveChannels"

    // MARK: - Write (Main App)

    /// Cache continue watching items to shared storage for the Top Shelf extension.
    static func cacheContinueWatching(_ items: [TopShelfCachedItem]) {
        guard let defaults = sharedDefaults else { return }
        do {
            let data = try JSONEncoder().encode(items)
            defaults.set(data, forKey: continueWatchingKey)
            logger.info("Cached \(items.count) continue watching items for Top Shelf")
        } catch {
            logger.error("Failed to encode continue watching for Top Shelf: \(error)")
        }
    }

    /// Cache trending items to shared storage for the Top Shelf extension.
    static func cacheTrending(_ items: [TopShelfCachedItem]) {
        guard let defaults = sharedDefaults else { return }
        do {
            let data = try JSONEncoder().encode(items)
            defaults.set(data, forKey: trendingKey)
            logger.info("Cached \(items.count) trending items for Top Shelf")
        } catch {
            logger.error("Failed to encode trending for Top Shelf: \(error)")
        }
    }

    /// Cache live channel items to shared storage for the Top Shelf extension.
    static func cacheLiveChannels(_ items: [TopShelfCachedItem]) {
        guard let defaults = sharedDefaults else { return }
        do {
            let data = try JSONEncoder().encode(items)
            defaults.set(data, forKey: liveChannelsKey)
            logger.info("Cached \(items.count) live channels for Top Shelf")
        } catch {
            logger.error("Failed to encode live channels for Top Shelf: \(error)")
        }
    }

    // MARK: - Read (Extension)

    /// Load cached continue watching items from shared storage.
    static func loadContinueWatching() -> [TopShelfCachedItem] {
        decode(forKey: continueWatchingKey)
    }

    /// Load cached trending items from shared storage.
    static func loadTrending() -> [TopShelfCachedItem] {
        decode(forKey: trendingKey)
    }

    /// Load cached live channel items from shared storage.
    static func loadLiveChannels() -> [TopShelfCachedItem] {
        decode(forKey: liveChannelsKey)
    }

    // MARK: - Private

    private static var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: TopShelfConstants.appGroupID)
    }

    private static func decode(forKey key: String) -> [TopShelfCachedItem] {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: key) else { return [] }
        do {
            return try JSONDecoder().decode([TopShelfCachedItem].self, from: data)
        } catch {
            logger.error("Failed to decode Top Shelf data for key \(key): \(error)")
            return []
        }
    }
}

// MARK: - Cached Item Model

/// Lightweight model for Top Shelf data exchange via App Groups.
struct TopShelfCachedItem: Codable, Sendable {
    let id: String
    let title: String
    let imageURL: String?
}

// MARK: - Constants

enum TopShelfConstants {
    static let appGroupID = "group.tv.bayit.plus"
}
