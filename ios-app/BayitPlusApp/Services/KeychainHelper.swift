import Foundation
import Security

/// Helper for securely storing and retrieving credentials in iOS Keychain
enum KeychainHelper {
    private static let service = "tv.bayit.plus.biometric"
    private static let emailKey = "biometric.email"
    private static let passwordKey = "biometric.password"
    private static let refreshTokenKey = "biometric.refreshToken"

    // MARK: - Store

    /// Store email in Keychain for biometric sign-in
    static func storeEmail(_ email: String) {
        store(value: email, forKey: emailKey)
    }

    /// Store password in Keychain for biometric sign-in
    static func storePassword(_ password: String) {
        store(value: password, forKey: passwordKey)
    }

    /// Store refresh token in Keychain for biometric session restore
    static func storeBiometricRefreshToken(_ token: String) {
        store(value: token, forKey: refreshTokenKey)
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

    /// Retrieve stored refresh token from Keychain for biometric session restore
    static func retrieveBiometricRefreshToken() -> String? {
        return retrieve(forKey: refreshTokenKey)
    }

    /// Whether any biometric credentials are stored (email or refresh token)
    static var hasBiometricCredentials: Bool {
        retrieveEmail() != nil || retrieveBiometricRefreshToken() != nil
    }

    // MARK: - Delete

    /// Delete stored credentials from Keychain
    static func deleteCredentials() {
        delete(forKey: emailKey)
        delete(forKey: passwordKey)
    }

    /// Delete stored biometric refresh token from Keychain
    static func deleteBiometricRefreshToken() {
        delete(forKey: refreshTokenKey)
    }

    // MARK: - Validation

    /// Check if a JWT token is expired or will expire soon (within 5 minutes).
    ///
    /// Returns `false` (not expired) when the token cannot be parsed as a JWT or
    /// has no `exp` claim — the server is the authoritative validator in those cases.
    static func isJWTExpired(_ token: String) -> Bool {
        let segments = token.split(separator: ".")
        guard segments.count == 3 else {
            // Opaque token — cannot determine expiry client-side; let server validate.
            return false
        }

        let payloadSegment = String(segments[1])

        // Base64URL decode
        var base64 = payloadSegment
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        guard let data = Data(base64Encoded: base64) else { return false }

        struct JWTPayload: Decodable {
            let exp: TimeInterval?
        }

        guard let payload = try? JSONDecoder().decode(JWTPayload.self, from: data),
              let expiration = payload.exp
        else {
            // No exp claim — treat as non-expiring; let server validate.
            return false
        }

        let expirationDate = Date(timeIntervalSince1970: expiration)
        let fiveMinutes: TimeInterval = 5 * 60
        return expirationDate.timeIntervalSinceNow < fiveMinutes
    }

    // MARK: - Private Helpers

    private static func store(value: String, forKey key: String) {
        guard let data = value.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
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
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8)
        else {
            return nil
        }

        return value
    }

    private static func delete(forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]

        SecItemDelete(query as CFDictionary)
    }
}
