import Foundation

// MARK: - Downloads

/// Response from GET /api/v1/downloads
struct DownloadsResponse: Decodable, Sendable {
    let items: [DownloadItem]
    let total: Int?
}

/// A downloaded content item
struct DownloadItem: Decodable, Sendable, Identifiable {
    let id: String
    let contentId: String?
    let title: String?
    let thumbnail: String?
    let type: String?
    let duration: String?
    let fileSize: Int?
    let downloadDate: String?
    let status: String?
    let progress: Double?
}

/// Response from POST /api/v1/downloads
struct DownloadStartResponse: Decodable, Sendable {
    let downloadId: String?
    let message: String?
    let status: String?

    enum CodingKeys: String, CodingKey {
        case downloadId = "id"
        case message
        case status
    }
}

/// Request body for POST /api/v1/user/downloads
struct DownloadStartRequest: Encodable, Sendable {
    let contentId: String
    let contentType: String
    let quality: String?

    enum CodingKeys: String, CodingKey {
        case contentId = "content_id"
        case contentType = "content_type"
        case quality
    }
}

/// Response from GET /api/v1/downloads/check/{content_id}
struct DownloadCheckResponse: Decodable, Sendable {
    let isDownloaded: Bool?
    let downloadId: String?
}

// MARK: - Recordings

/// Response from GET /api/v1/recordings
struct RecordingsResponse: Decodable, Sendable {
    let items: [RecordingItem]
    let total: Int?
}

/// A DVR recording item
struct RecordingItem: Decodable, Sendable, Identifiable {
    let id: String
    let channelId: String?
    let channelName: String?
    let programTitle: String?
    let thumbnail: String?
    let startTime: String?
    let endTime: String?
    let duration: String?
    let status: String?
    let fileSize: Int?
    let recordedAt: String?
}

/// Request body for POST /api/v1/recordings/start
struct RecordingStartRequest: Encodable, Sendable {
    let channelId: String
    let programId: String?
    let duration: Int?
}

/// Response from POST /api/v1/recordings/start
struct RecordingStartResponse: Decodable, Sendable {
    let recordingId: String?
    let message: String?
}
