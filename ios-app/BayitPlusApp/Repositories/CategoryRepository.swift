import BayitNetworking
import Foundation

/// Production implementation of `CategoryRepository` using `APIClient`.
final class APICategoryRepository: CategoryRepository, @unchecked Sendable {
    let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    // MARK: - Children

    func fetchChildrenCategories() async throws -> ChildrenCategoriesResponse {
        return try await client.get(
            "/api/v1/children/categories",
            as: ChildrenCategoriesResponse.self
        )
    }

    func fetchChildrenContent(
        category: String?,
        ageGroup: String?,
        page: Int,
        limit: Int
    ) async throws -> ChildrenContentResponse {
        var queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        if let category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }
        if let ageGroup {
            queryItems.append(URLQueryItem(name: "age_group", value: ageGroup))
        }
        return try await client.get(
            "/api/v1/children/content",
            queryItems: queryItems,
            as: ChildrenContentResponse.self
        )
    }

    func fetchChildrenFeatured() async throws -> ChildrenFeaturedResponse {
        return try await client.get(
            "/api/v1/children/featured",
            as: ChildrenFeaturedResponse.self
        )
    }

    func fetchAgeGroups() async throws -> AgeGroupsResponse {
        return try await client.get(
            "/api/v1/children/age-groups",
            as: AgeGroupsResponse.self
        )
    }

    // MARK: - Youngsters

    func fetchYoungsterCategories() async throws -> YoungstersCategoriesResponse {
        return try await client.get(
            "/api/v1/youngsters/categories",
            as: YoungstersCategoriesResponse.self
        )
    }

    func fetchYoungsterContent(
        category: String?,
        page: Int,
        limit: Int
    ) async throws -> YoungsterContentResponse {
        var queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        if let category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }
        return try await client.get(
            "/api/v1/youngsters/content",
            queryItems: queryItems,
            as: YoungsterContentResponse.self
        )
    }

    func fetchYoungstersFeatured() async throws -> YoungstersFeaturedResponse {
        return try await client.get(
            "/api/v1/youngsters/featured",
            as: YoungstersFeaturedResponse.self
        )
    }

    func fetchYoungstersTrending() async throws -> YoungstersTrendingResponse {
        return try await client.get(
            "/api/v1/youngsters/trending",
            as: YoungstersTrendingResponse.self
        )
    }

    func fetchYoungstersNews() async throws -> YoungstersNewsResponse {
        return try await client.get(
            "/api/v1/youngsters/news",
            as: YoungstersNewsResponse.self
        )
    }
}
