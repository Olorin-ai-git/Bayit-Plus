import BayitCore
import Foundation

/// Caches enrichment results in UserDefaults keyed by external ID.
public struct BYOCEnrichmentCache: Sendable {
    private static let storageKey = "tv.bayit.plus.byoc.enrichment"
    private static let logger = BayitLogger(category: "BYOCEnrichmentCache")

    private static var decoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }

    private static var encoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return encoder
    }

    /// Retrieve a cached enrichment result for a given external ID.
    public static func get(
        _ externalId: String,
        defaults: UserDefaults = .standard
    ) -> BYOCEnrichmentResult? {
        let store = loadStore(defaults: defaults)
        guard let data = store[externalId] else { return nil }
        do {
            return try decoder.decode(
                BYOCEnrichmentResult.self, from: data
            )
        } catch {
            logger.error(
                "Failed to decode cached enrichment",
                error: error,
                context: ["externalId": externalId]
            )
            return nil
        }
    }

    /// Cache an enrichment result for a given external ID.
    public static func set(
        _ result: BYOCEnrichmentResult,
        for externalId: String,
        defaults: UserDefaults = .standard
    ) {
        var store = loadStore(defaults: defaults)
        do {
            let data = try encoder.encode(result)
            store[externalId] = data
            saveStore(store, defaults: defaults)
        } catch {
            logger.error(
                "Failed to encode enrichment for cache",
                error: error,
                context: ["externalId": externalId]
            )
        }
    }

    /// Remove a cached enrichment result by external ID.
    public static func remove(
        _ externalId: String,
        defaults: UserDefaults = .standard
    ) {
        var store = loadStore(defaults: defaults)
        store.removeValue(forKey: externalId)
        saveStore(store, defaults: defaults)
    }

    /// Return all cached enrichment results.
    public static func allResults(
        defaults: UserDefaults = .standard
    ) -> [String: BYOCEnrichmentResult] {
        let store = loadStore(defaults: defaults)
        var results: [String: BYOCEnrichmentResult] = [:]
        for (key, data) in store {
            if let result = try? decoder.decode(
                BYOCEnrichmentResult.self, from: data
            ) {
                results[key] = result
            }
        }
        return results
    }

    // MARK: - Private

    private static func loadStore(
        defaults: UserDefaults
    ) -> [String: Data] {
        guard let raw = defaults.dictionary(forKey: storageKey)
        else { return [:] }
        var store: [String: Data] = [:]
        for (key, value) in raw {
            if let data = value as? Data {
                store[key] = data
            }
        }
        return store
    }

    private static func saveStore(
        _ store: [String: Data],
        defaults: UserDefaults
    ) {
        defaults.set(store, forKey: storageKey)
    }
}
