import BayitNetworking
import Foundation

// MARK: - APILiveTVRepository Convenience Methods

extension APILiveTVRepository {
    func fetchCatchUpSummary(
        channelId: String,
        windowMinutes: Int,
        targetLanguage: String
    ) async throws -> CatchUpSummaryResponse {
        let safeId = try validatedPathComponent(channelId)
        let queryItems = [
            URLQueryItem(name: "window_minutes", value: String(windowMinutes)),
            URLQueryItem(name: "target_language", value: targetLanguage),
        ]
        return try await client.get(
            "/api/v1/live/\(safeId)/catchup",
            queryItems: queryItems,
            as: CatchUpSummaryResponse.self
        )
    }

    func checkCatchUpAvailability(channelId: String) async throws -> CatchUpAvailabilityResponse {
        let safeId = try validatedPathComponent(channelId)
        return try await client.get(
            "/api/v1/live/\(safeId)/catchup/available",
            as: CatchUpAvailabilityResponse.self
        )
    }

    func fetchTranscriptTimeline(
        channelId: String,
        windowMinutes: Int
    ) async throws -> TranscriptTimelineResponse {
        let safeId = try validatedPathComponent(channelId)
        let queryItems = [
            URLQueryItem(name: "window_minutes", value: String(windowMinutes)),
        ]
        return try await client.get(
            "/api/v1/live/\(safeId)/transcripts",
            queryItems: queryItems,
            as: TranscriptTimelineResponse.self
        )
    }

    func fetchTranscriptStatus(channelId: String) async throws -> TranscriptStatusResponse {
        let safeId = try validatedPathComponent(channelId)
        return try await client.get(
            "/api/v1/live/\(safeId)/transcripts/status",
            as: TranscriptStatusResponse.self
        )
    }

    func searchScenes(channelId: String, query: String) async throws -> SceneSearchResponse {
        let safeId = try validatedPathComponent(channelId)
        struct SceneSearchRequest: Encodable, Sendable {
            let query: String
        }
        return try await client.post(
            "/api/v1/live/\(safeId)/scene-search",
            body: SceneSearchRequest(query: query),
            as: SceneSearchResponse.self
        )
    }

    func fetchChannelChatHistory(channelId: String) async throws -> ChannelChatHistoryResponse {
        let safeId = try validatedPathComponent(channelId)
        return try await client.get(
            "/api/v1/live/\(safeId)/chat/history",
            as: ChannelChatHistoryResponse.self
        )
    }
}
