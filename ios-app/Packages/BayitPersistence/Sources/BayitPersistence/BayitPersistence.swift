import BayitCore
import Foundation

/// Thread-safe file-system key-value cache for persistent Codable data.
///
/// Stores values as JSON files in the app's Caches directory, keyed by string
/// identifiers. Actor isolation ensures all reads and writes are data-race free.
///
/// Usage:
/// ```swift
/// let cache = FileCache()
/// try await cache.save(myStruct, forKey: "subtitle-en-ep42")
/// let cached = await cache.load(forKey: "subtitle-en-ep42", as: MyStruct.self)
/// ```
public actor FileCache {
    private let directory: URL
    private let logger = BayitLogger(category: "FileCache")

    /// Shared instance using the default "BayitCache" subdirectory.
    public static let shared = FileCache()

    /// Creates a cache rooted at `Caches/<subdirectory>/`.
    public init(subdirectory: String = "BayitCache") {
        let base = FileManager.default
            .urls(for: .cachesDirectory, in: .userDomainMask)[0]
        directory = base.appendingPathComponent(subdirectory, isDirectory: true)
        try? FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )
    }

    // MARK: - Read / Write

    /// Persist a `Codable` value under the given key.
    /// Throws if JSON encoding or disk write fails.
    public func save<T: Codable>(_ value: T, forKey key: String) throws {
        let data = try JSONEncoder().encode(value)
        try data.write(to: fileURL(for: key), options: .atomic)
    }

    /// Retrieve a `Codable` value for the given key.
    /// Returns `nil` if the key is absent or the stored JSON cannot be decoded.
    public func load<T: Codable>(forKey key: String, as type: T.Type) -> T? {
        guard let data = try? Data(contentsOf: fileURL(for: key)) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    /// Remove the cached file for a specific key.
    public func remove(forKey key: String) throws {
        let url = fileURL(for: key)
        guard FileManager.default.fileExists(atPath: url.path) else { return }
        try FileManager.default.removeItem(at: url)
        logger.debug("Cache entry removed", context: ["key": key])
    }

    /// Remove all cached files in this subdirectory.
    public func removeAll() throws {
        let contents = try FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: nil
        )
        try contents.forEach { try FileManager.default.removeItem(at: $0) }
        logger.info("Cache cleared", context: ["directory": directory.lastPathComponent])
    }

    /// Approximate total size of cached data in bytes.
    public func totalSize() -> Int {
        let contents = (try? FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: [.fileSizeKey]
        )) ?? []
        return contents.reduce(0) { sum, url in
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            return sum + size
        }
    }

    // MARK: - Private

    private func fileURL(for key: String) -> URL {
        let sanitized = key
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: ":", with: "_")
            .replacingOccurrences(of: " ", with: "_")
        return directory.appendingPathComponent("\(sanitized).json")
    }
}
