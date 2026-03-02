import BayitNetworking
import Foundation

/// Production implementation of `ActorRepository` using `APIClient`.
final class APIActorRepository: ActorRepository, @unchecked Sendable {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchActors(skip: Int, limit: Int) async throws -> [ActorListItem] {
        let queryItems = [
            URLQueryItem(name: "skip", value: String(skip)),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        return try await client.get(
            "/api/v1/content/actors",
            queryItems: queryItems,
            as: [ActorListItem].self
        )
    }

    func fetchActorRecommendations(limit: Int) async throws -> [ActorListItem] {
        let queryItems = [
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        return try await client.get(
            "/api/v1/content/actors/recommendations",
            queryItems: queryItems,
            as: [ActorListItem].self
        )
    }

    func fetchActorDetail(name: String) async throws -> ActorDetail {
        let encoded = name.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? name
        return try await client.get(
            "/api/v1/content/actors/\(encoded)",
            as: ActorDetail.self
        )
    }
}
