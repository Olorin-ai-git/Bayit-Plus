import BayitNetworking
import Foundation

/// Repository protocol for trending topics, headlines, and recommendations API operations.
protocol TrendingRepository: Sendable {
    func fetchTopics() async throws -> [TrendingTopic]
    func fetchHeadlines(source: String?, limit: Int?) async throws -> [TrendingHeadline]
    func fetchRecommendations(limit: Int?) async throws -> [ContentItem]
}

/// Production implementation of `TrendingRepository` using `APIClient`.
final class APITrendingRepository: TrendingRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchTopics() async throws -> [TrendingTopic] {
        return try await client.get(
            "/api/v1/trending/topics",
            as: [TrendingTopic].self
        )
    }

    func fetchHeadlines(source: String?, limit: Int?) async throws -> [TrendingHeadline] {
        var queryItems: [URLQueryItem] = []
        if let source {
            queryItems.append(URLQueryItem(name: "source", value: source))
        }
        if let limit {
            queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
        }
        return try await client.get(
            "/api/v1/trending/headlines",
            queryItems: queryItems,
            as: [TrendingHeadline].self
        )
    }

    func fetchRecommendations(limit: Int?) async throws -> [ContentItem] {
        var queryItems: [URLQueryItem] = []
        if let limit {
            queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
        }
        return try await client.get(
            "/api/v1/trending/recommendations",
            queryItems: queryItems,
            as: [ContentItem].self
        )
    }
}
