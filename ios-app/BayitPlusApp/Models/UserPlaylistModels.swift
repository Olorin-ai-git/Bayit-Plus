import Foundation

// MARK: - Playlists

/// Response from GET /api/v1/playlist
struct PlaylistResponse: Decodable, Sendable {
    let items: [PlaylistItem]
    let itemCount: Int?
    let message: String?
}

/// A playlist content item returned by the backend's enrich_playlist_item()
struct PlaylistItem: Decodable, Sendable, Identifiable {
    let contentId: String
    let contentType: String?
    let title: String?
    let thumbnail: String?
    let duration: String?
    let position: Int?
    let addedAt: String?

    /// Identifiable conformance using contentId as the unique identifier
    var id: String {
        contentId
    }
}

/// Response from POST /api/v1/playlist/toggle
struct PlaylistToggleResponse: Decodable, Sendable {
    let inPlaylist: Bool?
    let message: String?
}

/// Response from GET /api/v1/playlist/check/{content_id}
struct PlaylistCheckResponse: Decodable, Sendable {
    let inPlaylist: Bool?
}

/// Request body for POST /api/v1/playlist/toggle/{content_id}
struct PlaylistToggleRequest: Encodable, Sendable {
    let contentType: String?
}

/// Request body for PUT /api/v1/playlist/items/reorder
struct PlaylistReorderRequest: Encodable, Sendable {
    let contentId: String
    let newPosition: Int
}
