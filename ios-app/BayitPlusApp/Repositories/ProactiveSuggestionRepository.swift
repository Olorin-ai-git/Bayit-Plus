import BayitNetworking
import Foundation

// MARK: - Request / Response Models

struct ProactiveSuggestRequest: Encodable, Sendable {
    let platform: String
    let profileId: String?
    let maxSuggestions: Int?
}

struct ProactiveSuggestResponse: Decodable, Sendable {
    let suggestions: [APIProactiveSuggestion]
    let nextPollSeconds: Int
}

struct APIProactiveSuggestion: Decodable, Sendable {
    let contentId: String?
    let contentType: String?
    let title: String?
    let reason: String?
    let reasonType: String?
    let confidence: Double?
}

// MARK: - Protocol

/// Repository for fetching AI-generated proactive content suggestions.
/// Calls POST /api/v1/voice/proactive/suggest.
protocol ProactiveSuggestionRepository: Sendable {
    func fetchSuggestions(
        platform: String,
        profileId: String?,
        maxSuggestions: Int?
    ) async throws -> ProactiveSuggestResponse
}

// MARK: - Implementation

/// Production implementation backed by the Bayit+ API.
final class APIProactiveSuggestionRepository: ProactiveSuggestionRepository, @unchecked Sendable {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchSuggestions(
        platform: String,
        profileId: String?,
        maxSuggestions: Int?
    ) async throws -> ProactiveSuggestResponse {
        let body = ProactiveSuggestRequest(
            platform: platform,
            profileId: profileId,
            maxSuggestions: maxSuggestions
        )
        return try await client.post(
            "/voice/proactive/suggest",
            body: body,
            as: ProactiveSuggestResponse.self
        )
    }
}
