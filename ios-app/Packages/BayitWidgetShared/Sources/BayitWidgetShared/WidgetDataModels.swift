import Foundation

/// Shared content type enum used across app and widget.
public enum SharedContentType: String, Codable, Sendable {
    case liveTV
    case radio
    case vod
    case podcast
    case audiobook
}

/// Data model for the Now Playing widget.
/// Represents the currently playing channel/station.
public struct SharedNowPlayingData: Codable, Sendable {
    public let channelName: String
    public let showTitle: String
    public let logoURL: URL?
    public let progress: Double
    public let isPlaying: Bool
    public let contentType: SharedContentType
    public let nextShowTitle: String?
    public let nextShowTime: String?
    public let channelID: String

    public init(
        channelName: String,
        showTitle: String,
        logoURL: URL?,
        progress: Double,
        isPlaying: Bool,
        contentType: SharedContentType,
        nextShowTitle: String?,
        nextShowTime: String?,
        channelID: String
    ) {
        self.channelName = channelName
        self.showTitle = showTitle
        self.logoURL = logoURL
        self.progress = progress
        self.isPlaying = isPlaying
        self.contentType = contentType
        self.nextShowTitle = nextShowTitle
        self.nextShowTime = nextShowTime
        self.channelID = channelID
    }
}


/// A single continue-watching item for the widget.
public struct SharedContinueWatchingItem: Codable, Sendable, Identifiable {
    public let id: String
    public let contentID: String
    public let title: String
    public let thumbnailURL: URL?
    public let progress: Double
    public let durationSeconds: Int
    public let contentType: SharedContentType

    public init(
        id: String,
        contentID: String,
        title: String,
        thumbnailURL: URL?,
        progress: Double,
        durationSeconds: Int,
        contentType: SharedContentType
    ) {
        self.id = id
        self.contentID = contentID
        self.title = title
        self.thumbnailURL = thumbnailURL
        self.progress = progress
        self.durationSeconds = durationSeconds
        self.contentType = contentType
    }
}

/// A single content item within a playlist for widget display.
public struct SharedPlaylistContentItem: Codable, Sendable, Identifiable {
    public let id: String
    public let contentID: String
    public let title: String
    public let thumbnailURL: URL?
    public let durationSeconds: Int
    public let contentType: SharedContentType
    public let progress: Double

    public init(
        id: String,
        contentID: String,
        title: String,
        thumbnailURL: URL?,
        durationSeconds: Int,
        contentType: SharedContentType,
        progress: Double
    ) {
        self.id = id
        self.contentID = contentID
        self.title = title
        self.thumbnailURL = thumbnailURL
        self.durationSeconds = durationSeconds
        self.contentType = contentType
        self.progress = progress
    }
}

/// A playlist item for the widget.
public struct SharedPlaylistItem: Codable, Sendable, Identifiable {
    public let id: String
    public let name: String
    public let itemCount: Int
    public let thumbnailURL: URL?
    public let items: [SharedPlaylistContentItem]

    public init(
        id: String,
        name: String,
        itemCount: Int,
        thumbnailURL: URL?,
        items: [SharedPlaylistContentItem] = []
    ) {
        self.id = id
        self.name = name
        self.itemCount = itemCount
        self.thumbnailURL = thumbnailURL
        self.items = items
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        itemCount = try container.decode(Int.self, forKey: .itemCount)
        thumbnailURL = try container.decodeIfPresent(URL.self, forKey: .thumbnailURL)
        items = try container.decodeIfPresent([SharedPlaylistContentItem].self, forKey: .items) ?? []
    }

    private enum CodingKeys: String, CodingKey {
        case id, name, itemCount, thumbnailURL, items
    }
}
