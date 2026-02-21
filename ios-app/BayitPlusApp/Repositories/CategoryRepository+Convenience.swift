import BayitNetworking
import Foundation

// MARK: - APICategoryRepository: Judaism, Flows, Morning Ritual, Culture Cities

extension APICategoryRepository {
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
            URLQueryItem(name: "limit", value: String(limit)),
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

    // MARK: - Culture Cities

    func fetchCultureCities(cultureId: String, featuredOnly: Bool) async throws -> [CultureCity] {
        let queryItems = [
            URLQueryItem(name: "featured_only", value: String(featuredOnly)),
        ]
        return try await client.get(
            "/api/v1/cultures/\(cultureId)/cities",
            queryItems: queryItems,
            as: [CultureCity].self
        )
    }

    func fetchCityContent(
        cultureId: String,
        cityId: String,
        limit: Int?
    ) async throws -> CultureContentResponse {
        var queryItems: [URLQueryItem] = []
        if let limit {
            queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
        }
        return try await client.get(
            "/api/v1/cultures/\(cultureId)/cities/\(cityId)/content",
            queryItems: queryItems,
            as: CultureContentResponse.self
        )
    }
}
