import BayitCore
import Foundation

/// Persists BYOC source configurations to UserDefaults.
public enum BYOCSourceStore {
    private static let logger = BayitLogger(category: "BYOCSourceStore")
    private static let storageKey = "tv.bayit.plus.byoc.sources"
    private static let encoder = JSONEncoder()
    private static let decoder = JSONDecoder()

    /// Load all configured sources.
    public static func loadSources(
        defaults: UserDefaults = .standard
    ) -> [BYOCSourceConfig] {
        guard let data = defaults.data(forKey: storageKey) else {
            return []
        }
        do {
            return try decoder.decode([BYOCSourceConfig].self, from: data)
        } catch {
            logger.error(
                "Failed to decode BYOC sources",
                error: error,
                context: [:]
            )
            return []
        }
    }

    /// Save all configured sources.
    public static func saveSources(
        _ sources: [BYOCSourceConfig],
        defaults: UserDefaults = .standard
    ) {
        do {
            let data = try encoder.encode(sources)
            defaults.set(data, forKey: storageKey)
        } catch {
            logger.error(
                "Failed to encode BYOC sources",
                error: error,
                context: [:]
            )
        }
    }

    /// Add a single source.
    public static func addSource(
        _ source: BYOCSourceConfig,
        defaults: UserDefaults = .standard
    ) {
        var sources = loadSources(defaults: defaults)
        sources.append(source)
        saveSources(sources, defaults: defaults)
    }

    /// Remove a source by ID.
    public static func removeSource(
        id: String,
        defaults: UserDefaults = .standard
    ) {
        var sources = loadSources(defaults: defaults)
        sources.removeAll { $0.id == id }
        saveSources(sources, defaults: defaults)
    }
}
