import Foundation

// MARK: - Live TV

/// Response from GET /api/v1/live/channels
struct ChannelsResponse: Decodable, Sendable {
    let channels: [LiveChannelItem]
    let total: Int
}

/// A live TV channel
struct LiveChannelItem: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let description: String?
    let thumbnail: String?
    let logo: String?
    let category: String?
    let cultureId: String?
    let currentShow: String?
    let nextShow: String?
    let streamType: String?
    let isAiEnhanced: Bool?
    let aiFeatures: [String]?
    let supportsPipWidget: Bool?
}

/// Response from GET /api/v1/live/{channel_id}
struct ChannelDetail: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let description: String?
    let thumbnail: String?
    let logo: String?
    let streamUrl: String?
    let streamType: String?
    let currentShow: String?
    let nextShow: String?
    let supportsLiveSubtitles: Bool?
    let primaryLanguage: String?
    let availableTranslationLanguages: [String]?
    let schedule: [ScheduleEntry]?
}

/// A schedule entry in the EPG
struct ScheduleEntry: Decodable, Sendable, Identifiable {
    let title: String?
    let description: String?
    let time: String?
    let endTime: String?
    let isNow: Bool?

    var id: String { "\(title ?? "")-\(time ?? "")" }
}

/// Response from GET /api/v1/live/{channel_id}/epg
struct EPGResponse: Decodable, Sendable {
    let channelId: String
    let date: String
    let entries: [EPGEntry]
}

/// An EPG entry
struct EPGEntry: Decodable, Sendable, Identifiable {
    let title: String?
    let description: String?
    let start: String?
    let end: String?
    let category: String?
    let thumbnail: String?
    let isNow: Bool?

    var id: String { "\(title ?? "")-\(start ?? "")" }
}

/// Response from GET /api/v1/live/{channel_id}/stream
struct LiveStreamResponse: Decodable, Sendable {
    let url: String?
    let streamUrl: String?
    let type: String?
    let streamType: String?
    let isDrmProtected: Bool?
    let isAiEnhanced: Bool?
    let aiFeatures: [String]?
    let supportsPipWidget: Bool?
}
