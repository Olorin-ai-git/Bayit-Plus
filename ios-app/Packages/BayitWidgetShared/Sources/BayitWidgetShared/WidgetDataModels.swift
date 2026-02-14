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

/// Summary data for the trending news widget.
public struct SharedTrendingSummary: Codable, Sendable {
    public let topStory: String
    public let overallMood: String
    public let topics: [SharedTrendingTopic]
    public let lastUpdated: Date

    public init(
        topStory: String,
        overallMood: String,
        topics: [SharedTrendingTopic],
        lastUpdated: Date
    ) {
        self.topStory = topStory
        self.overallMood = overallMood
        self.topics = topics
        self.lastUpdated = lastUpdated
    }
}

/// A single trending topic.
public struct SharedTrendingTopic: Codable, Sendable, Identifiable {
    public var id: String { title }
    public let title: String
    public let category: String
    public let importance: Int

    public init(title: String, category: String, importance: Int) {
        self.title = title
        self.category = category
        self.importance = importance
    }
}

/// Shabbat times and parasha data for the widget.
public struct SharedShabbatData: Codable, Sendable {
    public let isShabbat: Bool
    public let isErevShabbat: Bool
    public let candleLighting: String?
    public let havdalah: String?
    public let countdown: String?
    public let countdownLabel: String?
    public let parashaHebrew: String?
    public let parashaEnglish: String?
    public let city: String?

    public init(
        isShabbat: Bool,
        isErevShabbat: Bool,
        candleLighting: String?,
        havdalah: String?,
        countdown: String?,
        countdownLabel: String?,
        parashaHebrew: String?,
        parashaEnglish: String?,
        city: String?
    ) {
        self.isShabbat = isShabbat
        self.isErevShabbat = isErevShabbat
        self.candleLighting = candleLighting
        self.havdalah = havdalah
        self.countdown = countdown
        self.countdownLabel = countdownLabel
        self.parashaHebrew = parashaHebrew
        self.parashaEnglish = parashaEnglish
        self.city = city
    }
}

/// A playlist item for the widget.
public struct SharedPlaylistItem: Codable, Sendable, Identifiable {
    public let id: String
    public let name: String
    public let itemCount: Int
    public let thumbnailURL: URL?

    public init(
        id: String,
        name: String,
        itemCount: Int,
        thumbnailURL: URL?
    ) {
        self.id = id
        self.name = name
        self.itemCount = itemCount
        self.thumbnailURL = thumbnailURL
    }
}
