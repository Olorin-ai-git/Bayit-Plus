import BayitNetworking
import Foundation

protocol StarStoryRepository: Sendable {

    func fetchAvatars(profileId: String) async throws -> AvatarsResponse

    func grantConsent(
        profileId: String,
        childFirstName: String,
        pinHash: String
    ) async throws -> ConsentResponse

    func generateEpisode(
        profileId: String,
        avatarId: String,
        theme: String,
        targetVocabulary: [String]
    ) async throws -> GenerateEpisodeResponse

    func pollProgress(
        episodeId: String
    ) async throws -> StarStoryGenerationProgress

    func fetchEpisodes(
        profileId: String
    ) async throws -> EpisodesResponse

    func revokeConsent(profileId: String) async throws
}

final class APIStarStoryRepository: StarStoryRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchAvatars(profileId: String) async throws -> AvatarsResponse {
        let queryItems = [
            URLQueryItem(name: "profile_id", value: profileId)
        ]
        return try await client.get(
            "/api/v1/star-story/avatars",
            queryItems: queryItems,
            as: AvatarsResponse.self
        )
    }

    func grantConsent(
        profileId: String,
        childFirstName: String,
        pinHash: String
    ) async throws -> ConsentResponse {
        let request = ConsentRequest(
            profileId: profileId,
            childFirstName: childFirstName,
            pinHash: pinHash
        )
        return try await client.post(
            "/api/v1/star-story/consent",
            body: request,
            as: ConsentResponse.self
        )
    }

    func generateEpisode(
        profileId: String,
        avatarId: String,
        theme: String,
        targetVocabulary: [String]
    ) async throws -> GenerateEpisodeResponse {
        let request = GenerateEpisodeRequest(
            profileId: profileId,
            avatarId: avatarId,
            theme: theme,
            targetVocabulary: targetVocabulary
        )
        return try await client.post(
            "/api/v1/star-story/episodes/generate",
            body: request,
            as: GenerateEpisodeResponse.self
        )
    }

    func pollProgress(
        episodeId: String
    ) async throws -> StarStoryGenerationProgress {
        return try await client.get(
            "/api/v1/star-story/episodes/\(episodeId)/progress",
            as: StarStoryGenerationProgress.self
        )
    }

    func fetchEpisodes(
        profileId: String
    ) async throws -> EpisodesResponse {
        let queryItems = [
            URLQueryItem(name: "profile_id", value: profileId)
        ]
        return try await client.get(
            "/api/v1/star-story/episodes",
            queryItems: queryItems,
            as: EpisodesResponse.self
        )
    }

    func revokeConsent(profileId: String) async throws {
        try await client.delete("/api/v1/star-story/consent/\(profileId)")
    }
}
