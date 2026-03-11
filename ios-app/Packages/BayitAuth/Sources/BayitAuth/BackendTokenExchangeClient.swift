import BayitCore
import BayitNetworking
import Foundation

/// Lightweight client for exchanging provider tokens for Olorin Auth JWTs.
///
/// Talks directly to auth.olorin.ai (AUTH_SERVICE_URL) for all
/// authentication operations. Uses raw URLSession to avoid circular
/// dependency (APIClient depends on AuthTokenProvider which depends
/// on the token this client produces).
enum BackendTokenExchangeClient {
    private static let tenantId = "bayit_plus"

    private static var clientPlatform: String {
        #if os(tvOS)
            return "tvos"
        #else
            return "ios"
        #endif
    }

    /// Resolves AUTH_SERVICE_URL from Info.plist or environment.
    private static var authServiceBaseURL: URL {
        let info = Bundle.main.infoDictionary ?? [:]
        guard let urlString = info["AUTH_SERVICE_URL"] as? String
            ?? ProcessInfo.processInfo.environment["AUTH_SERVICE_URL"],
            let url = URL(string: urlString)
        else {
            fatalError("AUTH_SERVICE_URL must be set in Info.plist or environment")
        }
        return url
    }

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

    /// Flat auth response from auth.olorin.ai AuthResponse schema.
    struct AuthServiceResponse: Decodable {
        let userId: String
        let email: String
        let name: String
        let avatar: String?
        let role: String
        let accessToken: String
        let refreshToken: String
        let tokenType: String?
        let expiresIn: Int?

        private enum CodingKeys: String, CodingKey {
            case userId = "user_id"
            case email
            case name
            case avatar
            case role
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case tokenType = "token_type"
            case expiresIn = "expires_in"
        }
    }

    /// Adapter that presents AuthServiceResponse in the shape
    /// downstream code expects (access_token + nested user).
    struct LoginResponse: Decodable {
        let accessToken: String
        let refreshToken: String?
        let user: BackendUserData

        struct BackendUserData: Decodable {
            let id: String
            let email: String
            let name: String
            let role: String
            let isActive: Bool
            let isVerified: Bool?
            let profileImageUrl: String?
        }

        init(from authResponse: AuthServiceResponse) {
            accessToken = authResponse.accessToken
            refreshToken = authResponse.refreshToken
            user = BackendUserData(
                id: authResponse.userId,
                email: authResponse.email,
                name: authResponse.name,
                role: authResponse.role,
                isActive: true,
                isVerified: true,
                profileImageUrl: authResponse.avatar
            )
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            accessToken = try container.decode(String.self, forKey: .accessToken)
            refreshToken = try container.decodeIfPresent(String.self, forKey: .refreshToken)
            user = try container.decode(BackendUserData.self, forKey: .user)
        }

