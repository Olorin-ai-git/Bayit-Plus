import Foundation

/// Response from POST /api/v1/live/{channelId}/scene-search
struct SceneSearchResponse: Decodable, Sendable {
    let results: [SceneSearchResult]?
    let query: String?
    let channelId: String?
}

/// A scene search result with timestamp and optional thumbnail.
struct SceneSearchResult: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let timestamp: TimeInterval
    let thumbnail: String?
    let confidence: Double?
}
