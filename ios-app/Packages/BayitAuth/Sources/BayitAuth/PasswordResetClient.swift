import Foundation
import BayitCore
import BayitNetworking

/// Lightweight client for the Olorin Auth Service password reset endpoints.
///
/// Maps to:
/// - `POST /api/v1/auth/password-reset/request` - Request password reset email
/// - `POST /api/v1/auth/password-reset/confirm` - Confirm password reset with token
///
/// Calls the centralized Olorin Auth Service (auth.olorin.ai) rather than Bayit backend.
enum PasswordResetClient {

    /// Olorin Auth Service URL
    /// In production: https://auth.olorin.ai
    /// Can be overridden via environment variable for testing
    private static var authServiceURL: URL {
        if let urlString = ProcessInfo.processInfo.environment["AUTH_SERVICE_URL"],
           let url = URL(string: urlString) {
            return url
        }
        return URL(string: "https://auth.olorin.ai")!
    }

    /// Tenant ID for Bayit+
    private static let tenantID = "bayit_plus"

    /// Request password reset email
    ///
    /// - Parameters:
    ///   - email: User's email address
    ///   - logger: Structured logger for request tracing
    static func requestPasswordReset(email: String, logger: APILogger) async throws {
        let url = authServiceURL.appendingPathComponent("api/v1/auth/password-reset/request")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        let body: [String: String] = [
            "email": email,
            "tenant_id": tenantID
        ]
        request.httpBody = try JSONEncoder().encode(body)

        logger.info("Requesting password reset", metadata: ["email": email])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.passwordResetFailed(underlying: "Invalid response type")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            logger.warning(
                "Password reset request failed",
                metadata: [
                    "status_code": String(httpResponse.statusCode),
                    "error": errorMessage
                ]
            )
            throw AuthError.passwordResetFailed(underlying: "HTTP \(httpResponse.statusCode)")
        }

        logger.info("Password reset email sent", metadata: ["email": email])
    }

    /// Confirm password reset with token
    ///
    /// - Parameters:
    ///   - token: Reset token from email
    ///   - newPassword: New password meeting requirements
    ///   - logger: Structured logger for request tracing
    static func confirmPasswordReset(
        token: String,
        newPassword: String,
        logger: APILogger
    ) async throws {
        let url = authServiceURL.appendingPathComponent("api/v1/auth/password-reset/confirm")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        let body: [String: String] = [
            "token": token,
            "new_password": newPassword,
            "tenant_id": tenantID
        ]
        request.httpBody = try JSONEncoder().encode(body)

        logger.info("Confirming password reset")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.passwordResetFailed(underlying: "Invalid response type")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            logger.warning(
                "Password reset confirmation failed",
                metadata: [
                    "status_code": String(httpResponse.statusCode),
                    "error": errorMessage
                ]
            )
            throw AuthError.passwordResetFailed(underlying: "HTTP \(httpResponse.statusCode)")
        }

        logger.info("Password reset confirmed successfully")
    }
}
