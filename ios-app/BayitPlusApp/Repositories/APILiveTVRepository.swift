import BayitNetworking
import Foundation

/// Production implementation of `LiveTVRepository` using `APIClient`.
final class APILiveTVRepository: LiveTVRepository, @unchecked Sendable {
    let client: APIClient

    /// Allowed characters for path component validation (alphanumeric, hyphens, underscores).
    private static let allowedPathCharacters = CharacterSet(
        charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
    )

    /// Maximum length for a path component identifier.
    private static let maxPathComponentLength = 64

    /// Initialize with an `APIClient` instance.
    ///
    /// - Parameter client: The actor-based API client for network requests.
    init(client: APIClient) {
        self.client = client
    }

    // MARK: - Path Validation

    /// Validates and returns a sanitized path component, rejecting traversal patterns
    /// and characters outside the allowed set.
    ///
    /// - Parameter component: Raw identifier string (e.g., channel ID).
    /// - Throws: `APIError.unknown` if the component contains forbidden characters or patterns.
    /// - Returns: The validated component, safe for URL path interpolation.
    func validatedPathComponent(_ component: String) throws -> String {
        guard !component.isEmpty else {
            throw APIError.unknown(statusCode: nil, message: "Path component cannot be empty")
        }

        guard component.count <= Self.maxPathComponentLength else {
            throw APIError.unknown(statusCode: nil, message: "Path component exceeds maximum length")
        }

        guard component.unicodeScalars.allSatisfy({ Self.allowedPathCharacters.contains($0) }) else {
            throw APIError.unknown(statusCode: nil, message: "Path component contains invalid characters")
        }

        return component
    }

    // MARK: - LiveTVRepository

    func fetchChannels(
        cultureId: String?,
        category: String?
    ) async throws -> ChannelsResponse {
        var queryItems: [URLQueryItem] = []

        if let cultureId {
            queryItems.append(URLQueryItem(name: "culture_id", value: cultureId))
        }

        if let category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }

        return try await client.get(
            "/api/v1/live/channels",
            queryItems: queryItems,
            as: ChannelsResponse.self
        )
    }

    func fetchChannelDetail(id: String) async throws -> ChannelDetail {
        let safeId = try validatedPathComponent(id)
        return try await client.get(
            "/api/v1/live/\(safeId)",
            as: ChannelDetail.self
        )
    }

    func fetchEPG(
        channelId: String,
        date: String?
    ) async throws -> ChannelEPGResponse {
        let safeId = try validatedPathComponent(channelId)
        var queryItems: [URLQueryItem] = []

        if let date {
            queryItems.append(URLQueryItem(name: "date", value: date))
        }

        return try await client.get(
            "/api/v1/live/\(safeId)/epg",
            queryItems: queryItems,
            as: ChannelEPGResponse.self
        )
    }

    func fetchStreamURL(channelId: String) async throws -> LiveStreamResponse {
        let safeId = try validatedPathComponent(channelId)
        return try await client.get(
            "/api/v1/live/\(safeId)/stream",
            as: LiveStreamResponse.self
        )
    }

    func fetchCatchUp(channelId: String) async throws -> CatchUpResponse {
        let safeId = try validatedPathComponent(channelId)
        return try await client.get(
            "/api/v1/live/\(safeId)/catchup",
            as: CatchUpResponse.self
        )
    }
}
