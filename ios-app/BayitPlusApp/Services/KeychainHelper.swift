import Foundation
import Security

/// Helper for securely storing and retrieving credentials in iOS Keychain
enum KeychainHelper {

    private static let service = "tv.bayit.plus.biometric"
    private static let emailKey = "biometric.email"
    private static let passwordKey = "biometric.password"

    // MARK: - Store

    /// Store email in Keychain for biometric sign-in
    static func storeEmail(_ email: String) {
        store(value: email, forKey: emailKey)
    }

    /// Store password in Keychain for biometric sign-in
    static func storePassword(_ password: String) {
        store(value: password, forKey: passwordKey)
    }

    // MARK: - Retrieve

    /// Retrieve stored email from Keychain
    static func retrieveEmail() -> String? {
        return retrieve(forKey: emailKey)
    }

    /// Retrieve stored password from Keychain
    static func retrievePassword() -> String? {
        return retrieve(forKey: passwordKey)
    }

    // MARK: - Delete

    /// Delete stored credentials from Keychain
    static func deleteCredentials() {
        delete(forKey: emailKey)
        delete(forKey: passwordKey)
    }

    // MARK: - Private Helpers

    private static func store(value: String, forKey key: String) {
        guard let data = value.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        // Delete existing item
        SecItemDelete(query as CFDictionary)

        // Add new item
        SecItemAdd(query as CFDictionary, nil)
    }

    private static func retrieve(forKey key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }

        return value
    }

    private static func delete(forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}
