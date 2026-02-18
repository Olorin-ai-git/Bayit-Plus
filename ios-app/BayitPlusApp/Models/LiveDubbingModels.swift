import Foundation

// MARK: - Live Dubbing

/// A dubbing voice option
struct DubbingVoice: Decodable, Sendable, Identifiable {
    let id: String
    let name: String
    let language: String
    let description: String?
}

/// Dubbing quality tier
enum DubbingQualityTier: String, Sendable, CaseIterable {
    case standard
    case premium
    case ultra

    var displayName: String {
        switch self {
        case .standard: return "Standard"
        case .premium: return "Premium"
        case .ultra: return "Ultra"
        }
    }
}

/// Dubbing availability status for a live channel.
struct DubbingAvailability: Decodable, Sendable {
    let channelId: String?
    let supportedLanguages: [String]?
    let isAvailable: Bool?
    let defaultVoiceId: String?
    let defaultSyncDelayMs: Int?
    let availableVoices: [DubbingVoice]?
}

/// Audio data received during a live dubbing session.
struct DubbingAudioMessage: Decodable, Sendable {
    let data: String?
    let originalText: String?
    let translatedText: String?
    let sequence: Int?
    let timestampMs: Int?
    let latencyMs: Int?
    let videoTimestampMs: Int?
    let durationMs: Int?
    let processingTimeMs: Int?
}

/// Latency metrics for a live dubbing session.
struct DubbingLatencyMessage: Decodable, Sendable {
    let avgTotalMs: Double?
    let avgTtsMs: Double?
    let avgTranslationMs: Double?
}

/// Connection confirmation for a live dubbing session.
struct DubbingConnectionMessage: Decodable, Sendable, Equatable {
    let sessionId: String?
    let channelId: String?
    let targetLanguage: String?
    let syncDelayMs: Int?
    let qualityTier: String?
    let voiceId: String?
}

/// WebSocket authentication message
struct DubbingWebSocketAuthMessage: Encodable, Sendable {
    let type: String = "authenticate"
    let token: String
}

/// Sync status message sent to server
struct DubbingSyncStatusMessage: Encodable, Sendable {
    let type: String = "sync_status"
    let currentVideoTimeMs: Int
}
