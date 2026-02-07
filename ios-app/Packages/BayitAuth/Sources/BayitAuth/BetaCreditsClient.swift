import Foundation
import BayitCore
import BayitNetworking

/// Lightweight client for the Beta Credits API endpoint.
///
/// Maps to `GET /api/v1/beta/credits/balance` on the backend.
/// Uses the app's `EnvironmentConfiguration` for the base URL
/// rather than hardcoding any endpoint.
enum BetaCreditsClient {

    /// Fetches the authenticated user's remaining beta credit balance.
    ///
    /// - Parameters:
    ///   - token: The current Firebase ID token for authorization.
    ///   - logger: Structured logger for request tracing.
    /// - Returns: The remaining credit count.
    static func fetchBalance(token: String, logger: APILogger) async throws -> Int {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("beta/credits/balance")

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = config.apiTimeout

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.betaCreditsFetchFailed(underlying: "Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            logger.warning(
                "Beta credits endpoint returned non-200",
                metadata: ["status_code": String(httpResponse.statusCode)]
            )
            throw AuthError.betaCreditsFetchFailed(
                underlying: "HTTP \(httpResponse.statusCode)"
            )
        }

        let balanceResponse = try JSONDecoder().decode(CreditBalanceResponse.self, from: data)
        return balanceResponse.remainingCredits
    }
}

/// Response model matching `CreditBalanceResponse` from the backend.
private struct CreditBalanceResponse: Decodable {
    let userId: String
    let remainingCredits: Int
    let totalCredits: Int
    let usedCredits: Int
    let isLow: Bool
    let isCritical: Bool

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case remainingCredits = "remaining_credits"
        case totalCredits = "total_credits"
        case usedCredits = "used_credits"
        case isLow = "is_low"
        case isCritical = "is_critical"
    }
}
