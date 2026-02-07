import BayitCore
import Foundation

/// Loads, parses, and caches JSON locale files from the package bundle.
///
/// Locale files are stored as flat JSON files with nested keys (e.g., `"account": { "title": "..." }`).
/// This class flattens them into dot-separated key paths (e.g., `"account.title"`) for fast lookup.
final class LocaleBundle: @unchecked Sendable {

    static let shared = LocaleBundle()

    private let logger = BayitLogger(category: "LocaleBundle")

    /// Thread-safe cache of flattened dictionaries keyed by language raw value.
    private let lock = NSLock()
    private var cache: [String: [String: String]] = [:]

    private init() {}

    // MARK: - Public API

    /// Returns the localized string for `key` in the given `language`.
    /// Falls back to returning `key` itself when the key or language file is missing.
    func string(for key: String, language: Language) -> String {
        let dictionary = loadedDictionary(for: language)
        return dictionary[key] ?? key
    }

    /// Pre-loads the dictionary for a language so first lookups are fast.
    func preload(_ language: Language) {
        _ = loadedDictionary(for: language)
    }

    /// Clears the in-memory cache (useful if locale files are updated at runtime during development).
    func clearCache() {
        lock.lock()
        cache.removeAll()
        lock.unlock()
    }

    // MARK: - Loading

    private func loadedDictionary(for language: Language) -> [String: String] {
        let code = language.rawValue

        lock.lock()
        if let existing = cache[code] {
            lock.unlock()
            return existing
        }
        lock.unlock()

        let dictionary = parseLocaleFile(for: code)

        lock.lock()
        cache[code] = dictionary
        lock.unlock()

        logger.debug("Loaded locale: \(code) with \(dictionary.count) keys")
        return dictionary
    }

    private func parseLocaleFile(for languageCode: String) -> [String: String] {
        guard let url = Bundle.module.url(forResource: languageCode, withExtension: "json") else {
            logger.error("Locale file not found: \(languageCode).json")
            return [:]
        }

        do {
            let data = try Data(contentsOf: url)
            guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                logger.error("Locale file root is not a JSON object: \(languageCode)")
                return [:]
            }
            return flatten(root, prefix: "")
        } catch {
            logger.error("Failed to parse locale file \(languageCode)", error: error)
            return [:]
        }
    }

    // MARK: - Flattening

    /// Recursively flattens a nested dictionary into dot-separated key paths.
    ///
    /// Example: `{"account": {"title": "My Account"}}` becomes `{"account.title": "My Account"}`.
    private func flatten(_ object: [String: Any], prefix: String) -> [String: String] {
        var result: [String: String] = [:]

        for (key, value) in object {
            let fullKey = prefix.isEmpty ? key : "\(prefix).\(key)"

            if let nested = value as? [String: Any] {
                let flattened = flatten(nested, prefix: fullKey)
                result.merge(flattened) { _, new in new }
            } else if let stringValue = value as? String {
                result[fullKey] = stringValue
            }
        }

        return result
    }
}
