import Foundation

// MARK: - Live Dubbing

/// Dubbing availability status for a live channel.
struct DubbingAvailability: Decodable, Sendable {
    let channelId: String?
    let supportedLanguages: [String]?
    let isAvailable: Bool?
}

/// Audio data received during a live dubbing session.
struct DubbingAudioMessage: Decodable, Sendable {
    let audioData: String?
    let originalText: String?
    let translatedText: String?
    let timestamp: Double?
}

/// Latency metrics for a live dubbing session.
struct DubbingLatencyMessage: Decodable, Sendable {
    let avgTotalMs: Double?
    let avgTtsMs: Double?
    let avgTranslationMs: Double?
}

/// Connection confirmation for a live dubbing session.
struct DubbingConnectionMessage: Decodable, Sendable {
    let sessionId: String?
    let channelId: String?
    let targetLanguage: String?
}
