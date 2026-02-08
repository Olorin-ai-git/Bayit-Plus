import Foundation

// MARK: - Interactive Subtitles

/// A subtitle cue with timing and optional word-level data.
struct SubtitleCue: Decodable, Sendable, Identifiable {
    let id: String?
    let startTime: Double?
    let endTime: Double?
    let text: String?
    let textNikud: String?
    let words: [SubtitleWord]?

    var stableId: String { id ?? "\(startTime ?? 0)-\(endTime ?? 0)" }
}

/// A single word within a subtitle cue for tap-to-translate.
struct SubtitleWord: Decodable, Sendable, Identifiable {
    let id: String?
    let word: String?
    let start: Double?
    let end: Double?
    let isHebrew: Bool?

    var stableId: String { id ?? "\(word ?? "")-\(start ?? 0)" }
}

/// Response from GET /api/v1/content/{id}/subtitles/cues
struct SubtitleCuesResponse: Decodable, Sendable {
    let cues: [SubtitleCue]?
    let language: String?
    let hasNikud: Bool?
}

/// Translation result for a tapped subtitle word.
struct TranslationResult: Decodable, Sendable {
    let word: String?
    let translation: String?
    let transliteration: String?
    let partOfSpeech: String?
    let example: String?
    let exampleTranslation: String?
}

/// Response from GET /api/v1/content/{id}/subtitles/preferences
struct SubtitlePreferencesResponse: Decodable, Sendable {
    let contentId: String?
    let language: String?
}

/// Request body for PUT /api/v1/content/{id}/subtitles/preferences
struct SubtitlePreferencesUpdate: Encodable, Sendable {
    let contentId: String
    let language: String
}
