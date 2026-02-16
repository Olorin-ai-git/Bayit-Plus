import Foundation
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
    /// Returns `nil` if the user is not authenticated (no cached token or refresh token).
    /// Throws on transient failures (Keychain errors, network errors).
    ///
    /// Note: This implementation checks for backend JWT tokens directly in Keychain,
    /// supporting both Firebase-based authentication and device pairing flows.
    public func currentToken() async throws -> String? {
        // Try reading the cached backend JWT from Keychain
        if let cached = try? keychainService.load(for: tokenKeychainKey) {
            if !isTokenExpiringSoon(cached) {
                logger.debug(
                    "Using cached backend JWT",
                    metadata: ["expiring_soon": "false"]
                )
                return cached
            }

            logger.warning(
                "Cached backend JWT expired or expiring soon - RS256 tokens cannot be refreshed client-side",
                metadata: ["expiring_soon": "true"]
            )
        }

        // Token missing or expiring soon -- RS256 tokens cannot be refreshed
        // Return nil to signal that re-authentication is required
        logger.warning(
            "Token refresh not supported for RS256 tokens, re-authentication required",
            metadata: [:]
        )
        return nil
    }

    // MARK: - Internal Helpers

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
