import Foundation

// MARK: - EPG Program

/// A program in the Electronic Program Guide
struct EPGProgram: Decodable, Sendable, Identifiable {
    let id: String
    let channelId: String?
    let channelName: String?
    let title: String?
    let description: String?
    let thumbnail: String?
    let startTime: String?
    let endTime: String?
    let duration: Int?
    let genre: String?
    let category: String?
    let rating: String?
    let isLive: Bool?
    let hasRecording: Bool?
    let hasCatchUp: Bool?
}

// MARK: - EPG Responses

/// Response from GET /api/v1/epg
struct EPGResponse: Decodable, Sendable {
    let channels: [EPGChannelSchedule]
    let date: String?
}

/// A single channel's schedule within the EPG
struct EPGChannelSchedule: Decodable, Sendable, Identifiable {
    let id: String
    let channelId: String?
    let channelName: String?
    let channelLogo: String?
    let programs: [EPGProgram]
}

/// Response from GET /api/v1/epg/schedule/{channel_id}
struct EPGScheduleResponse: Decodable, Sendable {
    let channelId: String?
    let channelName: String?
    let programs: [EPGProgram]
    let date: String?
}

/// Response from GET /api/v1/epg/current/{channel_id}
struct EPGCurrentResponse: Decodable, Sendable {
    let current: EPGProgram?
    let next: EPGProgram?
}

/// Response from GET /api/v1/epg/search
struct EPGSearchResponse: Decodable, Sendable {
    let results: [EPGProgram]
    let total: Int?
}

/// Response from GET /api/v1/epg/catchup/{program_id}
struct EPGCatchUpResponse: Decodable, Sendable {
    let programId: String?
    let streamUrl: String?
    let title: String?
    let duration: Int?
}
