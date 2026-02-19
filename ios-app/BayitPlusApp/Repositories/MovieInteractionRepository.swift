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
        let encoded = characterName.addingPercentEncoding(
            withAllowedCharacters: .urlQueryAllowed
        ) ?? characterName
        return try await client.get(
            "/api/v1/movie-interactions/characters/\(contentId)/questions?character_name=\(encoded)",
            as: CharacterQuestionsItem.self
        )
    }
}
