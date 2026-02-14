import Foundation
import BayitNetworking

/// Repository protocol for content/home API operations.
///
/// Abstracts API calls behind a protocol for testability, allowing mock implementations
/// in tests while the real implementation uses the centralized `APIClient`.
protocol ContentRepository: Sendable {

    /// Fetch featured content for the home screen.
    ///
    /// - Returns: Featured response with hero, spotlight, and category rows.
    /// - Throws: `NetworkError` if the request fails.
    func fetchFeatured() async throws -> FeaturedResponse

    /// Fetch paginated list of all content.
    ///
    /// - Parameters:
    ///   - page: Page number (1-indexed).
    ///   - limit: Number of items per page.
    /// - Returns: Paginated content list response.
    /// - Throws: `NetworkError` if the request fails.
    func fetchAllContent(page: Int, limit: Int) async throws -> ContentListResponse

    /// Fetch detailed information for a specific content item.
    ///
    /// - Parameter id: Content ID.
    /// - Returns: Content detail with stream URLs, cast, related items, etc.
    /// - Throws: `NetworkError` if the request fails.
    func fetchContentDetail(id: String) async throws -> ContentDetail

    /// Search for content by query string and optional type filter.
    ///
    /// - Parameters:
    ///   - query: Search query string.
    ///   - type: Optional content type filter (e.g., "movie", "series").
    ///   - page: Page number (1-indexed).
    ///   - limit: Number of results per page.
    /// - Returns: Search results with total count.
    /// - Throws: `NetworkError` if the request fails.
    @available(*, deprecated, message: "Use SearchRepository.unifiedSearch() instead")
    func searchContent(
        query: String,
        type: String?,
        page: Int,
        limit: Int
    ) async throws -> SearchResponse

    /// Fetch Israelis in a specific city (location-based content).
    ///
    /// - Parameters:
    ///   - city: City name.
    ///   - state: State code.
    /// - Returns: Location-based content response with news and events.
    /// - Throws: `NetworkError` if the request fails.
    func fetchIsraelisInCity(city: String, state: String) async throws -> IsraelisInCityResponse

    /// Fetch Israeli businesses in a specific city.
    ///
    /// - Parameters:
    ///   - city: City name.
    ///   - state: State code.
    /// - Returns: Business content response.
    /// - Throws: `NetworkError` if the request fails.
    func fetchIsraeliBusinesses(city: String, state: String) async throws -> IsraeliBusinessesResponse

    /// Fetch Tel Aviv specific content.
    ///
    /// - Returns: City content response for Tel Aviv.
    /// - Throws: `NetworkError` if the request fails.
    func fetchTelAvivContent() async throws -> CityContentResponse

    /// Fetch Jerusalem specific content.
    ///
    /// - Returns: City content response for Jerusalem.
    /// - Throws: `NetworkError` if the request fails.
    func fetchJerusalemContent() async throws -> CityContentResponse

    /// Fetch trending culture content (news topics) for a culture.
    ///
    /// - Parameter cultureId: Culture ID (e.g., "israeli", "jewish").
    /// - Returns: Array of culture trending items (news topics).
    /// - Throws: `NetworkError` if the request fails.
    func fetchTrending(cultureId: String) async throws -> [CultureTrendingItem]

    /// Fetch continue watching list for authenticated user.
    ///
    /// - Returns: Continue watching response with progress data.
    /// - Throws: `NetworkError` if the request fails.
    func fetchContinueWatching() async throws -> ContinueWatchingResponse

    /// Fetch collections (movie franchises).
    ///
    /// - Parameters:
    ///   - page: Page number (1-indexed).
    ///   - limit: Number of items per page.
    /// - Returns: Paginated collections list.
    /// - Throws: `NetworkError` if the request fails.
    func fetchCollections(page: Int, limit: Int) async throws -> ContentListResponse

