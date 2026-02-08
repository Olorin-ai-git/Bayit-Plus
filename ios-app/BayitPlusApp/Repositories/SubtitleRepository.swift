import BayitNetworking
import Foundation

/// Repository protocol for subtitle cues, translation, and preferences API operations.
protocol SubtitleRepository: Sendable {
    func fetchCues(contentId: String, language: String?, withNikud: Bool?) async throws -> SubtitleCuesResponse
    func translateWord(word: String, sourceLang: String?, targetLang: String?) async throws -> TranslationResult
    func translatePhrase(phrase: String, sourceLang: String?, targetLang: String?) async throws -> TranslationResult
    func fetchPreferences(contentId: String) async throws -> SubtitlePreferencesResponse
    func updatePreferences(_ update: SubtitlePreferencesUpdate) async throws
}

/// Production implementation of `SubtitleRepository` using `APIClient`.
final class APISubtitleRepository: SubtitleRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchCues(
        contentId: String,
        language: String?,
        withNikud: Bool?
    ) async throws -> SubtitleCuesResponse {
        var queryItems: [URLQueryItem] = []
        if let language {
            queryItems.append(URLQueryItem(name: "language", value: language))
        }
        if let withNikud {
            queryItems.append(URLQueryItem(name: "nikud", value: String(withNikud)))
        }
        return try await client.get(
            "/api/v1/subtitles/\(contentId)/cues",
            queryItems: queryItems,
            as: SubtitleCuesResponse.self
        )
    }

    func translateWord(
        word: String,
        sourceLang: String?,
        targetLang: String?
    ) async throws -> TranslationResult {
        struct TranslateRequest: Encodable, Sendable {
            let word: String
            let sourceLang: String?
            let targetLang: String?
        }
        return try await client.post(
            "/api/v1/subtitles/translate",
            body: TranslateRequest(word: word, sourceLang: sourceLang, targetLang: targetLang),
            as: TranslationResult.self
        )
    }

    func translatePhrase(
        phrase: String,
        sourceLang: String?,
        targetLang: String?
    ) async throws -> TranslationResult {
        struct TranslateRequest: Encodable, Sendable {
            let phrase: String
            let sourceLang: String?
            let targetLang: String?
        }
        return try await client.post(
            "/api/v1/subtitles/translate-phrase",
            body: TranslateRequest(phrase: phrase, sourceLang: sourceLang, targetLang: targetLang),
            as: TranslationResult.self
        )
    }

    func fetchPreferences(contentId: String) async throws -> SubtitlePreferencesResponse {
        return try await client.get(
            "/api/v1/subtitles/\(contentId)/preferences",
            as: SubtitlePreferencesResponse.self
        )
    }

    func updatePreferences(_ update: SubtitlePreferencesUpdate) async throws {
        _ = try await client.put(
            "/api/v1/subtitles/preferences",
            body: update,
            as: MessageResponse.self
        )
    }
}
