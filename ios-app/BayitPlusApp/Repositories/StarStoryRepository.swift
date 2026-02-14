import BayitNetworking
import Foundation

protocol StarStoryRepository: Sendable {

    func fetchAvatars(profileId: String) async throws -> AvatarsResponse

    func grantConsent(
        profileId: String,
        childFirstName: String,
        pin: String
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

    func uploadVideoSelfie(
        avatarId: String,
        videoData: Data
    ) async throws -> VideoSelfieUploadResponse

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
        pin: String
    ) async throws -> ConsentResponse {
        let request = ConsentRequest(
            profileId: profileId,
            childFirstName: childFirstName,
            pin: pin,
            videoSelfieConsent: true,
            voiceCloneConsent: true
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

    func uploadVideoSelfie(
        avatarId: String,
        videoData: Data
    ) async throws -> VideoSelfieUploadResponse {
        let boundary = UUID().uuidString
        var body = Data()

        body.appendMultipart(name: "avatar_id", value: avatarId, boundary: boundary)
        body.appendMultipartFile(
            name: "video", filename: "selfie.mp4",
            mimeType: "video/mp4", data: videoData, boundary: boundary
        )
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        return try await client.postRaw(
            "/api/v1/star-story/video-selfie/upload",
            body: body,
            contentType: "multipart/form-data; boundary=\(boundary)",
            as: VideoSelfieUploadResponse.self
        )
    }

    func revokeConsent(profileId: String) async throws {
        let _: EmptyResponse = try await client.delete(
            "/api/v1/star-story/consent/\(profileId)",
            as: EmptyResponse.self
        )
    }
}
