import BayitNetworking
import Foundation

/// Repository protocol for trivia statistics and leaderboard API operations.
protocol StatsRepository: Sendable {
    func fetchLeaderboard(limit: Int) async throws -> LeaderboardResponse
}

/// Production implementation of `StatsRepository` using `APIClient`.
final class APIStatsRepository: StatsRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchLeaderboard(limit: Int) async throws -> LeaderboardResponse {
        let queryItems = [URLQueryItem(name: "limit", value: String(limit))]
        return try await client.get(
            "/api/v1/stats/leaderboard",
            queryItems: queryItems,
            as: LeaderboardResponse.self
        )
    }
}
