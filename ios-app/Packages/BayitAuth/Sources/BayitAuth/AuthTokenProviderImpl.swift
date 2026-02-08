import Foundation
import FirebaseAuth
import BayitNetworking

/// Thread-safe implementation of `AuthTokenProvider` from BayitNetworking.
///
/// Reads the cached backend JWT from Keychain and auto-refreshes via
/// the backend refresh endpoint when the token is expired or about to expire.
public actor AuthTokenProviderImpl: AuthTokenProvider {

    private let keychainService: KeychainService
    private let logger: APILogger
    private let tokenKeychainKey: String
    private let refreshTokenKeychainKey: String

    /// Number of seconds before expiration at which the token is proactively refreshed.
    private let refreshMarginSeconds: TimeInterval = 300 // 5 minutes

    public init(
        keychainService: KeychainService,
        logger: APILogger,
        tokenKeychainKey: String,
        refreshTokenKeychainKey: String
    ) {
        self.keychainService = keychainService
        self.logger = logger
        self.tokenKeychainKey = tokenKeychainKey
        self.refreshTokenKeychainKey = refreshTokenKeychainKey
    }

    /// Returns the current backend Bearer token, refreshing if needed.
    ///
    /// Returns `nil` if the user is not authenticated (no cached token).
    /// Throws on transient failures (Keychain errors, network errors).
    public func currentToken() async throws -> String? {
        guard Auth.auth().currentUser != nil else {
            return nil
        }

        // Try reading the cached backend JWT from Keychain
        if let cached = try? keychainService.load(for: tokenKeychainKey) {
            if !isTokenExpiringSoon(cached) {
                return cached
            }
        }

        // Token missing or expiring soon -- refresh via backend
        return try await refreshAndCacheToken()
    }

    // MARK: - Internal Helpers

    /// Refreshes the backend JWT using the stored refresh token.
    private func refreshAndCacheToken() async throws -> String {
        guard let refreshToken = try? keychainService.load(
            for: refreshTokenKeychainKey
        ) else {
            logger.warning(
                "No refresh token available for backend JWT refresh",
                metadata: [:]
            )
            throw AuthError.notAuthenticated
        }

        do {
            let response = try await BackendTokenExchangeClient.refreshBackendToken(
                refreshToken: refreshToken,
                logger: logger
            )

            try keychainService.save(
                token: response.accessToken, for: tokenKeychainKey
            )
            if let newRefresh = response.refreshToken {
                try keychainService.save(
                    token: newRefresh, for: refreshTokenKeychainKey
                )
            }

            logger.debug(
                "Refreshed and cached backend JWT",
                metadata: [:]
            )

            return response.accessToken
        } catch {
            logger.error(
                "Backend JWT refresh failed",
                metadata: ["error": error.localizedDescription]
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
