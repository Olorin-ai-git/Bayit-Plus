import BayitNetworking
import Foundation

// MARK: - Response Models

struct DiscoverConfigResponse: Decodable, Sendable {
    let features: [FeatureConfig]
}

struct FeatureConfig: Decodable, Sendable {
    let featureId: String
    let enabled: Bool
    let demoVideoUrl: String?
    let demoThumbnailUrl: String?
    let walkthroughContentId: String?
}

struct CharacterGenerationStatusResponse: Decodable, Sendable {
    let freeRemaining: Int
    let freeLimit: Int
}

struct CharacterJobResponse: Decodable, Sendable {
    let jobId: String
    let status: String
    let alreadyExists: Bool?
}

// MARK: - Request Models

struct WalkthroughCompleteRequest: Encodable, Sendable {
    let featureId: String
    let stepsCompleted: Int
    let skipped: Bool
}

// MARK: - Protocol

/// Repository protocol for Discover feature configuration and walkthrough tracking.
protocol DiscoverRepository: Sendable {
    func fetchConfig() async throws -> DiscoverConfigResponse
    func recordWalkthroughComplete(
        featureId: String,
        stepsCompleted: Int,
        skipped: Bool
    ) async throws
    func characterGenerationStatus() async throws -> CharacterGenerationStatusResponse
    func generateCharacters(contentId: String) async throws -> CharacterJobResponse
}

// MARK: - Implementation

/// Production implementation of `DiscoverRepository` using `APIClient`.
final class APIDiscoverRepository: DiscoverRepository, @unchecked Sendable {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchConfig() async throws -> DiscoverConfigResponse {
        return try await client.get(
            "/api/v1/discover/config",
            as: DiscoverConfigResponse.self
        )
    }

    func recordWalkthroughComplete(
        featureId: String,
        stepsCompleted: Int,
        skipped: Bool
    ) async throws {
        let body = WalkthroughCompleteRequest(
            featureId: featureId,
            stepsCompleted: stepsCompleted,
            skipped: skipped
        )
        _ = try await client.post(
            "/api/v1/discover/walkthrough-complete",
            body: body,
            as: MessageResponse.self
        )
    }

    func characterGenerationStatus() async throws -> CharacterGenerationStatusResponse {
        return try await client.get(
            "/api/v1/discover/character-generation-status",
            as: CharacterGenerationStatusResponse.self
        )
    }

    func generateCharacters(contentId: String) async throws -> CharacterJobResponse {
        return try await client.post(
            "/api/v1/discover/generate-characters/\(contentId)",
            body: EmptyBody(),
            as: CharacterJobResponse.self
        )
    }
}
