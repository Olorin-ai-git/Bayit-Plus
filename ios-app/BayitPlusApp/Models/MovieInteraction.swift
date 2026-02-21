import Foundation

struct InteractableMovieItem: Codable, Identifiable, Equatable, Hashable {
    let contentId: String
    let title: String
    let posterUrl: String?
    let characterCount: Int
    let status: String

    var id: String {
        contentId
    }
}

struct MovieTagStatusItem: Codable {
    let contentId: String
    let status: String
    let characters: [InteractiveCharacterItem]
    let error: String?
}

struct InteractiveCharacterItem: Codable, Identifiable, Equatable, Hashable {
    let name: String
    let voiceId: String
    let frameUrl: String
    let description: String
    let movieContext: String
    let actorName: String?
    let gender: String?
    let suggestedQuestions: [String]

    var id: String {
        name
    }
}

struct CharacterQuestionsItem: Codable {
    let characterName: String
    let specificQuestions: [String]
    let genericQuestions: [String]
}