    /// Fetch collection detail with all movies.
    ///
    /// - Parameter id: Collection ID.
    /// - Returns: Collection detail with movies list.
    /// - Throws: `NetworkError` if the request fails.
    func fetchCollectionDetail(id: String) async throws -> CollectionDetail
}

/// Production implementation of `ContentRepository` using `APIClient`.
///
/// This implementation mirrors the web app's `api.js` pattern:
/// - All paths relative to `baseURL` configured in `APIClient`.
/// - Auth token, correlation ID, locale, and location headers injected automatically.
/// - Retry logic and rate limiting handled by `APIClient`.
final class APIContentRepository: ContentRepository, @unchecked Sendable {

    private let client: APIClient

    /// Initialize with an `APIClient` instance.
    ///
    /// - Parameter client: The actor-based API client for network requests.
    init(client: APIClient) {
        self.client = client
    }

    // MARK: - ContentRepository

    func fetchFeatured() async throws -> FeaturedResponse {
        return try await client.get(
            "/api/v1/content/featured",
            as: FeaturedResponse.self
        )
    }

    func fetchAllContent(page: Int, limit: Int) async throws -> ContentListResponse {
        let queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        return try await client.get(
            "/api/v1/content/all",
            queryItems: queryItems,
            as: ContentListResponse.self
        )
    }

    func fetchContentDetail(id: String) async throws -> ContentDetail {
        return try await client.get(
            "/api/v1/content/\(id)",
            as: ContentDetail.self
        )
    }

    func searchContent(
        query: String,
        type: String?,
        page: Int,
        limit: Int
    ) async throws -> SearchResponse {
        var queryItems = [
            URLQueryItem(name: "query", value: query),
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        if let type {
            queryItems.append(URLQueryItem(name: "type", value: type))
        }

        // The backend search endpoint is POST but takes query params (not body).
        // Use EmptyBody to satisfy the post() signature.
        return try await client.post(
            "/api/v1/content/search",
            body: EmptyBody(),
            queryItems: queryItems,
            as: SearchResponse.self
        )
    }

    func fetchIsraelisInCity(city: String, state: String) async throws -> IsraelisInCityResponse {
        let queryItems = [
            URLQueryItem(name: "city", value: city),
            URLQueryItem(name: "state", value: state)
        ]

        return try await client.get(
            "/api/v1/content/israelis-in-city",
            queryItems: queryItems,
            as: IsraelisInCityResponse.self
        )
    }

    func fetchIsraeliBusinesses(city: String, state: String) async throws -> IsraeliBusinessesResponse {
        let queryItems = [
            URLQueryItem(name: "city", value: city),
            URLQueryItem(name: "state", value: state)
        ]

        return try await client.get(
            "/api/v1/content/israeli-businesses-in-city",
            queryItems: queryItems,
            as: IsraeliBusinessesResponse.self
        )
    }

    func fetchTelAvivContent() async throws -> CityContentResponse {
        return try await client.get(
            "/api/v1/tel-aviv/content",
            as: CityContentResponse.self
        )
    }

    func fetchJerusalemContent() async throws -> CityContentResponse {
        return try await client.get(
            "/api/v1/jerusalem/content",
            as: CityContentResponse.self
        )
    }

    func fetchTrending(cultureId: String) async throws -> [CultureTrendingItem] {
        return try await client.get(
            "/api/v1/cultures/\(cultureId)/trending",
            as: [CultureTrendingItem].self
        )
    }

    func fetchContinueWatching() async throws -> ContinueWatchingResponse {
        return try await client.get(
            "/api/v1/history/continue",
            as: ContinueWatchingResponse.self
        )
    }

    func fetchCollections(page: Int, limit: Int) async throws -> ContentListResponse {
        let queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        return try await client.get(
            "/api/v1/content/collections",
            queryItems: queryItems,
            as: ContentListResponse.self
        )
    }

    func fetchCollectionDetail(id: String) async throws -> CollectionDetail {
        return try await client.get(
            "/api/v1/content/collections/\(id)",
            as: CollectionDetail.self
        )
    }
}
