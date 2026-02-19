import Foundation

// MARK: - Download Status

enum DownloadStatus: String, Codable, Sendable, CaseIterable {
    case queued
    case downloading
    case paused
    case completed
    case failed
}

// MARK: - Local Download

/// Represents a locally tracked download with its file path and progress.
struct LocalDownload: Identifiable, Codable, Sendable {
    let id: String
    let contentId: String
    var title: String
    var thumbnail: String?
    var contentType: ContentType
    var status: DownloadStatus
    var progress: Double
    var filePath: String?
    var fileSize: Int64?
    var serverDownloadId: String?
    let createdAt: Date
    var error: String?

    init(contentId: String, title: String, thumbnail: String?, contentType: ContentType) {
        self.id = UUID().uuidString
        self.contentId = contentId
        self.title = title
        self.thumbnail = thumbnail
        self.contentType = contentType
        self.status = .queued
        self.progress = 0
        self.createdAt = Date()
    }
}

// MARK: - Download Request

/// Describes a single item to be downloaded, used by downloadAll.
struct DownloadRequest: Sendable {
    let contentId: String
    let title: String
    let thumbnail: String?
    let contentType: ContentType
    /// Direct file URL for the actual content download. Nil results in a failed download.
    let streamUrl: String?

    init(contentId: String, title: String, thumbnail: String?, contentType: ContentType, streamUrl: String? = nil) {
        self.contentId = contentId
        self.title = title
        self.thumbnail = thumbnail
        self.contentType = contentType
        self.streamUrl = streamUrl
    }
}
