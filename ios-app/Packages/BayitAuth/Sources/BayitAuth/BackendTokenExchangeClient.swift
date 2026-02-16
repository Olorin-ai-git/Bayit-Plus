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

    // MARK: - Auth Service URL

    /// Olorin Auth Service URL resolved from environment or production default.
    /// Same pattern as PasswordResetClient.
    private static var authServiceURL: URL {
        if let urlString = ProcessInfo.processInfo.environment["AUTH_SERVICE_URL"],
           let url = URL(string: urlString) {
            return url
        }
        return URL(string: "https://auth.olorin.ai")!
    }

    /// Tenant ID for Bayit+
    private static let tenantID = "bayit_plus"

    // MARK: - Token Refresh

    /// Refreshes an access token using a refresh token via the Olorin Auth Service.
    ///
    /// Calls `POST /api/v1/token/refresh` on auth.olorin.ai directly
    /// (same direct-call pattern as PasswordResetClient).
    static func refreshAccessToken(
        refreshToken: String,
        logger: APILogger
    ) async throws -> TokenExchangeResponse {
        let url = authServiceURL.appendingPathComponent("api/v1/token/refresh")

        let body: [String: String] = [
            "refresh_token": refreshToken,
            "tenant_id": tenantID,
        ]

        let bodyData = try JSONEncoder().encode(body)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        request.httpBody = bodyData

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

    // MARK: - Google OAuth (v2)

    /// Authenticates with Google via the backend Olorin Auth proxy.
    ///
    /// Calls `POST /api/v1/auth/v2/google` which delegates to auth.olorin.ai
    /// while syncing with Bayit+ database for app-specific features.
    static func loginWithGoogle(
        idToken: String,
        deviceId: String? = nil,
        logger: APILogger
    ) async throws -> LoginResponse {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("auth/v2/google")

        var bodyDict: [String: String] = ["id_token": idToken]
        if let deviceId = deviceId {
            bodyDict["device_id"] = deviceId
        }

        let bodyData = try JSONEncoder().encode(bodyDict)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        request.timeoutInterval = config.apiTimeout
        request.httpBody = bodyData

        logger.debug("Logging in with Google via Olorin Auth", metadata: ["provider": "google"])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.googleSignInFailed(underlying: "Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            logger.warning(
                "Google login failed",
                metadata: [
                    "status_code": String(httpResponse.statusCode),
                    "error": errorMessage,
                ]
            )
            throw AuthError.googleSignInFailed(
                underlying: "HTTP \(httpResponse.statusCode): \(errorMessage)"
            )
        }

        logger.info("Google login succeeded via Olorin Auth", metadata: ["provider": "google"])

        return try JSONDecoder().decode(LoginResponse.self, from: data)
    }

    // MARK: - Apple OAuth (v2)

    /// Authenticates with Apple via the backend Olorin Auth proxy.
    ///
    /// Calls `POST /api/v1/auth/v2/apple` which delegates to auth.olorin.ai
    /// while syncing with Bayit+ database for app-specific features.
    ///
    /// - Parameters:
    ///   - idToken: Apple identity token from ASAuthorization.
    ///   - fullName: User's full name (only provided on first Apple Sign-In).
    ///   - email: User's email (only provided on first Apple Sign-In).
    ///   - deviceId: Optional device identifier.
    ///   - logger: Structured logger.
    static func loginWithApple(
        idToken: String,
        fullName: String? = nil,
        email: String? = nil,
        deviceId: String? = nil,
        logger: APILogger
    ) async throws -> LoginResponse {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("auth/v2/apple")

        var bodyDict: [String: String] = ["id_token": idToken]
        if let fullName = fullName {
            bodyDict["full_name"] = fullName
        }
        if let email = email {
            bodyDict["email"] = email
        }
        if let deviceId = deviceId {
            bodyDict["device_id"] = deviceId
        }

        let bodyData = try JSONEncoder().encode(bodyDict)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        request.timeoutInterval = config.apiTimeout
        request.httpBody = bodyData

        logger.debug("Logging in with Apple via Olorin Auth", metadata: ["provider": "apple"])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.appleSignInFailed(underlying: "Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            logger.warning(
                "Apple login failed",
                metadata: [
                    "status_code": String(httpResponse.statusCode),
                    "error": errorMessage,
                ]
            )
            throw AuthError.appleSignInFailed(
                underlying: "HTTP \(httpResponse.statusCode): \(errorMessage)"
            )
        }

        logger.info("Apple login succeeded via Olorin Auth", metadata: ["provider": "apple"])

        return try JSONDecoder().decode(LoginResponse.self, from: data)
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

}
