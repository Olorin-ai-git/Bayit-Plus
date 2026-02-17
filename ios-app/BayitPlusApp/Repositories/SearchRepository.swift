import BayitNetworking
import Foundation

/// Repository protocol for the unified search API operations.
protocol SearchRepository: Sendable {

    func unifiedSearch(
        query: String,
        contentTypes: [String],
        page: Int,
        limit: Int
    ) async throws -> UnifiedSearchResponse

    func fetchTrendingSearches(limit: Int) async throws -> [String]

    func fetchSuggestions(query: String, limit: Int) async throws -> [String]

    func fetchSearchHistory(limit: Int) async throws -> [String]

    func saveSearchHistory(query: String) async throws

    func deleteSearchHistory(query: String?) async throws
}

/// Production implementation of `SearchRepository` using `APIClient`.
final class APISearchRepository: SearchRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func unifiedSearch(
        query: String,
        contentTypes: [String],
        page: Int,
        limit: Int
    ) async throws -> UnifiedSearchResponse {
        var queryItems = [
            URLQueryItem(name: "query", value: query),
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]
        for ct in contentTypes {
            queryItems.append(URLQueryItem(name: "content_types", value: ct))
        }

        return try await client.get(
            "/api/v1/search/unified",
            queryItems: queryItems,
            as: UnifiedSearchResponse.self
        )
    }

    func fetchTrendingSearches(limit: Int) async throws -> [String] {
        let queryItems = [
            URLQueryItem(name: "limit", value: String(limit))
        ]
        let response: TrendingSearchesResponse = try await client.get(
            "/api/v1/search/trending",
            queryItems: queryItems,
            as: TrendingSearchesResponse.self
        )
        return response.trending
    }

    func fetchSuggestions(query: String, limit: Int) async throws -> [String] {
        let queryItems = [
            URLQueryItem(name: "query", value: query),
            URLQueryItem(name: "limit", value: String(limit))
        ]
        let response: SearchSuggestionsResponse = try await client.get(
            "/api/v1/search/suggestions",
            queryItems: queryItems,
            as: SearchSuggestionsResponse.self
        )
        return response.suggestions
    }

    func fetchSearchHistory(limit: Int) async throws -> [String] {
        let queryItems = [
            URLQueryItem(name: "limit", value: String(limit))
        ]
        let response: SearchHistoryResponse = try await client.get(
            "/api/v1/search/history",
            queryItems: queryItems,
            as: SearchHistoryResponse.self
        )
        return response.history
    }

    func saveSearchHistory(query: String) async throws {
        try await client.post(
            "/api/v1/search/history",
            body: SaveSearchHistoryRequest(query: query),
            as: EmptySuccessResponse.self
        )
    }

    func deleteSearchHistory(query: String?) async throws {
        var queryItems: [URLQueryItem] = []
        if let query {
            queryItems.append(URLQueryItem(name: "q", value: query))
        }
        try await client.delete(
            "/api/v1/search/history",
            queryItems: queryItems,
            as: EmptySuccessResponse.self
        )
    }
}
