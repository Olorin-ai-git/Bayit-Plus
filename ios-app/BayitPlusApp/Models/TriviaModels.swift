import Foundation

// MARK: - Trivia

/// A trivia fact with multilingual text variants.
struct TriviaFact: Codable, Sendable, Identifiable {
    let id: String
    let text: String?
    let textHe: String?
    let textEn: String?
    let textEs: String?
    let category: String?
    let timestamp: String?
    let languageVariants: [String: String]?
}

/// Response from GET /api/v1/content/{id}/trivia
struct TriviaResponse: Codable, Sendable {
    let trivia: [TriviaFact]
    let contentId: String?
    let isEnriched: Bool?
}

/// User trivia display preferences.
struct TriviaPreferences: Decodable, Sendable {
    let autoPlay: Bool?
    let frequency: String?
    let categories: [String]?
    let languages: [String]?
}

/// Request body for updating trivia preferences.
struct TriviaPreferencesUpdate: Encodable, Sendable {
    let autoPlay: Bool?
    let frequency: String?
    let categories: [String]?
    let languages: [String]?
}

// MARK: - Quiz

/// A quiz question with multiple-choice options.
struct QuizQuestion: Decodable, Sendable, Identifiable {
    let id: String
    let question: String?
    let text: String?
    let options: [String]
    let correctIndex: Int?
    let explanation: String?
    let category: String?
    let difficulty: String?
}

/// Response from GET /api/v1/content/{id}/quiz
struct QuizResponse: Decodable, Sendable {
    let questions: [QuizQuestion]
    let contentId: String?
    let quizId: String?
}

/// Result of a quiz submission with scoring details.
struct QuizResult: Decodable, Sendable {
    let score: Int?
    let total: Int?
    let pointsEarned: Int?
    let badges: [String]?
    let streakDays: Int?
}

/// Request body for POST /api/v1/quiz/submit
struct QuizSubmission: Encodable, Sendable {
    let quizId: String
    let answers: [Int]
}
