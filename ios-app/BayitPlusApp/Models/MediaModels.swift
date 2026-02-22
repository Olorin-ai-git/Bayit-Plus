import Foundation

// MARK: - Stream Info

/// Response from GET /api/v1/content/{id}/stream, /api/v1/live/{id}/stream
struct StreamInfo: Decodable, Sendable {
    let url: String?
    let directUrl: String?
    let streamUrl: String?
    let type: String?
    let streamType: String?
    let quality: String?
    let availableQualities: [QualityVariant]?
    let isDrmProtected: Bool?
    let drmKeyId: String?
    let isTranscoded: Bool?
    let platform: String?
    let durationHint: Double?

    /// Resolved URL - checks all possible fields
    var resolvedURL: String? {
        url ?? streamUrl ?? directUrl
    }
}

/// Quality variant for stream selection
struct QualityVariant: Decodable, Sendable, Identifiable {
    let quality: String?
    let resolutionHeight: Int?
    let contentId: String?

    var id: String {
        quality ?? ""
    }
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
    let type: String?
    let progress: Double?
    let position: Double?
    let completed: Bool?
    let lastWatched: String?

    /// Duration may be a numeric value (seconds) or formatted string ("1:42:00")
    let duration: Double?

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decodeIfPresent(String.self, forKey: .title)
        thumbnail = try container.decodeIfPresent(String.self, forKey: .thumbnail)
        type = try container.decodeIfPresent(String.self, forKey: .type)
        progress = try container.decodeIfPresent(Double.self, forKey: .progress)
        position = try container.decodeIfPresent(Double.self, forKey: .position)
        completed = try container.decodeIfPresent(Bool.self, forKey: .completed)
        lastWatched = try container.decodeIfPresent(String.self, forKey: .lastWatched)

        if let numeric = try? container.decodeIfPresent(Double.self, forKey: .duration) {
            duration = numeric
        } else if let formatted = try? container.decodeIfPresent(String.self, forKey: .duration) {
            duration = Self.parseFormattedDuration(formatted)
        } else {
            duration = nil
        }
    }

    private static func parseFormattedDuration(_ value: String) -> Double? {
        let parts = value.split(separator: ":").compactMap { Double($0) }
        switch parts.count {
        case 3: return parts[0] * 3600 + parts[1] * 60 + parts[2]
        case 2: return parts[0] * 60 + parts[1]
        case 1: return parts[0]
        default: return nil
        }
    }

    private enum CodingKeys: String, CodingKey {
        case id, title, thumbnail, duration, type, progress, position, completed
        case lastWatched = "last_watched"
    }
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
