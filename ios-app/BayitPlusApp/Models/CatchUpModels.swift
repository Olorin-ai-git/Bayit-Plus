import Foundation

// MARK: - Legacy Response (backward compatibility)

/// Response from the legacy GET /api/v1/live/{channelId}/catchup (no query params).
struct CatchUpResponse: Decodable, Sendable {
    let segments: [CatchUpSegment]?
    let summary: String?
    let channelId: String?
}

/// A transcript segment in the catch-up timeline (legacy format).
struct CatchUpSegment: Decodable, Sendable, Identifiable {
    let id: String
    let text: String
    let timestamp: TimeInterval
    let speaker: String?
    let duration: TimeInterval?
}

// MARK: - Catch-Up Summary (Web Parity)

/// Response from GET /api/v1/live/{channelId}/catchup with query params.
/// Matches the web app's `CatchUpSummaryResponse`.
struct CatchUpSummaryResponse: Decodable, Sendable {
    let summary: String
    let keyPoints: [String]?
    let programInfo: CatchUpProgramInfo?
    let windowStart: String?
    let windowEnd: String?
    let windowMinutes: Int?
    let cached: Bool?
    let creditsUsed: Int?
    let remainingCredits: Int?

    enum CodingKeys: String, CodingKey {
        case summary
        case keyPoints = "key_points"
        case programInfo = "program_info"
        case windowStart = "window_start"
        case windowEnd = "window_end"
        case windowMinutes = "window_minutes"
        case cached
        case creditsUsed = "credits_used"
        case remainingCredits = "remaining_credits"
    }
}

/// Program metadata returned with the catch-up summary.
struct CatchUpProgramInfo: Decodable, Sendable {
    let title: String?
    let description: String?
    let genre: String?
    let host: String?
}

// MARK: - Availability Check

/// Response from GET /api/v1/live/{channelId}/catchup/available.
struct CatchUpAvailabilityResponse: Decodable, Sendable {
    let available: Bool
    let isBetaUser: Bool?
    let hasCredits: Bool?
    let balance: Int?

    enum CodingKeys: String, CodingKey {
        case available
        case isBetaUser = "is_beta_user"
        case hasCredits = "has_credits"
        case balance
    }
}

// MARK: - Transcript Timeline

/// A single transcript entry for the timeline view.
struct TranscriptSegment: Decodable, Sendable, Identifiable {
    let text: String
    let timestamp: TimeInterval
    let language: String?

    var id: String {
        "\(timestamp)-\(text.prefix(20))"
    }
}

/// Response from GET /api/v1/live/{channelId}/transcripts.
struct TranscriptTimelineResponse: Decodable, Sendable {
    let transcripts: [TranscriptSegment]?
    let total: Int?
    let channelId: String?
    let windowMinutes: Int?

    enum CodingKeys: String, CodingKey {
        case transcripts
        case total
        case channelId = "channel_id"
        case windowMinutes = "window_minutes"
    }
}

/// Response from GET /api/v1/live/{channelId}/transcripts/status.
struct TranscriptStatusResponse: Decodable, Sendable {
    let channelId: String?
    let isAccumulating: Bool?
    let transcriptCount: Int?

    enum CodingKeys: String, CodingKey {
        case channelId = "channel_id"
        case isAccumulating = "is_accumulating"
        case transcriptCount = "transcript_count"
    }
}

// MARK: - Error Classification

/// Classifies catch-up errors for UI-specific handling.
enum CatchUpErrorType: Sendable, Equatable {
    case none
    case insufficientCredits
    case serviceUnavailable
    case general
}
