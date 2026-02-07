import Foundation
import BayitNetworking

/// Repository protocol for series (TV shows) API operations.
///
/// Abstracts API calls for series details, season episodes, and series listing
/// behind a protocol for testability.
protocol SeriesRepository: Sendable {

    /// Fetch detailed information for a specific series.
    ///
    /// - Parameter id: Series ID.
    /// - Returns: Series detail with seasons, episodes, cast, and metadata.
    /// - Throws: `NetworkError` if the request fails.
    func fetchSeriesDetail(id: String) async throws -> SeriesDetail

    /// Fetch episodes for a specific season within a series.
    ///
    /// - Parameters:
    ///   - seriesId: Series ID.
    ///   - seasonNumber: Season number (1-indexed).
    /// - Returns: Season episodes response with list of episodes.
    /// - Throws: `NetworkError` if the request fails.
    func fetchSeasonEpisodes(
        seriesId: String,
        seasonNumber: Int
    ) async throws -> SeasonEpisodesResponse

    /// Fetch paginated list of all series.
    ///
    /// - Parameters:
    ///   - page: Page number (1-indexed).
    ///   - limit: Number of series per page.
    /// - Returns: Series list response with pagination metadata.
    /// - Throws: `NetworkError` if the request fails.
    func fetchAllSeries(page: Int, limit: Int) async throws -> SeriesListResponse
}

/// Production implementation of `SeriesRepository` using `APIClient`.
final class APISeriesRepository: SeriesRepository, @unchecked Sendable {

    private let client: APIClient

    /// Initialize with an `APIClient` instance.
    ///
    /// - Parameter client: The actor-based API client for network requests.
    init(client: APIClient) {
        self.client = client
    }

    // MARK: - SeriesRepository

    func fetchSeriesDetail(id: String) async throws -> SeriesDetail {
        return try await client.get(
            "/api/v1/content/series/\(id)",
            as: SeriesDetail.self
        )
    }

    func fetchSeasonEpisodes(
        seriesId: String,
        seasonNumber: Int
    ) async throws -> SeasonEpisodesResponse {
        return try await client.get(
            "/api/v1/content/series/\(seriesId)/season/\(seasonNumber)/episodes",
            as: SeasonEpisodesResponse.self
        )
    }

    func fetchAllSeries(page: Int, limit: Int) async throws -> SeriesListResponse {
        let queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        return try await client.get(
            "/api/v1/content/series",
            queryItems: queryItems,
            as: SeriesListResponse.self
        )
    }
}
