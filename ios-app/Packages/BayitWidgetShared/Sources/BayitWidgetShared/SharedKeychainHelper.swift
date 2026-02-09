import Foundation
import Security
import BayitCore

/// Reads the auth token from the shared Keychain access group.
///
/// Used by the widget extension to make authenticated API calls.
/// The main app writes the token via `KeychainService`; this helper
/// reads it from the shared access group.
public struct SharedKeychainHelper: Sendable {

    private let accessGroup: String
    private let logger = BayitLogger(category: "SharedKeychainHelper")

    public init(accessGroup: String = WidgetConfigurationKeys.keychainAccessGroup) {
        self.accessGroup = accessGroup
    }

    /// Reads the auth token from the shared Keychain.
    ///
    /// Returns `nil` if no token is stored (user not authenticated).
    public func readAuthToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: accessGroup,
            kSecAttrAccount as String: WidgetConfigurationKeys.keychainAuthTokenKey,
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: kCFBooleanTrue!,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound {
            logger.debug("No auth token in shared Keychain")
            return nil
        }

        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            logger.error(
                "Failed to read auth token from shared Keychain",
                context: ["status": String(status)]
            )
            return nil
        }

        return token
    }

    /// Writes the auth token to the shared Keychain.
    ///
    /// Called by the main app after authentication to make the token
    /// available to the widget extension.
    public func writeAuthToken(_ token: String) {
        guard let data = token.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: accessGroup,
            kSecAttrAccount as String: WidgetConfigurationKeys.keychainAuthTokenKey,
            kSecAttrAccessGroup as String: accessGroup,
        ]

        let updateAttributes: [String: Any] = [
            kSecValueData as String: data,
        ]

        let updateStatus = SecItemUpdate(query as CFDictionary, updateAttributes as CFDictionary)

        if updateStatus == errSecItemNotFound {
            var addQuery = query
            addQuery[kSecValueData as String] = data
            addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
            if addStatus != errSecSuccess {
                logger.error(
                    "Failed to save auth token to shared Keychain",
                    context: ["status": String(addStatus)]
                )
            }
        } else if updateStatus != errSecSuccess {
            logger.error(
                "Failed to update auth token in shared Keychain",
                context: ["status": String(updateStatus)]
            )
        }
    }

    /// Removes the auth token from the shared Keychain.
    public func deleteAuthToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: accessGroup,
            kSecAttrAccount as String: WidgetConfigurationKeys.keychainAuthTokenKey,
            kSecAttrAccessGroup as String: accessGroup,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
