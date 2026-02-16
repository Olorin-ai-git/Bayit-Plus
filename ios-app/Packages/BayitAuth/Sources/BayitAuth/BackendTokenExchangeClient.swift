import BayitCore
import BayitNetworking
import Foundation

/// Lightweight client for exchanging provider tokens for backend JWTs.
///
/// Uses raw URLSession instead of APIClient to avoid circular dependency
/// (APIClient depends on AuthTokenProvider which depends on the token
/// this client produces).
enum BackendTokenExchangeClient {

    // MARK: - Response Models

    struct TokenExchangeResponse: Decodable {
        let accessToken: String
        let refreshToken: String?
        let tokenType: String

        private enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case tokenType = "token_type"
        }
    }

    struct LoginResponse: Decodable {
        let accessToken: String
        let refreshToken: String?
        let user: BackendUserData

        private enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case user
        }

        struct BackendUserData: Decodable {
            let id: String
            let email: String
            let name: String
            let role: String
            let isActive: Bool
            let isBetaUser: Bool?
            let isVerified: Bool?
            let profileImageUrl: String?

            private enum CodingKeys: String, CodingKey {
                case id
                case email
                case name
                case role
                case isActive = "is_active"
                case isBetaUser = "is_beta_user"
                case isVerified = "is_verified"
                case profileImageUrl = "profile_image_url"
            }
        }
    }

    struct PasskeyAuthOptionsResponse: Decodable {
        let challenge: String
        let challengeId: String
        let rpId: String

        private enum CodingKeys: String, CodingKey {
            case challenge
            case challengeId = "challenge_id"
            case rpId = "rp_id"
        }
    }

    // MARK: - Google Token Exchange

    /// Exchanges a Google ID token for a backend-issued JWT.
    ///
    /// ⚠️ DEPRECATED: This endpoint has been removed (2026-02-16).
    /// The backend now uses RS256 tokens from auth.olorin.ai.
    /// Use the v2 login flow instead.
    @available(*, deprecated, message: "Use v2 authentication endpoints. This endpoint returns HTTP 410 GONE.")
    static func exchangeGoogleToken(
        idToken: String,
        logger: APILogger
    ) async throws -> TokenExchangeResponse {
        throw AuthError.endpointDeprecated(
            message: "/mobile/google endpoint deprecated. Please update app to use RS256 authentication."
        )
    }

    /// Exchanges an Apple identity token for a backend-issued JWT.
    ///
    /// ⚠️ DEPRECATED: This endpoint has been removed (2026-02-16).
    /// The backend now uses RS256 tokens from auth.olorin.ai.
    /// Use the v2 login flow instead.
    @available(*, deprecated, message: "Use v2 authentication endpoints. This endpoint returns HTTP 410 GONE.")
    static func exchangeAppleToken(
        identityToken: String,
        fullName: String?,
        email: String?,
        logger: APILogger
    ) async throws -> TokenExchangeResponse {
        throw AuthError.endpointDeprecated(
            message: "/mobile/apple endpoint deprecated. Please update app to use RS256 authentication."
        )
    }

    /// Registers a new user with email and password via the backend Olorin Auth proxy.
    ///
    /// Calls `POST /api/v1/auth/v2/register` which delegates to auth.olorin.ai
    /// while maintaining Bayit+ specific features (payment flow, beta users, etc).
    static func registerWithEmail(
        email: String,
        password: String,
        name: String,
        logger: APILogger
    ) async throws -> LoginResponse {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("auth/v2/register")

        let body: [String: String] = [
            "email": email,
            "password": password,
            "name": name,
        ]

        let bodyData = try JSONEncoder().encode(body)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        request.timeoutInterval = config.apiTimeout
        request.httpBody = bodyData

        logger.debug("Registering with email via Olorin Auth", metadata: ["email": email])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.registrationFailed(underlying: "Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            logger.warning(
                "Registration failed",
                metadata: [
                    "status_code": String(httpResponse.statusCode),
                    "error": errorMessage,
                ]
            )
            throw AuthError.registrationFailed(underlying: "HTTP \(httpResponse.statusCode): \(errorMessage)")
        }

        logger.info("Registration succeeded via Olorin Auth", metadata: ["email": email])

        return try JSONDecoder().decode(LoginResponse.self, from: data)
    }

    /// Authenticates with email and password via the backend Olorin Auth proxy.
    ///
    /// Calls `POST /api/v1/auth/v2/login` which delegates to auth.olorin.ai
    /// while syncing with Bayit+ database for app-specific features.
    static func loginWithEmail(
        email: String,
        password: String,
        logger: APILogger
    ) async throws -> LoginResponse {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("auth/v2/login")

        let body: [String: String] = [
            "email": email,
            "password": password,
        ]

        let bodyData = try JSONEncoder().encode(body)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        request.timeoutInterval = config.apiTimeout
        request.httpBody = bodyData

        logger.debug("Logging in with email via Olorin Auth", metadata: ["provider": "email"])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.emailSignInFailed(underlying: "Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            logger.warning(
                "Login failed",
                metadata: [
                    "status_code": String(httpResponse.statusCode),
                    "error": errorMessage,
                ]
            )
            throw AuthError.emailSignInFailed(underlying: "HTTP \(httpResponse.statusCode): \(errorMessage)")
        }

        logger.info("Login succeeded via Olorin Auth", metadata: ["email": email])

        return try JSONDecoder().decode(LoginResponse.self, from: data)
    }

    /// Refreshes a backend JWT using the refresh token.
    ///
    /// ⚠️ DEPRECATED: This endpoint has been removed (2026-02-16).
    /// The backend no longer supports token refresh for HS256 tokens.
    /// Users must re-authenticate to get new RS256 tokens.
    @available(*, deprecated, message: "Token refresh no longer supported. Users must re-authenticate.")
    static func refreshBackendToken(
        refreshToken: String,
        logger: APILogger
    ) async throws -> TokenExchangeResponse {
        throw AuthError.endpointDeprecated(
            message: "/auth/refresh endpoint deprecated. Please re-authenticate to get new RS256 tokens."
        )
    }

    /// Gets WebAuthn authentication options for passkey sign-in.
    ///
    /// Calls `POST /api/v1/webauthn/authenticate/options` on the backend.
    @available(iOS 16.0, tvOS 16.0, *)
    static func getPasskeyAuthOptions(
        logger: APILogger
    ) async throws -> PasskeyAuthOptionsResponse {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("webauthn/authenticate/options")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        request.timeoutInterval = config.apiTimeout

        let body: [String: Any] = ["is_qr_flow": false]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        logger.debug(
            "Getting passkey authentication options",
            metadata: ["url": url.absoluteString]
        )

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.passkeySignInFailed(underlying: "Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            let responseBody = String(data: data, encoding: .utf8) ?? "empty"
            logger.warning(
                "Passkey auth options failed",
                metadata: [
                    "status_code": String(httpResponse.statusCode),
                    "response": String(responseBody.prefix(200)),
                ]
            )
            throw AuthError.passkeySignInFailed(
                underlying: "Backend returned HTTP \(httpResponse.statusCode)"
            )
        }

        let decoded = try JSONDecoder().decode(PasskeyAuthOptionsResponse.self, from: data)

        logger.debug("Passkey auth options retrieved", metadata: [:])

        return decoded
    }

    /// Verifies passkey authentication and gets backend tokens.
    ///
    /// Calls `POST /api/v1/webauthn/authenticate/verify` on the backend.
    @available(iOS 16.0, tvOS 16.0, *)
    static func verifyPasskeyAuth(
        credentialId: String,
        authenticatorData: String,
        signature: String,
        clientDataJSON: String,
        challengeId: String,
        logger: APILogger
    ) async throws -> TokenExchangeResponse {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("webauthn/authenticate/verify")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        request.timeoutInterval = config.apiTimeout

        let credential: [String: Any] = [
            "id": credentialId,
            "rawId": credentialId,
            "type": "public-key",
            "response": [
                "authenticatorData": authenticatorData,
                "signature": signature,
                "clientDataJSON": clientDataJSON,
            ],
        ]

        let body: [String: Any] = [
            "credential": credential,
            "challenge_id": challengeId,
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        logger.debug(
            "Verifying passkey authentication",
            metadata: ["url": url.absoluteString]
        )

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.passkeySignInFailed(underlying: "Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            let responseBody = String(data: data, encoding: .utf8) ?? "empty"
            logger.warning(
                "Passkey verification failed",
                metadata: [
                    "status_code": String(httpResponse.statusCode),
                    "response": String(responseBody.prefix(200)),
                ]
            )
            throw AuthError.passkeySignInFailed(
                underlying: "Backend returned HTTP \(httpResponse.statusCode)"
            )
        }

        let decoded = try JSONDecoder().decode(TokenExchangeResponse.self, from: data)

        logger.debug("Passkey authentication verified", metadata: [:])

        return decoded
    }

    // MARK: - Private

    private static func performExchange(
        url: URL,
        body: [String: String],
        timeout: TimeInterval,
        logger: APILogger,
        provider: String
    ) async throws -> TokenExchangeResponse {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        request.timeoutInterval = timeout

        request.httpBody = try JSONEncoder().encode(body)

        logger.debug(
            "Exchanging \(provider) token with backend",
            metadata: ["url": url.absoluteString]
        )

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.tokenRefreshFailed(underlying: "Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            let responseBody = String(data: data, encoding: .utf8) ?? "empty"
            logger.warning(
                "Backend token exchange failed",
                metadata: [
                    "provider": provider,
                    "status_code": String(httpResponse.statusCode),
                    "response": String(responseBody.prefix(200)),
                ]
            )
            throw AuthError.tokenRefreshFailed(
                underlying: "Backend returned HTTP \(httpResponse.statusCode)"
            )
        }

        let decoded = try JSONDecoder().decode(TokenExchangeResponse.self, from: data)

        logger.debug(
            "Backend token exchange succeeded",
            metadata: ["provider": provider]
        )

        return decoded
    }
}
