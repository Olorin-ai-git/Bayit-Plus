import Foundation
import BayitNetworking

/// Repository protocol for podcast API operations.
///
/// Abstracts API calls for podcast shows, episodes, and categories behind a protocol
/// for testability.
protocol PodcastRepository: Sendable {

    /// Fetch paginated list of podcast shows.
    ///
    /// - Parameters:
    ///   - category: Optional category filter.
    ///   - page: Page number (1-indexed).
    ///   - limit: Number of shows per page.
    /// - Returns: Podcasts response with list of shows and pagination metadata.
    /// - Throws: `NetworkError` if the request fails.
    func fetchPodcasts(
        category: String?,
        page: Int,
        limit: Int
    ) async throws -> PodcastsResponse

    /// Fetch detailed information for a specific podcast show.
    ///
    /// - Parameter id: Podcast show ID.
    /// - Returns: Podcast detail with description, episodes, and metadata.
    /// - Throws: `NetworkError` if the request fails.
    func fetchPodcastDetail(id: String) async throws -> PodcastDetail

    /// Fetch paginated list of episodes for a specific podcast show.
    ///
    /// - Parameters:
    ///   - showId: Podcast show ID.
    ///   - page: Page number (1-indexed).
    ///   - limit: Number of episodes per page.
    /// - Returns: Episodes response with list of podcast episodes.
    /// - Throws: `NetworkError` if the request fails.
    func fetchEpisodes(
        showId: String,
        page: Int,
        limit: Int
    ) async throws -> PodcastEpisodesResponse

    /// Fetch list of all podcast categories.
    ///
    /// - Returns: Categories response with list of available categories.
    /// - Throws: `NetworkError` if the request fails.
    func fetchCategories() async throws -> PodcastCategoriesResponse

    /// Sync latest episodes from the podcast's RSS feed.
    ///
    /// - Parameter showId: Podcast show ID.
    /// - Throws: `NetworkError` if the request fails.
    func syncEpisodes(showId: String) async throws

    /// Add a custom podcast via RSS URL.
    ///
    /// - Parameter rssUrl: The RSS feed URL for the podcast.
    /// - Throws: `NetworkError` if the request fails.
    func addCustomPodcast(rssUrl: String) async throws

    /// Refresh all podcasts: sync latest episodes from RSS feeds and remove old episodes.
    ///
    /// - Throws: `NetworkError` if the request fails.
    func refreshAllPodcasts() async throws
}

/// Production implementation of `PodcastRepository` using `APIClient`.
final class APIPodcastRepository: PodcastRepository, @unchecked Sendable {

    private let client: APIClient

    /// Initialize with an `APIClient` instance.
    ///
    /// - Parameter client: The actor-based API client for network requests.
    init(client: APIClient) {
        self.client = client
    }

    // MARK: - PodcastRepository

    func fetchPodcasts(
        category: String?,
        page: Int,
        limit: Int
    ) async throws -> PodcastsResponse {
        var queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        if let category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }

        return try await client.get(
            "/api/v1/podcasts",
            queryItems: queryItems,
            as: PodcastsResponse.self
        )
    }

    func fetchPodcastDetail(id: String) async throws -> PodcastDetail {
        return try await client.get(
            "/api/v1/podcasts/\(id)",
            as: PodcastDetail.self
        )
    }

    func fetchEpisodes(
        showId: String,
        page: Int,
        limit: Int
    ) async throws -> PodcastEpisodesResponse {
        let queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        return try await client.get(
            "/api/v1/podcasts/\(showId)/episodes",
            queryItems: queryItems,
            as: PodcastEpisodesResponse.self
        )
    }

    func fetchCategories() async throws -> PodcastCategoriesResponse {
        return try await client.get(
            "/api/v1/podcasts/categories",
            as: PodcastCategoriesResponse.self
        )
    }

    func syncEpisodes(showId: String) async throws {
        _ = try await client.post(
            "/api/v1/podcasts/\(showId)/sync",
            body: EmptyBody(),
            as: PodcastSyncResponse.self
        )
    }

    func addCustomPodcast(rssUrl: String) async throws {
        struct AddPodcastRequest: Encodable, Sendable {
            let rssUrl: String
        }
        _ = try await client.post(
            "/api/v1/podcasts/custom",
            body: AddPodcastRequest(rssUrl: rssUrl),
            as: MessageResponse.self
        )
    }

    func refreshAllPodcasts() async throws {
        _ = try await client.post(
            "/api/v1/podcasts/refresh",
            body: EmptyBody(),
            as: PodcastRefreshResponse.self
        )
    }
}
