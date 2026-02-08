import Foundation

// MARK: - LLM Search
// Note: SearchResponse and SearchRequest are defined in ContentModels.swift for standard search.

/// Request body for POST /api/v1/content/llm-search
struct LLMSearchRequest: Encodable, Sendable {
    let query: String
    let type: String?
    let language: String?
    let limit: Int?
    let includeUserContext: Bool?
}

/// Response from POST /api/v1/content/llm-search
struct LLMSearchResponse: Decodable, Sendable {
    let success: Bool?
    let interpretation: SearchInterpretation?
    let results: [ContentItem]?
    let total: Int?
}

/// AI interpretation of a natural-language search query.
struct SearchInterpretation: Decodable, Sendable {
    let text: String?
    let confidence: Double?
}
