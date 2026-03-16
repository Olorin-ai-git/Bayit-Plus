import Foundation
import Security

/// Secure token storage using the iOS Keychain via the Security framework.
///
/// Uses `kSecClassGenericPassword` items keyed by a service + account pair.
/// All operations are synchronous at the Security framework level but
/// wrapped in throwing functions for ergonomic Swift usage.
public struct KeychainService: Sendable {
    private let serviceName: String
    private let accessGroup: String?

    public init(configuration: AuthConfiguration) {
        serviceName = configuration.keychainServiceName
        accessGroup = configuration.keychainAccessGroup
    }

    // MARK: - Public API

    /// Saves a token string to the Keychain under the given key.
    ///
    /// If an item with the same key already exists, it is updated in place.
    public func save(token: String, for key: String) throws {
        guard let data = token.data(using: .utf8) else {
            throw AuthError.keychainSaveFailed(status: errSecParam)
        }

        // Attempt to update first; if not found, add a new item.
        let existingQuery = baseQuery(for: key)
        let updateAttributes: [String: Any] = [
            kSecValueData as String: data,
        ]

        let updateStatus = SecItemUpdate(existingQuery as CFDictionary, updateAttributes as CFDictionary)

        if updateStatus == errSecItemNotFound {
            var addQuery = baseQuery(for: key)
            addQuery[kSecValueData as String] = data
            addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

            let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
            guard addStatus == errSecSuccess else {
                throw AuthError.keychainSaveFailed(status: addStatus)
            }
        } else if updateStatus != errSecSuccess {
            throw AuthError.keychainSaveFailed(status: updateStatus)
        }
    }

    /// Loads a token string from the Keychain for the given key.
    ///
    /// Returns `nil` if the item does not exist.
    /// Throws for actual Keychain errors (device locked, etc.).
    public func load(for key: String) throws -> String? {
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = kCFBooleanTrue!
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound {
            return nil
        }

        guard status == errSecSuccess else {
            throw AuthError.keychainLoadFailed(status: status)
        }

        guard let data = result as? Data,
              let token = String(data: data, encoding: .utf8)
        else {
            throw AuthError.keychainLoadFailed(status: errSecDecode)
        }

        return token
    }

    /// Deletes the Keychain item for the given key.
    ///
    /// Does nothing if the item does not exist (idempotent).
    public func delete(for key: String) throws {
        let query = baseQuery(for: key)
        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw AuthError.keychainDeleteFailed(status: status)
        }
    }

    // MARK: - Private Helpers

    private func baseQuery(for key: String) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
        ]

        if let group = accessGroup {
            query[kSecAttrAccessGroup as String] = group
        }

        return query
    }
}
