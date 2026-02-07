import Foundation
import BayitNetworking

/// Repository protocol for radio station API operations.
///
/// Abstracts API calls for radio stations and live audio streams behind a protocol
/// for testability.
protocol RadioRepository: Sendable {

    /// Fetch list of radio stations.
    ///
    /// - Parameters:
    ///   - cultureId: Optional culture filter (e.g., "he", "en").
    ///   - genre: Optional genre filter (e.g., "news", "music").
    /// - Returns: Stations response with list of radio stations.
    /// - Throws: `NetworkError` if the request fails.
    func fetchStations(
        cultureId: String?,
        genre: String?
    ) async throws -> StationsResponse

    /// Fetch detailed information for a specific radio station.
    ///
    /// - Parameter id: Station ID.
    /// - Returns: Station detail with current show and metadata.
    /// - Throws: `NetworkError` if the request fails.
    func fetchStationDetail(id: String) async throws -> RadioStationDetail

    /// Fetch live stream URL for a specific radio station.
    ///
    /// - Parameter stationId: Station ID.
    /// - Returns: Radio stream response with HLS/MP3 URL.
    /// - Throws: `NetworkError` if the request fails.
    func fetchStreamURL(stationId: String) async throws -> RadioStreamResponse
}

/// Production implementation of `RadioRepository` using `APIClient`.
final class APIRadioRepository: RadioRepository, @unchecked Sendable {

    private let client: APIClient

    /// Initialize with an `APIClient` instance.
    ///
    /// - Parameter client: The actor-based API client for network requests.
    init(client: APIClient) {
        self.client = client
    }

    // MARK: - RadioRepository

    func fetchStations(
        cultureId: String?,
        genre: String?
    ) async throws -> StationsResponse {
        var queryItems: [URLQueryItem] = []

        if let cultureId {
            queryItems.append(URLQueryItem(name: "culture_id", value: cultureId))
        }

        if let genre {
            queryItems.append(URLQueryItem(name: "genre", value: genre))
        }

        return try await client.get(
            "/api/v1/radio/stations",
            queryItems: queryItems,
            as: StationsResponse.self
        )
    }

    func fetchStationDetail(id: String) async throws -> RadioStationDetail {
        return try await client.get(
            "/api/v1/radio/\(id)",
            as: RadioStationDetail.self
        )
    }

    func fetchStreamURL(stationId: String) async throws -> RadioStreamResponse {
        return try await client.get(
            "/api/v1/radio/\(stationId)/stream",
            as: RadioStreamResponse.self
        )
    }
}
