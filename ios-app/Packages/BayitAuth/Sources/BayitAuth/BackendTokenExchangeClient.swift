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

    // MARK: - Google Token Exchange

    /// Exchanges a Google ID token for a backend-issued JWT.
    ///
    /// Calls `POST /api/v1/auth/mobile/google` on the backend.
    static func exchangeGoogleToken(
        idToken: String,
        logger: APILogger
    ) async throws -> TokenExchangeResponse {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("auth/mobile/google")

        let body: [String: String] = ["id_token": idToken]

        return try await performExchange(
            url: url,
            body: body,
            timeout: config.apiTimeout,
            logger: logger,
            provider: "google"
        )
    }

    /// Exchanges an Apple identity token for a backend-issued JWT.
    ///
    /// Calls `POST /api/v1/auth/mobile/apple` on the backend.
    static func exchangeAppleToken(
        identityToken: String,
        fullName: String?,
        email: String?,
        logger: APILogger
    ) async throws -> TokenExchangeResponse {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("auth/mobile/apple")

        var body: [String: String] = ["identity_token": identityToken]
        if let name = fullName {
            body["full_name"] = name
        }
        if let email = email {
            body["email"] = email
        }

        return try await performExchange(
            url: url,
            body: body,
            timeout: config.apiTimeout,
            logger: logger,
            provider: "apple"
        )
    }

    /// Authenticates with email and password directly with the backend.
    ///
    /// Calls `POST /api/v1/auth/login` on the backend, which returns
    /// backend-issued JWTs directly (no provider token exchange needed).
    static func loginWithEmail(
        email: String,
        password: String,
        logger: APILogger
    ) async throws -> TokenExchangeResponse {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("auth/login")

        let body: [String: String] = [
            "email": email,
            "password": password,
        ]

        return try await performExchange(
            url: url,
            body: body,
            timeout: config.apiTimeout,
            logger: logger,
            provider: "email"
        )
    }

    /// Refreshes a backend JWT using the refresh token.
    ///
    /// Calls `POST /api/v1/auth/refresh` on the backend.
    static func refreshBackendToken(
        refreshToken: String,
        logger: APILogger
    ) async throws -> TokenExchangeResponse {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("auth/refresh")

        let body: [String: String] = ["refresh_token": refreshToken]

        return try await performExchange(
            url: url,
            body: body,
            timeout: config.apiTimeout,
            logger: logger,
            provider: "refresh"
        )
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
