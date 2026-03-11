import Foundation

// MARK: - Talk Back State Machine

/// Represents the current phase of a Talk Back interaction.
enum TalkBackState: Sendable {
    case idle
    case question
    case listening
    case evaluating
    case result
}

// MARK: - Talk Back Point

/// A timed interaction point within content where the character asks a question.
/// Maps to backend `TalkBackPointResponse` (snake_case -> camelCase via APIClient decoder).
struct TalkBackPoint: Codable, Sendable, Identifiable {
    let id: String
    let contentId: String
    let triggerTime: Double
    let characterName: String
    let questionText: String
    let questionTextHe: String
    let promptAudioUrl: String?
    let expectedLanguage: String
    let answerOptions: [String]?
    let difficulty: String
}

/// Response from GET /api/v1/talk-back/points/{content_id}
struct TalkBackPointsResponse: Codable, Sendable {
    let points: [TalkBackPoint]
}

// MARK: - Talk Back Evaluation

/// Result returned after the backend evaluates a voice response.
struct TalkBackEvaluation: Codable, Sendable {
    let score: Int
    let pointsEarned: Int
    let feedback: String
    let feedbackHe: String
    let languageDetected: String
    let pronunciationScore: Double?
}

// MARK: - Talk Back Stats

/// Aggregated statistics for a user's Talk Back engagement.
/// Maps to backend `TalkBackStatsResponse`.
struct TalkBackStats: Codable, Sendable {
    let totalAttempts: Int
    let totalShekelsEarned: Int
    let averageAccuracy: Double
    let hebrewResponseRate: Double
    let wordsLearned: Int
}

// MARK: - Attempt Record

/// Individual attempt record for dashboard history display.
struct TalkBackAttemptRecord: Codable, Sendable, Identifiable {
    var id: String {
        pointId + createdAt
    }

    let pointId: String
    let quality: String
    let accuracyScore: Double
    let shekelsEarned: Int
    let detectedLanguage: String
    let createdAt: String
}

/// Response from GET /api/v1/talk-back/dashboard/history
struct TalkBackHistoryResponse: Codable, Sendable {
    let attempts: [TalkBackAttemptRecord]
}

// MARK: - Submit Request

/// Request body for POST /api/v1/talk-back/respond
struct TalkBackSubmitRequest: Encodable, Sendable {
    let sessionId: String
    let contentId: String
    let talkBackPointId: String
    let profileId: String
    let responseTranscript: String
    let languageDetected: String
}

// MARK: - Vocabulary Item

/// Vocabulary word progress from GET /api/v1/talk-back/dashboard/vocabulary
struct TalkBackVocabularyItem: Decodable, Sendable, Identifiable {
    var id: String {
        word
    }

    let word: String
    let transliteration: String
    let translation: String
    let mastery: Double
    let timesTested: Int
    let timesCorrect: Int
}
