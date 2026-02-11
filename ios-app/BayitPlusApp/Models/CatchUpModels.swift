import Foundation

/// Response from GET /api/v1/live/{channelId}/catchup
struct CatchUpResponse: Decodable, Sendable {
    let segments: [CatchUpSegment]?
    let summary: String?
    let channelId: String?
}

/// A transcript segment in the catch-up timeline.
struct CatchUpSegment: Decodable, Sendable, Identifiable {
    let id: String
    let text: String
    let timestamp: TimeInterval
    let speaker: String?
    let duration: TimeInterval?
}
