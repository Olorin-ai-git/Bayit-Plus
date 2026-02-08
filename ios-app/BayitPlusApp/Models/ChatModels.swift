import Foundation

// MARK: - Chat Messages

/// A chat message in a conversation with the AI assistant.
struct ChatMessage: Decodable, Sendable, Identifiable {
    let id: String?
    let role: String?
    let content: String?
    let timestamp: String?

    var stableId: String { id ?? UUID().uuidString }
}

/// Request body for POST /api/v1/chat
struct ChatRequest: Encodable, Sendable {
    let message: String
    let conversationId: String?
    let context: String?
    let language: String?
}

/// Response from POST /api/v1/chat
struct ChatResponse: Decodable, Sendable {
    let response: String?
    let conversationId: String?
    let suggestions: [String]?
}

// MARK: - Transcription

/// Response from POST /api/v1/transcribe
struct TranscribeResponse: Decodable, Sendable {
    let text: String?
    let language: String?
    let confidence: Double?
}

// MARK: - Content Resolution

/// A single item to resolve against the content catalog.
struct ResolveItem: Encodable, Sendable {
    let name: String
    let type: String?
}

/// Request body for POST /api/v1/content/resolve
struct ResolveContentRequest: Encodable, Sendable {
    let items: [ResolveItem]
    let language: String?
}

/// Response from POST /api/v1/content/resolve
struct ResolveContentResponse: Decodable, Sendable {
    let items: [ResolvedContentItem]?
    let unresolved: Int?
    let totalRequested: Int?
    let totalResolved: Int?
}

/// A content item resolved from a natural-language reference.
struct ResolvedContentItem: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let type: String?
    let thumbnail: String?
    let streamUrl: String?
    let matchedName: String?
    let confidence: Double?
}
