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
    /// For HLS downloads: absolute path to .movpkg bundle.
    /// For MP4 downloads: path relative to Documents directory.
    var filePath: String?
    var fileSize: Int64?
    var serverDownloadId: String?
    let createdAt: Date
    var error: String?
    /// Original stream URL preserved for retry.
    var sourceUrl: String?
    /// True when filePath is an absolute path (HLS .movpkg).
    var isHLSDownload: Bool
    /// Number of auto-retry attempts (max 3).
    var retryCount: Int

    init(contentId: String, title: String, thumbnail: String?, contentType: ContentType) {
        id = UUID().uuidString
        self.contentId = contentId
        self.title = title
        self.thumbnail = thumbnail
        self.contentType = contentType
        status = .queued
        progress = 0
        createdAt = Date()
        isHLSDownload = false
        retryCount = 0
    }
}

// MARK: - Download Request

/// Describes a single item to be downloaded.
struct DownloadRequest: Sendable {
    let contentId: String
    let title: String
    let thumbnail: String?
    let contentType: ContentType
    /// Stream URL for the content. For HLS (.m3u8) the AVAssetDownloadURLSession is used.
    let streamUrl: String?

    init(contentId: String, title: String, thumbnail: String?, contentType: ContentType, streamUrl: String? = nil) {
        self.contentId = contentId
        self.title = title
        self.thumbnail = thumbnail
        self.contentType = contentType
        self.streamUrl = streamUrl
    }
}
