import Foundation

// MARK: - Stream Info

/// Response from GET /api/v1/content/{id}/stream, /api/v1/live/{id}/stream
struct StreamInfo: Decodable, Sendable {
    let url: String?
    let directUrl: String?
    let type: String?
    let quality: String?
    let availableQualities: [QualityVariant]?
    let isDrmProtected: Bool?
    let drmKeyId: String?
    let isTranscoded: Bool?
    let platform: String?
    let durationHint: Double?
}

/// Quality variant for stream selection
struct QualityVariant: Decodable, Sendable, Identifiable {
    let quality: String
    let resolutionHeight: Int?
    let contentId: String?

    var id: String { quality }
}

/// Response from GET /api/v1/radio/{id}/stream
struct RadioStreamInfo: Decodable, Sendable {
    let url: String?
    let type: String?
}

// MARK: - Watch History

/// Item from GET /api/v1/history or /api/v1/history/continue
struct WatchHistoryItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let thumbnail: String?
    let duration: Double?
    let type: String?
    let progress: Double?
    let position: Double?
    let completed: Bool?
    let lastWatched: String?
}

/// Response from GET /api/v1/history
struct WatchHistoryResponse: Decodable, Sendable {
    let items: [WatchHistoryItem]
    let total: Int?
    let page: Int?
    let pages: Int?
}

/// Response from GET /api/v1/history/continue
struct ContinueWatchingResponse: Decodable, Sendable {
    let items: [WatchHistoryItem]
}

// MARK: - Watch Progress

/// Request body for POST /api/v1/history/progress
struct WatchProgressRequest: Encodable, Sendable {
    let contentId: String
    let contentType: String
    let position: Double
    let duration: Double
}

/// Response from POST /api/v1/history/progress
struct WatchProgressResponse: Decodable, Sendable {
    let message: String?
    let progress: Double?
    let completed: Bool?
}

/// Response from PATCH /api/v1/history/{id}/restart
struct RestartResponse: Decodable, Sendable {
    let message: String?
    let position: Double?
    let progress: Double?
}

// MARK: - Message Response

/// Generic message response for delete/clear operations
struct MessageResponse: Decodable, Sendable {
    let message: String?
}
