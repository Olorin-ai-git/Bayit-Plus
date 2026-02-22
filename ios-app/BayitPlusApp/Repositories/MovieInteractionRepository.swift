import BayitNetworking
import Foundation

protocol MovieInteractionRepository: Sendable {
    func listInteractableMovies() async throws -> [InteractableMovieItem]

    func tagMovie(
        contentId: String,
        profileId: String
    ) async throws -> MovieTagStatusItem

    func getMovieCharacters(
        contentId: String
    ) async throws -> MovieTagStatusItem

    func getCharacterQuestions(
        contentId: String,
        characterName: String
    ) async throws -> CharacterQuestionsItem

    func selectInteractions(
        contentId: String,
        characterName: String,
        questions: [String]
    ) async throws -> InteractionSelectionResponse

    func getInteractionStatus(
        contentId: String
    ) async throws -> InteractionStatusResponse
}

final class APIMovieInteractionRepository: MovieInteractionRepository, @unchecked Sendable {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func listInteractableMovies() async throws -> [InteractableMovieItem] {
        return try await client.get(
            "/api/v1/movie-interactions/movies",
            as: [InteractableMovieItem].self
        )
    }

    func tagMovie(
        contentId: String,
        profileId: String
    ) async throws -> MovieTagStatusItem {
        struct TagRequest: Codable {
            let contentId: String
            let profileId: String
            enum CodingKeys: String, CodingKey {
                case contentId = "content_id"
                case profileId = "profile_id"
            }
        }
        let body = TagRequest(contentId: contentId, profileId: profileId)
        return try await client.post(
            "/api/v1/movie-interactions/tag",
            body: body,
            as: MovieTagStatusItem.self
        )
    }

    func getMovieCharacters(
        contentId: String
    ) async throws -> MovieTagStatusItem {
        return try await client.get(
            "/api/v1/movie-interactions/tag/\(contentId)",
            as: MovieTagStatusItem.self
        )
    }

    func getCharacterQuestions(
        contentId: String,
        characterName: String
    ) async throws -> CharacterQuestionsItem {
        return try await client.get(
            "/api/v1/movie-interactions/characters/\(contentId)/questions",
            queryItems: [URLQueryItem(name: "character_name", value: characterName)],
            as: CharacterQuestionsItem.self
        )
    }

    func selectInteractions(
        contentId: String,
        characterName: String,
        questions: [String]
    ) async throws -> InteractionSelectionResponse {
        let body = InteractionSelectionRequest(
            contentId: contentId,
            characterName: characterName,
            questions: questions
        )
        return try await client.post(
            "/api/v1/movie-interactions/select-interactions",
            body: body,
            as: InteractionSelectionResponse.self
        )
    }

    func getInteractionStatus(
        contentId: String
    ) async throws -> InteractionStatusResponse {
        return try await client.get(
            "/api/v1/movie-interactions/\(contentId)/interaction-status",
            as: InteractionStatusResponse.self
        )
    }
}
