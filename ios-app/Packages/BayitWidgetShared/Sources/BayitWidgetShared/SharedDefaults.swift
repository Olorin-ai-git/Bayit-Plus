import Foundation
import BayitCore

/// Thread-safe wrapper around UserDefaults(suiteName:) for App Group shared data.
///
/// Provides typed get/set operations for widget data exchange.
/// Fails fast if the App Group suite cannot be created.
public final class SharedDefaults: @unchecked Sendable {

    private let defaults: UserDefaults
    private let logger = BayitLogger(category: "SharedDefaults")

    /// Shared instance using the configured App Group.
    public static let shared = SharedDefaults()

    public init(suiteName: String = WidgetConfigurationKeys.appGroupID) {
        guard let suite = UserDefaults(suiteName: suiteName) else {
            fatalError(
                "Failed to create UserDefaults for App Group: \(suiteName). "
                + "Verify the App Group entitlement is configured."
            )
        }
        self.defaults = suite
    }

    // MARK: - Read / Write

    /// Stores encoded data for a given key.
    public func setData(_ data: Data, forKey key: String) {
        defaults.set(data, forKey: key)
        defaults.set(Date().timeIntervalSince1970, forKey: WidgetConfigurationKeys.DefaultsKey.lastSyncTimestamp)
    }

    /// Retrieves stored data for a given key.
    public func data(forKey key: String) -> Data? {
        defaults.data(forKey: key)
    }

    /// Removes data for a given key.
    public func removeObject(forKey key: String) {
        defaults.removeObject(forKey: key)
    }

    /// The timestamp of the last data sync.
    public var lastSyncTimestamp: Date? {
        let interval = defaults.double(forKey: WidgetConfigurationKeys.DefaultsKey.lastSyncTimestamp)
        guard interval > 0 else { return nil }
        return Date(timeIntervalSince1970: interval)
    }

    // MARK: - Typed Convenience

    /// Encodes a Codable value and stores it.
    public func encode<T: Encodable>(_ value: T, forKey key: String) {
        do {
            let data = try JSONEncoder().encode(value)
            setData(data, forKey: key)
        } catch {
            logger.error(
                "Failed to encode widget data",
                error: error,
                context: ["key": key, "type": String(describing: T.self)]
            )
        }
    }

    /// Decodes a Codable value from stored data.
    public func decode<T: Decodable>(_ type: T.Type, forKey key: String) -> T? {
        guard let data = data(forKey: key) else { return nil }
        do {
            return try JSONDecoder().decode(type, from: data)
        } catch {
            logger.error(
                "Failed to decode widget data",
                error: error,
                context: ["key": key, "type": String(describing: T.self)]
            )
            return nil
        }
    }
}