        private enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case user
        }
    }

    // MARK: - Helpers

    private static func buildRequest(
        path: String,
        body: [String: String],
        config: AppConfiguration
    ) throws -> URLRequest {
        let url = authServiceBaseURL.appendingPathComponent(path)
        let bodyData = try JSONEncoder().encode(body)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(clientPlatform, forHTTPHeaderField: "X-Client-Platform")
        request.timeoutInterval = config.apiTimeout
        request.httpBody = bodyData
        return request
    }

    private static func performAuthRequest(
        path: String,
        body: [String: String],
        logger: APILogger,
        errorFactory: (String) -> AuthError
    ) async throws -> LoginResponse {
        let config = AppConfiguration()
        let request = try buildRequest(path: path, body: body, config: config)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw errorFactory("Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            logger.warning(
                "Auth request failed",
                metadata: [
                    "path": path,
                    "status_code": String(httpResponse.statusCode),
                    "error": errorMessage,
                ]
            )
            throw errorFactory("HTTP \(httpResponse.statusCode): \(errorMessage)")
        }

        let authResponse = try JSONDecoder().decode(AuthServiceResponse.self, from: data)
        return LoginResponse(from: authResponse)
    }

    // MARK: - Token Refresh

    /// Refreshes an access token using a refresh token via auth.olorin.ai.
    static func refreshAccessToken(
        refreshToken: String,
        logger: APILogger
    ) async throws -> TokenExchangeResponse {
        let config = AppConfiguration()
        let request = try buildRequest(
            path: "api/v1/token/refresh",
            body: ["refresh_token": refreshToken],
            config: config
        )

        logger.debug("Refreshing access token via Olorin Auth", metadata: [:])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.tokenRefreshFailed(underlying: "Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            logger.warning(
                "Token refresh failed",
                metadata: [
                    "status_code": String(httpResponse.statusCode),
                    "error": errorMessage,
                ]
            )
            throw AuthError.tokenRefreshFailed(
                underlying: "HTTP \(httpResponse.statusCode): \(errorMessage)"
            )
        }

        logger.info("Token refresh succeeded via Olorin Auth", metadata: [:])

        return try JSONDecoder().decode(TokenExchangeResponse.self, from: data)
    }

    // MARK: - Google OAuth

    /// Authenticates with Google via auth.olorin.ai directly.
    static func loginWithGoogle(
        idToken: String,
        deviceId: String? = nil,
        logger: APILogger
    ) async throws -> LoginResponse {
        var body: [String: String] = [
            "id_token": idToken,
            "provider": "google",
            "tenant_id": tenantId,
        ]
        if let deviceId { body["device_id"] = deviceId }

        logger.debug("Logging in with Google via Olorin Auth", metadata: ["provider": "google"])

        let result = try await performAuthRequest(
            path: "api/v1/auth/login/google",
            body: body,
            logger: logger,
            errorFactory: { AuthError.googleSignInFailed(underlying: $0) }
        )

        logger.info("Google login succeeded via Olorin Auth", metadata: ["provider": "google"])
        return result
    }

    // MARK: - Apple OAuth

    /// Authenticates with Apple via auth.olorin.ai directly.
    static func loginWithApple(
        idToken: String,
        fullName: String? = nil,
        email: String? = nil,
        deviceId: String? = nil,
        logger: APILogger
    ) async throws -> LoginResponse {
        var body: [String: String] = [
            "id_token": idToken,
            "provider": "apple",
            "tenant_id": tenantId,
        ]
        if let fullName { body["full_name"] = fullName }
        if let email { body["email"] = email }
        if let deviceId { body["device_id"] = deviceId }

        logger.debug("Logging in with Apple via Olorin Auth", metadata: ["provider": "apple"])

        let result = try await performAuthRequest(
            path: "api/v1/auth/login/apple",
            body: body,
            logger: logger,
            errorFactory: { AuthError.appleSignInFailed(underlying: $0) }
        )

        logger.info("Apple login succeeded via Olorin Auth", metadata: ["provider": "apple"])
        return result
    }

    // MARK: - Email Registration

    /// Registers a new user via auth.olorin.ai directly.
    static func registerWithEmail(
        email: String,
        password: String,
        name: String,
        logger: APILogger
    ) async throws -> LoginResponse {
        let body: [String: String] = [
            "email": email,
            "password": password,
            "name": name,
            "tenant_id": tenantId,
        ]

        logger.debug("Registering with email via Olorin Auth", metadata: ["email": email])

        let result = try await performAuthRequest(
            path: "api/v1/auth/register",
            body: body,
            logger: logger,
            errorFactory: { AuthError.registrationFailed(underlying: $0) }
        )

        logger.info("Registration succeeded via Olorin Auth", metadata: ["email": email])
        return result
    }

    // MARK: - Email Login

    /// Authenticates with email/password via auth.olorin.ai directly.
    static func loginWithEmail(
        email: String,
        password: String,
        logger: APILogger
    ) async throws -> LoginResponse {
        let body: [String: String] = [
            "email": email,
            "password": password,
            "tenant_id": tenantId,
        ]

        logger.debug("Logging in with email via Olorin Auth", metadata: ["provider": "email"])

        let result = try await performAuthRequest(
            path: "api/v1/auth/login",
            body: body,
            logger: logger,
            errorFactory: { AuthError.emailSignInFailed(underlying: $0) }
        )

        logger.info("Login succeeded via Olorin Auth", metadata: ["email": email])
        return result
    }
}
