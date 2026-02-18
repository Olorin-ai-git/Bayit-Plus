import BayitNetworking
import Foundation

/// Repository protocol for the unified search API operations.
protocol SearchRepository: Sendable {

    func unifiedSearch(
        query: String,
        contentTypes: [String],
        page: Int,
        limit: Int,
        sortBy: String,
        sortOrder: String,
        yearMin: Int?,
        yearMax: Int?,
        language: String?,
        hasSubtitles: Bool?,
        hasDubbing: Bool?
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
        limit: Int,
        sortBy: String,
        sortOrder: String,
        yearMin: Int?,
        yearMax: Int?,
        language: String?,
        hasSubtitles: Bool?,
        hasDubbing: Bool?
    ) async throws -> UnifiedSearchResponse {
        var queryItems = [
            URLQueryItem(name: "query", value: query),
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "sort_by", value: sortBy),
            URLQueryItem(name: "sort_order", value: sortOrder),
        ]
        for ct in contentTypes {
            queryItems.append(URLQueryItem(name: "content_types", value: ct))
        }
        if let yearMin { queryItems.append(URLQueryItem(name: "year_min", value: String(yearMin))) }
        if let yearMax { queryItems.append(URLQueryItem(name: "year_max", value: String(yearMax))) }
        if let language { queryItems.append(URLQueryItem(name: "subtitle_languages", value: language)) }
        if hasSubtitles == true { queryItems.append(URLQueryItem(name: "has_subtitles", value: "true")) }
        if hasDubbing == true { queryItems.append(URLQueryItem(name: "has_dubbing", value: "true")) }

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
        _ = try await client.post(
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
        _ = try await client.delete(
            "/api/v1/search/history",
            queryItems: queryItems,
            as: EmptySuccessResponse.self
        )
    }
}
