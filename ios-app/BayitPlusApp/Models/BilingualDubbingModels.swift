import Foundation

// MARK: - Bilingual Bridge Dubbing Models

/// Hebrew proficiency status for a user profile
struct ProficiencyStatus: Codable, Sendable {
    let level: String
    let overallScore: Double
    let hebrewRatio: Double
    let totalWordsLearned: Int
    let vocabularyKnownCount: Int
    let vocabularyLearningCount: Int

    enum CodingKeys: String, CodingKey {
        case level
        case overallScore = "overall_score"
        case hebrewRatio = "hebrew_ratio"
        case totalWordsLearned = "total_words_learned"
        case vocabularyKnownCount = "vocabulary_known_count"
        case vocabularyLearningCount = "vocabulary_learning_count"
    }
}

/// Active bilingual dubbing session
struct BilingualSession: Codable, Sendable {
    let sessionId: String
    let contentId: String
    let targetHebrewRatio: Double
    let actualHebrewRatio: Double
    let vocabularyIntroducedCount: Int
    let vocabularyRecognized: Int
    let sessionDurationSeconds: Double

    enum CodingKeys: String, CodingKey {
        case sessionId = "session_id"
        case contentId = "content_id"
        case targetHebrewRatio = "target_hebrew_ratio"
        case actualHebrewRatio = "actual_hebrew_ratio"
        case vocabularyIntroducedCount = "vocabulary_introduced_count"
        case vocabularyRecognized = "vocabulary_recognized"
        case sessionDurationSeconds = "session_duration_seconds"
    }
}

/// Request body for starting a bilingual session
struct StartSessionRequest: Encodable, Sendable {
    let contentId: String
    let profileId: String

    enum CodingKeys: String, CodingKey {
        case contentId = "content_id"
        case profileId = "profile_id"
    }
}

/// Request body for translating a segment within a session
struct TranslateSegmentRequest: Encodable, Sendable {
    let sessionId: String
    let hebrewText: String
    let timestampSeconds: Double

    enum CodingKeys: String, CodingKey {
        case sessionId = "session_id"
        case hebrewText = "hebrew_text"
        case timestampSeconds = "timestamp_seconds"
    }
}
