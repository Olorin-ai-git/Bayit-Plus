#if os(iOS)
import Foundation

/// Response from companion context endpoint.
struct CompanionContextResponse: Decodable, Sendable {
    let context: String?
    let topics: [CompanionTopic]?
    let relatedLinks: [CompanionLink]?
}

struct CompanionTopic: Decodable, Sendable, Identifiable {
    let id: String
    let title: String
    let description: String?
}

struct CompanionLink: Decodable, Sendable, Identifiable {
    let id: String
    let title: String
    let url: String
}

/// Response from companion quiz endpoint.
struct CompanionQuizResponse: Decodable, Sendable {
    let questions: [QuizQuestion]?
}

/// Response from companion vocabulary endpoint.
struct CompanionVocabularyResponse: Decodable, Sendable {
    let words: [VocabularyWord]?
}

struct VocabularyWord: Decodable, Sendable, Identifiable {
    let id: String
    let term: String
    let definition: String
    let language: String?
    let pronunciation: String?
}
#endif
