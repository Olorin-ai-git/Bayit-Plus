import Foundation

/// Google device authorization code response.
public struct GoogleDeviceCode: Sendable {
    public let deviceCode: String
    public let userCode: String
    public let verificationUrl: String
    public let expiresIn: Int
    public let interval: Int

    public var isExpired: Bool {
        Date().timeIntervalSince(createdAt) > TimeInterval(expiresIn)
    }

    let createdAt = Date()
}

/// YouTube video item from the Data API v3.
public struct YouTubeVideo: Sendable {
    public let id: String
    public let title: String
    public let description: String?
    public let thumbnailURL: URL?
    public let channelTitle: String?
    public let publishedAt: Date?
    public let duration: Int?
    public let liveBroadcastContent: String?

    public var isLive: Bool {
        liveBroadcastContent == "live"
    }

    public var youtubeAppURL: URL? {
        URL(string: "youtube://watch?v=\(id)")
    }

    public var youtubeWebURL: URL? {
        URL(string: "https://www.youtube.com/watch?v=\(id)")
    }
}

/// YouTube playlist summary.
public struct YouTubePlaylist: Sendable {
    public let id: String
    public let title: String
    public let description: String?
    public let thumbnailURL: URL?
    public let itemCount: Int
}

/// YouTube channel subscription.
public struct YouTubeSubscription: Sendable {
    public let channelId: String
    public let title: String
    public let description: String?
    public let thumbnailURL: URL?
}

/// Wrapper for paginated YouTube API responses.
public struct YouTubePageResponse<T: Sendable>: Sendable {
    public let items: [T]
    public let nextPageToken: String?
    public let totalResults: Int
}

/// Errors from YouTube auth and API.
public enum YouTubeError: Error, Sendable {
    case invalidDeviceCodeResponse
    case authorizationPending
    case authorizationExpired
    case authorizationDenied
    case networkError(Error)
    case httpError(statusCode: Int)
    case invalidResponse
    case quotaExceeded
}
