import BayitNetworking
import Foundation

/// Repository protocol for rewards balance and badges API operations.
protocol RewardRepository: Sendable {
    func fetchBalance() async throws -> RewardBalance
    func fetchBadges() async throws -> [Badge]
}

/// Production implementation of `RewardRepository` using `APIClient`.
final class APIRewardRepository: RewardRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchBalance() async throws -> RewardBalance {
        return try await client.get(
            "/api/v1/rewards/balance",
            as: RewardBalance.self
        )
    }

    func fetchBadges() async throws -> [Badge] {
        return try await client.get(
            "/api/v1/rewards/badges",
            as: [Badge].self
        )
    }
}
