import Foundation

// MARK: - Live Subtitle WebSocket Messages

/// Connection confirmation from the live subtitle WebSocket.
struct LiveSubtitleConnectionMessage: Decodable, Sendable {
    let sourceLang: String?
    let targetLang: String?
    let channelId: String?
    let sttProvider: String?
    let translationProvider: String?
    let enablePredictive: Bool?
}

/// A single subtitle cue received during a live subtitle session.
struct LiveSubtitleCueData: Decodable, Sendable {
    let text: String?
    let originalText: String?
    let timestamp: Double?
    let sourceLang: String?
    let targetLang: String?
    let confidence: Double?
    let isPartial: Bool?
    let subtitleType: String?
}

/// Wrapper message for subtitle cues with a `type` discriminator.
struct LiveSubtitleCueMessage: Decodable, Sendable {
    let type: String
    let data: LiveSubtitleCueData?
}

/// Generic WebSocket message used to determine the `type` field before full decoding.
struct LiveSubtitleTypeMessage: Decodable, Sendable {
    let type: String
    let message: String?
    let recoverable: Bool?
}
