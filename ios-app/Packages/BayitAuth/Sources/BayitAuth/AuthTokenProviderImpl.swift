import Foundation
import FirebaseAuth
import BayitNetworking

/// Thread-safe implementation of `AuthTokenProvider` from BayitNetworking.
///
/// Reads the cached token from Keychain and auto-refreshes via Firebase Auth
/// when the token is expired or about to expire.
public actor AuthTokenProviderImpl: AuthTokenProvider {

    private let keychainService: KeychainService
    private let logger: APILogger
    private let tokenKeychainKey: String

    /// Number of seconds before expiration at which the token is proactively refreshed.
    private let refreshMarginSeconds: TimeInterval = 300 // 5 minutes

    public init(
        keychainService: KeychainService,
        logger: APILogger,
        tokenKeychainKey: String = "bayit_firebase_id_token"
    ) {
        self.keychainService = keychainService
        self.logger = logger
        self.tokenKeychainKey = tokenKeychainKey
    }

    /// Returns the current Bearer token, refreshing if needed.
    ///
    /// Returns `nil` if the user is not authenticated (no Firebase user).
    /// Throws on transient failures (Keychain errors, network errors).
    public func currentToken() async throws -> String? {
        guard let firebaseUser = Auth.auth().currentUser else {
            return nil
        }

        // Try reading the cached token from Keychain
        if let cached = try? keychainService.load(for: tokenKeychainKey) {
            if !isTokenExpiringSoon(cached) {
                return cached
            }
        }

        // Token missing or expiring soon -- force refresh via Firebase
        return try await refreshAndCacheToken(for: firebaseUser)
    }

    // MARK: - Internal Helpers

    /// Refreshes the ID token from Firebase and persists it to Keychain.
    private func refreshAndCacheToken(for user: FirebaseAuth.User) async throws -> String {
        do {
            let result = try await user.getIDTokenResult(forcingRefresh: true)
            let token = result.token

            try keychainService.save(token: token, for: tokenKeychainKey)

            logger.debug(
                "Refreshed and cached Firebase ID token",
                metadata: ["user_id": user.uid]
            )

            return token
        } catch {
            logger.error(
                "Firebase token refresh failed",
                metadata: [
                    "user_id": user.uid,
                    "error": error.localizedDescription,
                ]
            )
            throw AuthError.tokenRefreshFailed(underlying: error.localizedDescription)
        }
    }

    /// Checks whether a JWT token will expire within the refresh margin.
    ///
    /// Decodes only the `exp` claim from the payload segment.
    private func isTokenExpiringSoon(_ token: String) -> Bool {
        let segments = token.split(separator: ".")
        guard segments.count == 3 else { return true }

        let payloadSegment = String(segments[1])

        // Base64URL decode
        var base64 = payloadSegment
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        guard let data = Data(base64Encoded: base64) else { return true }

        struct JWTPayload: Decodable {
            let exp: TimeInterval?
        }

        guard let payload = try? JSONDecoder().decode(JWTPayload.self, from: data),
              let expiration = payload.exp else {
            return true
        }

        let expirationDate = Date(timeIntervalSince1970: expiration)
        let margin = refreshMarginSeconds
        return expirationDate.timeIntervalSinceNow < margin
    }
}
