import Foundation

struct InteractableMovieItem: Codable, Identifiable, Equatable {
    let contentId: String
    let title: String
    let posterUrl: String?
    let characterCount: Int
    let status: String

    var id: String { contentId }

    enum CodingKeys: String, CodingKey {
        case contentId = "content_id"
        case title
        case posterUrl = "poster_url"
        case characterCount = "character_count"
        case status
    }
}

struct MovieTagStatusItem: Codable {
    let contentId: String
    let status: String
    let characters: [InteractiveCharacterItem]
    let error: String?

    enum CodingKeys: String, CodingKey {
        case contentId = "content_id"
        case status, characters, error
    }
}

struct InteractiveCharacterItem: Codable, Identifiable, Equatable {
    let name: String
    let voiceId: String
    let frameUrl: String
    let description: String
    let movieContext: String
    let actorName: String?
    let gender: String?
    let suggestedQuestions: [String]

    var id: String { name }

    enum CodingKeys: String, CodingKey {
        case name
        case voiceId = "voice_id"
        case frameUrl = "frame_url"
        case description
        case movieContext = "movie_context"
        case actorName = "actor_name"
        case gender
        case suggestedQuestions = "suggested_questions"
    }
}

struct CharacterQuestionsItem: Codable {
    let characterName: String
    let specificQuestions: [String]
    let genericQuestions: [String]

    enum CodingKeys: String, CodingKey {
        case characterName = "character_name"
        case specificQuestions = "specific_questions"
        case genericQuestions = "generic_questions"
    }
}
