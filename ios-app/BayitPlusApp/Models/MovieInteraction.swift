import Foundation

struct InteractableMovieItem: Codable, Identifiable, Equatable, Hashable {
    let contentId: String
    let title: String
    let posterUrl: String?
    let characterCount: Int
    let interactionCount: Int
    let maxInteractions: Int
    let status: String

    var id: String {
        contentId
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        contentId = try container.decode(String.self, forKey: .contentId)
        title = try container.decode(String.self, forKey: .title)
        posterUrl = try container.decodeIfPresent(String.self, forKey: .posterUrl)
        characterCount = try container.decode(Int.self, forKey: .characterCount)
        interactionCount = try container.decodeIfPresent(Int.self, forKey: .interactionCount) ?? 0
        maxInteractions = try container.decodeIfPresent(Int.self, forKey: .maxInteractions) ?? 10
        status = try container.decode(String.self, forKey: .status)
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

struct InteractionSelectionRequest: Codable {
    let contentId: String
    let characterName: String
    let questions: [String]
}

struct InteractionSelectionResponse: Codable {
    let contentId: String
    let createdCount: Int
    let totalInteractionCount: Int
    let maxInteractions: Int
    let generationStatus: String
}

struct InteractionMomentStatusItem: Codable, Identifiable {
    let characterName: String
    let interactionPrompt: String
    let status: String
    let videoUrl: String?

    var id: String {
        "\(characterName)-\(interactionPrompt)"
    }
}

struct InteractionStatusResponse: Codable {
    let contentId: String
    let interactionCount: Int
    let maxInteractions: Int
    let moments: [InteractionMomentStatusItem]
}
