import BayitCore
import Foundation

/// Actor-based offline caching service for storing and retrieving data with TTL support.
/// Uses the app's caches directory for storage with automatic expiration.
actor OfflineCacheService {

    private let cacheDirectory: URL
    private let logger = BayitLogger(category: "OfflineCache")

    init() {
        let caches = FileManager.default.urls(
            for: .cachesDirectory,
            in: .userDomainMask
        ).first!
        self.cacheDirectory = caches.appendingPathComponent("bayit_offline_cache")

        Task {
            await createCacheDirectory()
        }
    }

    /// Saves encodable data to cache with a given key
    func save<T: Encodable & Sendable>(_ data: T, forKey key: String) async {
        let fileURL = cacheURL(forKey: key)
        let metadataURL = metadataURL(forKey: key)

        do {
            let encoder = JSONEncoder()
            encoder.keyEncodingStrategy = .convertToSnakeCase
            let jsonData = try encoder.encode(data)

            try jsonData.write(to: fileURL, options: .atomic)

            let metadata = CacheMetadata(createdAt: Date())
            let metadataData = try encoder.encode(metadata)
            try metadataData.write(to: metadataURL, options: .atomic)

            logger.info("Cached data", context: ["key": key])
        } catch {
            logger.error("Failed to cache data", error: error, context: ["key": key])
        }
    }

    /// Loads decodable data from cache for a given key
    func load<T: Decodable & Sendable>(forKey key: String, as type: T.Type) async -> T? {
        let fileURL = cacheURL(forKey: key)

        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            logger.info("Cache miss", context: ["key": key])
            return nil
        }

        do {
            let data = try Data(contentsOf: fileURL)
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            let decoded = try decoder.decode(type, from: data)

            logger.info("Cache hit", context: ["key": key])
            return decoded
        } catch {
            logger.error("Failed to load cached data", error: error, context: ["key": key])
            return nil
        }
    }

    /// Deletes cached data for a given key
    func delete(forKey key: String) async {
        let fileURL = cacheURL(forKey: key)
        let metadataURL = metadataURL(forKey: key)

        do {
            try FileManager.default.removeItem(at: fileURL)
            try? FileManager.default.removeItem(at: metadataURL)
            logger.info("Deleted cache", context: ["key": key])
        } catch {
            logger.error("Failed to delete cache", error: error, context: ["key": key])
        }
    }

    /// Clears all cached items older than the specified duration
    func clearExpired(olderThan duration: TimeInterval) async {
        guard let contents = try? FileManager.default.contentsOfDirectory(
            at: cacheDirectory,
            includingPropertiesForKeys: nil
        ) else {
            return
        }

        let cutoffDate = Date().addingTimeInterval(-duration)

        for fileURL in contents where fileURL.pathExtension == "json" {
            let key = fileURL.deletingPathExtension().lastPathComponent
            let metadataURL = metadataURL(forKey: key)

            guard let metadataData = try? Data(contentsOf: metadataURL),
                  let metadata = try? JSONDecoder().decode(CacheMetadata.self, from: metadataData) else {
                continue
            }

            if metadata.createdAt < cutoffDate {
                await delete(forKey: key)
            }
        }

        logger.info("Cleared expired cache items")
    }

    // MARK: - Private Helpers

    private func createCacheDirectory() {
        do {
            try FileManager.default.createDirectory(
                at: cacheDirectory,
                withIntermediateDirectories: true
            )
        } catch {
            logger.error("Failed to create cache directory", error: error)
        }
    }

    private func cacheURL(forKey key: String) -> URL {
        cacheDirectory.appendingPathComponent("\(key).json")
    }

    private func metadataURL(forKey key: String) -> URL {
        cacheDirectory.appendingPathComponent("\(key).metadata")
    }

    private struct CacheMetadata: Codable, Sendable {
        let createdAt: Date
    }
}
