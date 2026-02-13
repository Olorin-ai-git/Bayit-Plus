import BayitNetworking
import Foundation

/// Repository protocol for subtitle cues, translation, and preferences API operations.
protocol SubtitleRepository: Sendable {
    func fetchCues(contentId: String, language: String?, hebrewMode: SubtitleHebrewMode?, englishMode: SubtitleEnglishMode?) async throws -> SubtitleCuesResponse
    func fetchExternalSubtitles(contentId: String) async throws -> ExternalSubtitleImportResponse
    func translateWord(word: String, sourceLang: String?, targetLang: String?) async throws -> TranslationResult
    func translatePhrase(phrase: String, sourceLang: String?, targetLang: String?) async throws -> TranslationResult
    func fetchPreferences(contentId: String) async throws -> SubtitlePreferencesResponse
    func updatePreferences(_ update: SubtitlePreferencesUpdate) async throws
}

/// Production implementation of `SubtitleRepository` using `APIClient`.
final class APISubtitleRepository: SubtitleRepository, @unchecked Sendable {

    internal let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchCues(
        contentId: String,
        language: String?,
        hebrewMode: SubtitleHebrewMode?,
        englishMode: SubtitleEnglishMode?
    ) async throws -> SubtitleCuesResponse {
        var queryItems: [URLQueryItem] = []
        if let language {
            queryItems.append(URLQueryItem(name: "language", value: language))
        }
        if let hebrewMode {
            queryItems.append(URLQueryItem(name: "hebrew_mode", value: hebrewMode.rawValue))
        }
        if let englishMode {
            queryItems.append(URLQueryItem(name: "english_mode", value: englishMode.rawValue))
        }
        return try await client.get(
            "/api/v1/subtitles/\(contentId)/cues",
            queryItems: queryItems,
            as: SubtitleCuesResponse.self
        )
    }

    func fetchExternalSubtitles(contentId: String) async throws -> ExternalSubtitleImportResponse {
        return try await client.post(
            "/api/v1/subtitles/\(contentId)/fetch-external",
            body: EmptyRequest(),
            as: ExternalSubtitleImportResponse.self
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
            "/api/v1/subtitles/preferences/\(contentId)",
            as: SubtitlePreferencesResponse.self
        )
    }

    func updatePreferences(_ update: SubtitlePreferencesUpdate) async throws {
        let queryItems = [
            URLQueryItem(name: "language", value: update.language),
            URLQueryItem(name: "hebrew_mode", value: "regular")
        ]
        _ = try await client.post(
            "/api/v1/subtitles/preferences/\(update.contentId)",
            body: EmptyRequest(),
            queryItems: queryItems,
            as: MessageResponse.self
        )
    }
}

// MARK: - Helper Types

private struct EmptyRequest: Encodable, Sendable {}
