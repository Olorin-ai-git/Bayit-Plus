import BayitNetworking
import Foundation

/// Repository protocol for content and live chapter API operations.
protocol ChapterRepository: Sendable {
    func fetchChapters(contentId: String) async throws -> [Chapter]
    func fetchLiveChapters(channelId: String) async throws -> [Chapter]
}

/// Production implementation of `ChapterRepository` using `APIClient`.
final class APIChapterRepository: ChapterRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchChapters(contentId: String) async throws -> [Chapter] {
        return try await client.get(
            "/api/v1/chapters/\(contentId)",
            as: [Chapter].self
        )
    }

    func fetchLiveChapters(channelId: String) async throws -> [Chapter] {
        return try await client.get(
            "/api/v1/chapters/live/\(channelId)",
            as: [Chapter].self
        )
    }
}
