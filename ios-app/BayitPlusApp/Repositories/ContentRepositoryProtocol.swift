import BayitNetworking
import Foundation

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

    /// Fetch series (parent series, not episodes).
    ///
    /// - Parameters:
    ///   - page: Page number (1-indexed).
    ///   - limit: Number of items per page.
    /// - Returns: Paginated series list.
    /// - Throws: `NetworkError` if the request fails.
    func fetchSeries(page: Int, limit: Int) async throws -> ContentListResponse

    /// Fetch collections (movie franchises).
    ///
    /// - Parameters:
    ///   - skip: Number of items to skip (pagination offset).
    ///   - limit: Maximum number of items to return.
    /// - Returns: Array of collection list items.
    /// - Throws: `NetworkError` if the request fails.
    func fetchCollections(skip: Int, limit: Int) async throws -> [CollectionListItem]

    /// Fetch collection detail with all movies.
    ///
    /// - Parameter id: Collection ID.
    /// - Returns: Collection detail with movies list.
    /// - Throws: `NetworkError` if the request fails.
    func fetchCollectionDetail(id: String) async throws -> CollectionDetail

    /// Fetch all published collections with weighted random ordering for rotating banner.
    ///
    /// Collections are ordered using weighted random selection based on available_movies count.
    /// Results are cached server-side for 30 minutes.
    ///
    /// - Returns: Array of all published collections with all language promo texts.
    /// - Throws: `NetworkError` if the request fails.
    func fetchCollectionRecommendations() async throws -> [CollectionDetail]

    /// Fetch content categories for filtering.
    func fetchCategories() async throws -> CategoriesResponse

    /// Fetch trending content recommendations based on Israeli news topics.
    ///
    /// - Parameter limit: Maximum number of recommendations (default 10).
    /// - Returns: Response with recommendations and matched trending topics.
    /// - Throws: `NetworkError` if the request fails.
    func fetchTrendingRecommendations(limit: Int) async throws -> TrendingRecommendationsResponse

    /// Resolve a trailer URL to a direct playable stream URL.
    ///
    /// - Parameter contentId: Content ID whose trailer to resolve.
    /// - Returns: Trailer stream response with the resolved direct URL.
    /// - Throws: `NetworkError` if the request fails.
    func fetchTrailerStream(contentId: String) async throws -> TrailerStreamResponse
}
