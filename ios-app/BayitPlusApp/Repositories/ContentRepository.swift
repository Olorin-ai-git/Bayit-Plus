import BayitNetworking
import Foundation

/// Production implementation of `ContentRepository` using `APIClient`.
///
/// This implementation mirrors the web app's `api.js` pattern:
/// - All paths relative to `baseURL` configured in `APIClient`.
/// - Auth token, correlation ID, locale, and location headers injected automatically.
/// - Retry logic and rate limiting handled by `APIClient`.
///
/// Additional methods are in `ContentRepository+Convenience.swift`.
final class APIContentRepository: ContentRepository, @unchecked Sendable {
    let client: APIClient

    /// Initialize with an `APIClient` instance.
    ///
    /// - Parameter client: The actor-based API client for network requests.
    init(client: APIClient) {
        self.client = client
    }

    // MARK: - ContentRepository

    func fetchFeatured() async throws -> FeaturedResponse {
        return try await client.get(
            "/api/v1/content/featured",
            as: FeaturedResponse.self
        )
    }

    func fetchAllContent(page: Int, limit: Int) async throws -> ContentListResponse {
        let queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit)),
        ]

        return try await client.get(
            "/api/v1/content/all",
            queryItems: queryItems,
            as: ContentListResponse.self
        )
    }

    func fetchContentDetail(id: String) async throws -> ContentDetail {
        return try await client.get(
            "/api/v1/content/\(id)",
            as: ContentDetail.self
        )
    }

    @available(*, deprecated, message: "Use SearchRepository.unifiedSearch() instead")
    func searchContent(
        query: String,
        type: String?,
        page: Int,
        limit: Int
    ) async throws -> SearchResponse {
        var queryItems = [
            URLQueryItem(name: "query", value: query),
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit)),
        ]

        if let type {
            queryItems.append(URLQueryItem(name: "type", value: type))
        }

        // The backend search endpoint is POST but takes query params (not body).
        // Use EmptyBody to satisfy the post() signature.
        return try await client.post(
            "/api/v1/content/search",
            body: EmptyBody(),
            queryItems: queryItems,
            as: SearchResponse.self
        )
    }
}
