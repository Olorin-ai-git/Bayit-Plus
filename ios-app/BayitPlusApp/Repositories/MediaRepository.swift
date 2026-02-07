import BayitNetworking
import Foundation

/// Repository protocol for media streaming and watch history API operations.
protocol MediaRepository: Sendable {

    /// Fetch stream URL for VOD content.
    func fetchStream(contentId: String, quality: String?) async throws -> StreamInfo

    /// Fetch stream URL for a live TV channel.
    func fetchLiveStream(channelId: String) async throws -> StreamInfo

    /// Fetch stream URL for a radio station.
    func fetchRadioStream(stationId: String) async throws -> RadioStreamInfo

    /// Fetch continue watching list (items with progress > 5%).
    func fetchContinueWatching() async throws -> ContinueWatchingResponse

    /// Fetch full watch history.
    func fetchWatchHistory(page: Int, limit: Int) async throws -> WatchHistoryResponse

    /// Update watch progress for a content item.
    func updateProgress(request: WatchProgressRequest) async throws -> WatchProgressResponse

    /// Restart a content item (reset progress to 0).
    func restartContent(contentId: String) async throws -> RestartResponse

    /// Remove a content item from watch history.
    func removeFromHistory(contentId: String) async throws -> MessageResponse

    /// Clear all watch history.
    func clearHistory() async throws -> MessageResponse
}

/// Production implementation of `MediaRepository` using `APIClient`.
final class APIMediaRepository: MediaRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchStream(contentId: String, quality: String?) async throws -> StreamInfo {
        var queryItems: [URLQueryItem] = []
        if let quality {
            queryItems.append(URLQueryItem(name: "quality", value: quality))
        }
        return try await client.get(
            "/api/v1/content/\(contentId)/stream",
            queryItems: queryItems,
            as: StreamInfo.self
        )
    }

    func fetchLiveStream(channelId: String) async throws -> StreamInfo {
        return try await client.get(
            "/api/v1/live/\(channelId)/stream",
            as: StreamInfo.self
        )
    }

    func fetchRadioStream(stationId: String) async throws -> RadioStreamInfo {
        return try await client.get(
            "/api/v1/radio/\(stationId)/stream",
            as: RadioStreamInfo.self
        )
    }

    func fetchContinueWatching() async throws -> ContinueWatchingResponse {
        return try await client.get(
            "/api/v1/history/continue",
            as: ContinueWatchingResponse.self
        )
    }

    func fetchWatchHistory(page: Int, limit: Int) async throws -> WatchHistoryResponse {
        let queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]
        return try await client.get(
            "/api/v1/history",
            queryItems: queryItems,
            as: WatchHistoryResponse.self
        )
    }

    func updateProgress(request: WatchProgressRequest) async throws -> WatchProgressResponse {
        return try await client.post(
            "/api/v1/history/progress",
            body: request,
            as: WatchProgressResponse.self
        )
    }

    func restartContent(contentId: String) async throws -> RestartResponse {
        return try await client.patch(
            "/api/v1/history/\(contentId)/restart",
            body: EmptyBody(),
            as: RestartResponse.self
        )
    }

    func removeFromHistory(contentId: String) async throws -> MessageResponse {
        return try await client.delete(
            "/api/v1/history/\(contentId)",
            as: MessageResponse.self
        )
    }

    func clearHistory() async throws -> MessageResponse {
        return try await client.delete(
            "/api/v1/history",
            as: MessageResponse.self
        )
    }
}
