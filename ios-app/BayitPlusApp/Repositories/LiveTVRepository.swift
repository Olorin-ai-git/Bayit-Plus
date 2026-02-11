import Foundation
import BayitNetworking

/// Repository protocol for live TV API operations.
///
/// Abstracts API calls for channels, EPG (Electronic Program Guide), and live streams
/// behind a protocol for testability.
protocol LiveTVRepository: Sendable {

    /// Fetch list of live TV channels.
    ///
    /// - Parameters:
    ///   - cultureId: Optional culture filter (e.g., "he", "en").
    ///   - category: Optional category filter (e.g., "news", "sports").
    /// - Returns: Channels response with list of live channels.
    /// - Throws: `NetworkError` if the request fails.
    func fetchChannels(
        cultureId: String?,
        category: String?
    ) async throws -> ChannelsResponse

    /// Fetch detailed information for a specific live channel.
    ///
    /// - Parameter id: Channel ID.
    /// - Returns: Channel detail with stream URL, schedule, and AI features.
    /// - Throws: `NetworkError` if the request fails.
    func fetchChannelDetail(id: String) async throws -> ChannelDetail

    /// Fetch EPG (Electronic Program Guide) for a specific channel.
    ///
    /// - Parameters:
    ///   - channelId: Channel ID.
    ///   - date: Optional date in ISO format (defaults to today if nil).
    /// - Returns: EPG response with program entries for the specified date.
    /// - Throws: `NetworkError` if the request fails.
    func fetchEPG(
        channelId: String,
        date: String?
    ) async throws -> ChannelEPGResponse

    /// Fetch live stream URL for a specific channel.
    ///
    /// - Parameter channelId: Channel ID.
    /// - Returns: Live stream response with HLS URL and metadata.
    /// - Throws: `NetworkError` if the request fails.
    func fetchStreamURL(channelId: String) async throws -> LiveStreamResponse

    /// Fetch catch-up transcript and AI summary for a live channel.
    ///
    /// - Parameter channelId: Channel ID.
    /// - Returns: Catch-up response with transcript segments and AI summary.
    /// - Throws: `NetworkError` if the request fails.
    func fetchCatchUp(channelId: String) async throws -> CatchUpResponse

    /// Search for scenes within a live TV channel.
    ///
    /// - Parameters:
    ///   - channelId: Channel ID.
    ///   - query: Search query for topics or scenes.
    /// - Returns: Scene search response with timestamped results.
    /// - Throws: `NetworkError` if the request fails.
    func searchScenes(channelId: String, query: String) async throws -> SceneSearchResponse

    /// Fetch channel chat history for a specific channel.
    ///
    /// - Parameter channelId: Channel ID.
    /// - Returns: Channel chat history response with messages.
    /// - Throws: `NetworkError` if the request fails.
    func fetchChannelChatHistory(channelId: String) async throws -> ChannelChatHistoryResponse
}

/// Production implementation of `LiveTVRepository` using `APIClient`.
final class APILiveTVRepository: LiveTVRepository, @unchecked Sendable {

    private let client: APIClient

    /// Initialize with an `APIClient` instance.
    ///
    /// - Parameter client: The actor-based API client for network requests.
    init(client: APIClient) {
        self.client = client
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
        return try await client.get(
            "/api/v1/live/\(id)",
            as: ChannelDetail.self
        )
    }

    func fetchEPG(
        channelId: String,
        date: String?
    ) async throws -> ChannelEPGResponse {
        var queryItems: [URLQueryItem] = []

        if let date {
            queryItems.append(URLQueryItem(name: "date", value: date))
        }

        return try await client.get(
            "/api/v1/live/\(channelId)/epg",
            queryItems: queryItems,
            as: ChannelEPGResponse.self
        )
    }

    func fetchStreamURL(channelId: String) async throws -> LiveStreamResponse {
        return try await client.get(
            "/api/v1/live/\(channelId)/stream",
            as: LiveStreamResponse.self
        )
    }

    func fetchCatchUp(channelId: String) async throws -> CatchUpResponse {
        return try await client.get(
            "/api/v1/live/\(channelId)/catchup",
            as: CatchUpResponse.self
        )
    }

    func searchScenes(channelId: String, query: String) async throws -> SceneSearchResponse {
        struct SceneSearchRequest: Encodable, Sendable {
            let query: String
        }
        return try await client.post(
            "/api/v1/live/\(channelId)/scene-search",
            body: SceneSearchRequest(query: query),
            as: SceneSearchResponse.self
        )
    }

    func fetchChannelChatHistory(channelId: String) async throws -> ChannelChatHistoryResponse {
        return try await client.get(
            "/api/v1/live/\(channelId)/chat/history",
            as: ChannelChatHistoryResponse.self
        )
    }
}
