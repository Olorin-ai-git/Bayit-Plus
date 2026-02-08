import BayitNetworking
import Foundation

/// Repository protocol for beta credits balance and deduction API operations.
protocol BetaCreditsRepository: Sendable {
    func fetchBalance() async throws -> CreditBalance
    func deductCredits(_ request: CreditDeductRequest) async throws -> CreditBalance
}

/// Production implementation of `BetaCreditsRepository` using `APIClient`.
final class APIBetaCreditsRepository: BetaCreditsRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchBalance() async throws -> CreditBalance {
        return try await client.get(
            "/api/v1/beta/credits/balance",
            as: CreditBalance.self
        )
    }

    func deductCredits(_ request: CreditDeductRequest) async throws -> CreditBalance {
        return try await client.post(
            "/api/v1/beta/credits/deduct",
            body: request,
            as: CreditBalance.self
        )
    }
}
