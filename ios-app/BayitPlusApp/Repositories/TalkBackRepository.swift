import BayitNetworking
import Foundation

/// Repository protocol for Talk Back voice interaction API operations.
protocol TalkBackRepository: Sendable {
    func fetchPoints(contentId: String) async throws -> TalkBackPointsResponse
    func submitResponse(_ request: TalkBackSubmitRequest) async throws -> TalkBackEvaluation
    func fetchStats(profileId: String) async throws -> TalkBackStats
    func fetchHistory(profileId: String, limit: Int) async throws -> TalkBackHistoryResponse
}

/// Production implementation of `TalkBackRepository` using `APIClient`.
final class APITalkBackRepository: TalkBackRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchPoints(contentId: String) async throws -> TalkBackPointsResponse {
        return try await client.get(
            "/api/v1/talk-back/points/\(contentId)",
            as: TalkBackPointsResponse.self
        )
    }

    func submitResponse(_ request: TalkBackSubmitRequest) async throws -> TalkBackEvaluation {
        return try await client.post(
            "/api/v1/talk-back/respond",
            body: request,
            as: TalkBackEvaluation.self
        )
    }

    func fetchStats(profileId: String) async throws -> TalkBackStats {
        let queryItems = [
            URLQueryItem(name: "profile_id", value: profileId)
        ]
        return try await client.get(
            "/api/v1/talk-back/stats",
            queryItems: queryItems,
            as: TalkBackStats.self
        )
    }

    func fetchHistory(profileId: String, limit: Int) async throws -> TalkBackHistoryResponse {
        let queryItems = [
            URLQueryItem(name: "profile_id", value: profileId),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        return try await client.get(
            "/api/v1/talk-back/dashboard/history",
            queryItems: queryItems,
            as: TalkBackHistoryResponse.self
        )
    }
}
