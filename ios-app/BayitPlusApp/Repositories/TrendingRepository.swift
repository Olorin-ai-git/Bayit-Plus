import BayitNetworking
import Foundation

/// Repository protocol for trending topics, headlines, and recommendations API operations.
protocol TrendingRepository: Sendable {
    func fetchTopics() async throws -> [TrendingTopic]
    func fetchHeadlines(source: String?, limit: Int?) async throws -> [TrendingHeadline]
    func fetchRecommendations(limit: Int?) async throws -> [ContentItem]

    /// Fetch trending content recommendations with full metadata (topics, analysis timestamp).
    ///
    /// - Parameter limit: Maximum number of recommendations.
    /// - Returns: Response with recommendations and matched trending topics.
    /// - Throws: `NetworkError` if the request fails.
    func fetchTrendingRecommendations(limit: Int) async throws -> TrendingRecommendationsResponse
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

    func fetchTrendingRecommendations(limit: Int) async throws -> TrendingRecommendationsResponse {
        return try await client.get(
            "/api/v1/trending/recommendations",
            queryItems: [URLQueryItem(name: "limit", value: String(limit))],
            as: TrendingRecommendationsResponse.self
        )
    }
}
