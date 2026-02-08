import BayitNetworking
import Foundation

/// Repository protocol for culture-specific content API operations.
protocol CultureRepository: Sendable {
    func fetchJerusalemContent(category: String?, page: Int?, limit: Int?) async throws -> CultureContentResponse
    func fetchTelAvivContent(category: String?, page: Int?, limit: Int?) async throws -> CultureContentResponse
    func fetchCultureCategories(cultureId: String) async throws -> [CultureCategory]
    func fetchCultureTime(cultureId: String) async throws -> CultureTime
    func fetchTrending(cultureId: String, limit: Int?) async throws -> CultureContentResponse
}

/// Production implementation of `CultureRepository` using `APIClient`.
final class APICultureRepository: CultureRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchJerusalemContent(
        category: String?,
        page: Int?,
        limit: Int?
    ) async throws -> CultureContentResponse {
        var queryItems: [URLQueryItem] = []
        if let category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }
        if let page {
            queryItems.append(URLQueryItem(name: "page", value: String(page)))
        }
        if let limit {
            queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
        }
        return try await client.get(
            "/api/v1/jerusalem/content",
            queryItems: queryItems,
            as: CultureContentResponse.self
        )
    }

    func fetchTelAvivContent(
        category: String?,
        page: Int?,
        limit: Int?
    ) async throws -> CultureContentResponse {
        var queryItems: [URLQueryItem] = []
        if let category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }
        if let page {
            queryItems.append(URLQueryItem(name: "page", value: String(page)))
        }
        if let limit {
            queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
        }
        return try await client.get(
            "/api/v1/tel-aviv/content",
            queryItems: queryItems,
            as: CultureContentResponse.self
        )
    }

    func fetchCultureCategories(cultureId: String) async throws -> [CultureCategory] {
        return try await client.get(
            "/api/v1/cultures/\(cultureId)/categories",
            as: [CultureCategory].self
        )
    }

    func fetchCultureTime(cultureId: String) async throws -> CultureTime {
        return try await client.get(
            "/api/v1/cultures/\(cultureId)/time",
            as: CultureTime.self
        )
    }

    func fetchTrending(cultureId: String, limit: Int?) async throws -> CultureContentResponse {
        var queryItems: [URLQueryItem] = []
        if let limit {
            queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
        }
        return try await client.get(
            "/api/v1/cultures/\(cultureId)/trending",
            queryItems: queryItems,
            as: CultureContentResponse.self
        )
    }
}
