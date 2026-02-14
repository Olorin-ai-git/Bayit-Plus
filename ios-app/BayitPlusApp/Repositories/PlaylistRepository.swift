import Foundation
import BayitNetworking

/// Repository protocol for playlist API operations
protocol PlaylistRepository: Sendable {

    /// Add multiple content items to playlist in bulk
    ///
    /// - Parameter contentIds: Array of content IDs to add
    /// - Throws: `NetworkError` if the request fails
    func addBulkToPlaylist(contentIds: [String]) async throws
}

/// Production implementation of `PlaylistRepository` using `APIClient`
final class APIPlaylistRepository: PlaylistRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func addBulkToPlaylist(contentIds: [String]) async throws {
        struct BulkAddRequest: Encodable {
            let content_ids: [String]
            let content_type: String
        }

        let request = BulkAddRequest(
            content_ids: contentIds,
            content_type: "vod"
        )

        _ = try await client.post(
            "/api/v1/playlist/items/bulk",
            body: request,
            as: EmptyResponse.self
        )
    }
}
