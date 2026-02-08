import BayitNetworking
import Foundation

/// Repository protocol for trivia and quiz API operations.
protocol TriviaRepository: Sendable {
    func fetchTrivia(contentId: String, language: String?) async throws -> TriviaResponse
    func fetchQuiz(contentId: String, profileId: String?) async throws -> QuizResponse
    func submitQuiz(_ submission: QuizSubmission) async throws -> QuizResult
    func fetchPreferences() async throws -> TriviaPreferences
    func updatePreferences(_ update: TriviaPreferencesUpdate) async throws -> TriviaPreferences
}

/// Production implementation of `TriviaRepository` using `APIClient`.
final class APITriviaRepository: TriviaRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchTrivia(contentId: String, language: String?) async throws -> TriviaResponse {
        var queryItems: [URLQueryItem] = []
        if let language {
            queryItems.append(URLQueryItem(name: "language", value: language))
        }
        queryItems.append(URLQueryItem(name: "multilingual", value: "true"))
        return try await client.get(
            "/api/v1/trivia/\(contentId)",
            queryItems: queryItems,
            as: TriviaResponse.self
        )
    }

    func fetchQuiz(contentId: String, profileId: String?) async throws -> QuizResponse {
        var queryItems: [URLQueryItem] = []
        if let profileId {
            queryItems.append(URLQueryItem(name: "profile_id", value: profileId))
        }
        return try await client.get(
            "/api/v1/trivia/\(contentId)/quiz",
            queryItems: queryItems,
            as: QuizResponse.self
        )
    }

    func submitQuiz(_ submission: QuizSubmission) async throws -> QuizResult {
        return try await client.post(
            "/api/v1/trivia/quiz/submit",
            body: submission,
            as: QuizResult.self
        )
    }

    func fetchPreferences() async throws -> TriviaPreferences {
        return try await client.get(
            "/api/v1/trivia/preferences/me",
            as: TriviaPreferences.self
        )
    }

    func updatePreferences(_ update: TriviaPreferencesUpdate) async throws -> TriviaPreferences {
        return try await client.put(
            "/api/v1/trivia/preferences/me",
            body: update,
            as: TriviaPreferences.self
        )
    }
}
