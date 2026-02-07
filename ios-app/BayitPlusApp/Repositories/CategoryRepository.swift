import BayitNetworking
import Foundation

/// Repository protocol for category-based content sections:
/// children, youngsters, judaism, flows, and morning ritual.
protocol CategoryRepository: Sendable {

    // MARK: - Children

    /// Fetch children content categories.
    func fetchChildrenCategories() async throws -> ChildrenCategoriesResponse

    /// Fetch children content with optional category and age group filters.
    func fetchChildrenContent(
        category: String?,
        ageGroup: String?,
        page: Int,
        limit: Int
    ) async throws -> ChildrenContentResponse

    /// Fetch children featured content.
    func fetchChildrenFeatured() async throws -> ChildrenFeaturedResponse

    /// Fetch available age groups for filtering.
    func fetchAgeGroups() async throws -> AgeGroupsResponse

    // MARK: - Youngsters

    /// Fetch youngsters content categories.
    func fetchYoungsterCategories() async throws -> YoungstersCategoriesResponse

    /// Fetch youngsters content with optional category filter.
    func fetchYoungsterContent(
        category: String?,
        page: Int,
        limit: Int
    ) async throws -> YoungsterContentResponse

    /// Fetch youngsters featured content.
    func fetchYoungstersFeatured() async throws -> YoungstersFeaturedResponse

    /// Fetch trending youngster content.
    func fetchYoungstersTrending() async throws -> YoungstersTrendingResponse

    /// Fetch youngsters news.
    func fetchYoungstersNews() async throws -> YoungstersNewsResponse

    // MARK: - Judaism

    /// Fetch judaism content categories.
    func fetchJudaismCategories() async throws -> JudaismCategoriesResponse

    /// Fetch judaism content with optional category filter.
    func fetchJudaismContent(
        category: String?,
        page: Int,
        limit: Int
    ) async throws -> JudaismContentResponse

    /// Fetch Jewish calendar events with related content.
    func fetchJudaismCalendar() async throws -> JudaismCalendarResponse

    /// Fetch judaism news.
    func fetchJudaismNews() async throws -> JudaismNewsResponse

    // MARK: - Flows

    /// Fetch available content flows.
    func fetchFlows() async throws -> FlowsResponse

    // MARK: - Morning Ritual

    /// Check morning ritual availability and streak.
    func checkRitual() async throws -> RitualCheckResponse

    /// Fetch today's morning ritual content.
    func fetchRitualContent() async throws -> RitualContentResponse

    /// Fetch AI-generated morning brief.
    func fetchRitualAIBrief() async throws -> RitualAIBriefResponse

    /// Fetch morning ritual preferences.
    func fetchRitualPreferences() async throws -> RitualPreferences

    /// Update morning ritual preferences.
    func updateRitualPreferences(
        request: RitualPreferencesUpdate
    ) async throws -> RitualPreferences
}

/// Production implementation of `CategoryRepository` using `APIClient`.
final class APICategoryRepository: CategoryRepository, @unchecked Sendable {

    private let client: APIClient

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
            URLQueryItem(name: "limit", value: String(limit))
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
            URLQueryItem(name: "limit", value: String(limit))
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

    // MARK: - Judaism

    func fetchJudaismCategories() async throws -> JudaismCategoriesResponse {
        return try await client.get(
            "/api/v1/judaism/categories",
            as: JudaismCategoriesResponse.self
        )
    }

    func fetchJudaismContent(
        category: String?,
        page: Int,
        limit: Int
    ) async throws -> JudaismContentResponse {
        var queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]
        if let category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }
        return try await client.get(
            "/api/v1/judaism/content",
            queryItems: queryItems,
            as: JudaismContentResponse.self
        )
    }

    func fetchJudaismCalendar() async throws -> JudaismCalendarResponse {
        return try await client.get(
            "/api/v1/judaism/calendar",
            as: JudaismCalendarResponse.self
        )
    }

    func fetchJudaismNews() async throws -> JudaismNewsResponse {
        return try await client.get(
            "/api/v1/judaism/news",
            as: JudaismNewsResponse.self
        )
    }

    // MARK: - Flows

    func fetchFlows() async throws -> FlowsResponse {
        return try await client.get(
            "/api/v1/flows",
            as: FlowsResponse.self
        )
    }

    // MARK: - Morning Ritual

    func checkRitual() async throws -> RitualCheckResponse {
        return try await client.get(
            "/api/v1/ritual/check",
            as: RitualCheckResponse.self
        )
    }

    func fetchRitualContent() async throws -> RitualContentResponse {
        return try await client.get(
            "/api/v1/ritual/content",
            as: RitualContentResponse.self
        )
    }

    func fetchRitualAIBrief() async throws -> RitualAIBriefResponse {
        return try await client.get(
            "/api/v1/ritual/ai-brief",
            as: RitualAIBriefResponse.self
        )
    }

    func fetchRitualPreferences() async throws -> RitualPreferences {
        return try await client.get(
            "/api/v1/ritual/preferences",
            as: RitualPreferences.self
        )
    }

    func updateRitualPreferences(
        request: RitualPreferencesUpdate
    ) async throws -> RitualPreferences {
        return try await client.put(
            "/api/v1/ritual/preferences",
            body: request,
            as: RitualPreferences.self
        )
    }
}
