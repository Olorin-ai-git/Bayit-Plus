import BayitNetworking
import Foundation

protocol CompanionRepository: Sendable {
    func fetchContext(contentId: String, language: String) async throws -> CompanionContextResponse
    func fetchQuiz(contentId: String, language: String) async throws -> CompanionQuizResponse
}

final class APICompanionRepository: CompanionRepository, @unchecked Sendable {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchContext(contentId: String, language: String) async throws -> CompanionContextResponse {
        let body = CompanionRequestBody(contentId: contentId, language: language)
        return try await client.post(
            "/api/v1/companion/context",
            body: body,
            as: CompanionContextResponse.self
        )
    }

    func fetchQuiz(contentId: String, language: String) async throws -> CompanionQuizResponse {
        let body = CompanionRequestBody(contentId: contentId, language: language)
        return try await client.post(
            "/api/v1/companion/quiz",
            body: body,
            as: CompanionQuizResponse.self
        )
    }
}

private struct CompanionRequestBody: Encodable, Sendable {
    let contentId: String
    let language: String
}
