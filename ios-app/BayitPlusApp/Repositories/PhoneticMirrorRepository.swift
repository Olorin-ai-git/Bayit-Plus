import BayitNetworking
import Foundation

protocol PhoneticMirrorRepository: Sendable {

    func fetchPhrases(
        profileId: String, difficulty: String, count: Int
    ) async throws -> [PracticePhrase]

    func submitAttempt(
        audio: Data, targetPhraseHe: String,
        targetTransliteration: String,
        avatarId: String, profileId: String
    ) async throws -> MirrorAttemptResult

    func fetchHistory(
        profileId: String, limit: Int, offset: Int
    ) async throws -> MirrorHistoryResponse
}

final class APIPhoneticMirrorRepository: PhoneticMirrorRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchPhrases(
        profileId: String, difficulty: String, count: Int
    ) async throws -> [PracticePhrase] {
        return try await client.get(
            "/api/v1/phonetic-mirror/phrases?profile_id=\(profileId)&difficulty=\(difficulty)&count=\(count)",
            as: [PracticePhrase].self
        )
    }

    func submitAttempt(
        audio: Data, targetPhraseHe: String,
        targetTransliteration: String,
        avatarId: String, profileId: String
    ) async throws -> MirrorAttemptResult {
        let boundary = UUID().uuidString
        var body = Data()

        body.appendMultipart(name: "target_phrase_he", value: targetPhraseHe, boundary: boundary)
        body.appendMultipart(name: "target_transliteration", value: targetTransliteration, boundary: boundary)
        body.appendMultipart(name: "avatar_id", value: avatarId, boundary: boundary)
        body.appendMultipart(name: "profile_id", value: profileId, boundary: boundary)
        body.appendMultipart(name: "source", value: "standalone", boundary: boundary)
        body.appendMultipartFile(name: "audio", filename: "recording.wav", mimeType: "audio/wav", data: audio, boundary: boundary)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        return try await client.postRaw(
            "/api/v1/phonetic-mirror/attempt",
            body: body,
            contentType: "multipart/form-data; boundary=\(boundary)",
            as: MirrorAttemptResult.self
        )
    }

    func fetchHistory(
        profileId: String, limit: Int, offset: Int
    ) async throws -> MirrorHistoryResponse {
        return try await client.get(
            "/api/v1/phonetic-mirror/history?profile_id=\(profileId)&limit=\(limit)&offset=\(offset)",
            as: MirrorHistoryResponse.self
        )
    }
}

struct MirrorHistoryResponse: Codable {
    let attempts: [MirrorAttemptResult]
    let total: Int
    let averageScore: Double

    enum CodingKeys: String, CodingKey {
        case attempts, total
        case averageScore = "average_score"
    }
}

