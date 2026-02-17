import BayitNetworking
import Foundation

/// Repository protocol for the unified search API operations.
protocol SearchRepository: Sendable {

    /// Perform a unified search across content types.
    ///
    /// - Parameters:
    ///   - query: Search query string (empty for browse-all).
    ///   - contentTypes: Content type filters (e.g. ["vod", "live"]).
    ///   - page: Page number (1-indexed).
    ///   - limit: Results per page.
    /// - Returns: Unified search response with results, total, pagination.
    /// - Throws: `NetworkError` if the request fails.
    func unifiedSearch(
        query: String,
        contentTypes: [String],
        page: Int,
        limit: Int
    ) async throws -> UnifiedSearchResponse

    /// Fetch trending search queries for the suggestions panel.
    ///
    /// - Parameter limit: Maximum number of trending queries.
    /// - Returns: Array of trending search query strings.
    /// - Throws: `NetworkError` if the request fails.
    func fetchTrendingSearches(limit: Int) async throws -> [String]

    /// Fetch autocomplete suggestions for a partial query.
    ///
    /// - Parameters:
    ///   - query: Partial search query string.
    ///   - limit: Maximum number of suggestions.
    /// - Returns: Array of suggested search query strings.
    /// - Throws: `NetworkError` if the request fails.
    func fetchSuggestions(query: String, limit: Int) async throws -> [String]
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
}
