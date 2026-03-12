import Foundation
import Security

/// Secure storage for BYOC auth tokens (Plex, YouTube).
public enum BYOCKeychainStore {
    private static let service = "tv.bayit.plus.byoc"

    /// Store a token for a source.
    public static func storeToken(
        _ token: String,
        forSourceId sourceId: String
    ) -> Bool {
        delete(key: sourceId)
        guard let data = token.data(using: .utf8) else { return false }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: sourceId,
            kSecValueData as String: data,
            kSecAttrAccessible as String:
                kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }

    /// Retrieve a token for a source.
    public static func retrieveToken(
        forSourceId sourceId: String
    ) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: sourceId,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8)
        else {
            return nil
        }
        return token
    }

    /// Store a refresh token for a source (YouTube OAuth).
    @discardableResult
    public static func storeRefreshToken(
        _ token: String,
        forSourceId sourceId: String
    ) -> Bool {
        storeToken(token, forSourceId: "refresh_\(sourceId)")
    }

    /// Retrieve a refresh token for a source.
    public static func retrieveRefreshToken(
        forSourceId sourceId: String
    ) -> String? {
        retrieveToken(forSourceId: "refresh_\(sourceId)")
    }

    /// Delete a token for a source.
    @discardableResult
    public static func deleteToken(
        forSourceId sourceId: String
    ) -> Bool {
        delete(key: sourceId)
    }

    @discardableResult
    private static func delete(key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        return SecItemDelete(query as CFDictionary) == errSecSuccess
    }
}
