import BayitNetworking
import Foundation

/// Repository protocol for LLM-powered search and suggestions API operations.
protocol LLMSearchRepository: Sendable {
    func llmSearch(_ request: LLMSearchRequest) async throws -> LLMSearchResponse
    func fetchSuggestions(query: String) async throws -> [String]
}

/// Production implementation of `LLMSearchRepository` using `APIClient`.
final class APILLMSearchRepository: LLMSearchRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func llmSearch(_ request: LLMSearchRequest) async throws -> LLMSearchResponse {
        return try await client.post(
            "/api/v1/search/llm",
            body: request,
            as: LLMSearchResponse.self
        )
    }

    func fetchSuggestions(query: String) async throws -> [String] {
        let queryItems = [URLQueryItem(name: "query", value: query)]
        return try await client.get(
            "/api/v1/search/suggestions",
            queryItems: queryItems,
            as: [String].self
        )
    }
}
