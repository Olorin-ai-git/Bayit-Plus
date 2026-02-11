import BayitNetworking
import Foundation

/// Repository protocol for chat, transcription, and TTS API operations.
protocol ChatRepository: Sendable {
    func sendMessage(_ request: ChatRequest) async throws -> ChatResponse
    func getConversation(id: String) async throws -> [ChatMessage]
    func deleteConversation(id: String) async throws
    func transcribeAudio(data: Data, language: String?) async throws -> TranscribeResponse
    func resolveContent(_ request: ResolveContentRequest) async throws -> ResolveContentResponse
    func textToSpeech(text: String, language: String?) async throws -> Data
}

/// Production implementation of `ChatRepository` using `APIClient`.
final class APIChatRepository: ChatRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func sendMessage(_ request: ChatRequest) async throws -> ChatResponse {
        return try await client.post(
            "/api/v1/chat/message",
            body: request,
            as: ChatResponse.self
        )
    }

    func getConversation(id: String) async throws -> [ChatMessage] {
        return try await client.get(
            "/api/v1/chat/conversations/\(id)",
            as: [ChatMessage].self
        )
    }

    func deleteConversation(id: String) async throws {
        _ = try await client.delete(
            "/api/v1/chat/conversations/\(id)",
            as: MessageResponse.self
        )
    }

    func transcribeAudio(data: Data, language: String?) async throws -> TranscribeResponse {
        let payload = AudioTranscribePayload(
            audio: data.base64EncodedString(),
            language: language
        )
        return try await client.post(
            "/api/v1/chat/transcribe",
            body: payload,
            as: TranscribeResponse.self
        )
    }

    func resolveContent(_ request: ResolveContentRequest) async throws -> ResolveContentResponse {
        return try await client.post(
            "/api/v1/chat/resolve-content",
            body: request,
            as: ResolveContentResponse.self
        )
    }

    func textToSpeech(text: String, language: String?) async throws -> Data {
        struct TTSRequest: Encodable, Sendable {
            let text: String
            let language: String?
        }
        return try await client.post(
            "/api/v1/tts/synthesize",
            body: TTSRequest(text: text, language: language),
            as: Data.self
        )
    }
}
