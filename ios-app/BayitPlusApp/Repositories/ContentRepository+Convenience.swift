import BayitNetworking
import Foundation

// MARK: - APIContentRepository Convenience Methods

extension APIContentRepository {
    func fetchIsraelisInCity(city: String, state: String) async throws -> IsraelisInCityResponse {
        let queryItems = [
            URLQueryItem(name: "city", value: city),
            URLQueryItem(name: "state", value: state),
        ]

        return try await client.get(
            "/api/v1/content/israelis-in-city",
            queryItems: queryItems,
            as: IsraelisInCityResponse.self
        )
    }

    func fetchIsraeliBusinesses(city: String, state: String) async throws -> IsraeliBusinessesResponse {
        let queryItems = [
            URLQueryItem(name: "city", value: city),
            URLQueryItem(name: "state", value: state),
        ]

        return try await client.get(
            "/api/v1/content/israeli-businesses-in-city",
            queryItems: queryItems,
            as: IsraeliBusinessesResponse.self
        )
    }

    func fetchTelAvivContent() async throws -> CityContentResponse {
        return try await client.get(
            "/api/v1/tel-aviv/content",
            as: CityContentResponse.self
        )
    }

    func fetchJerusalemContent() async throws -> CityContentResponse {
        return try await client.get(
            "/api/v1/jerusalem/content",
            as: CityContentResponse.self
        )
    }

    func fetchTrending(cultureId: String) async throws -> [CultureTrendingItem] {
        return try await client.get(
            "/api/v1/cultures/\(cultureId)/trending",
            as: [CultureTrendingItem].self
        )
    }

    func fetchSeries(page: Int, limit: Int) async throws -> ContentListResponse {
        let queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit)),
        ]

        return try await client.get(
            "/api/v1/content/series",
            queryItems: queryItems,
            as: ContentListResponse.self
        )
    }

    func fetchCollections(skip: Int, limit: Int) async throws -> [CollectionListItem] {
        let queryItems = [
            URLQueryItem(name: "skip", value: String(skip)),
            URLQueryItem(name: "limit", value: String(limit)),
        ]

        return try await client.get(
            "/api/v1/content/collections",
            queryItems: queryItems,
            as: [CollectionListItem].self
        )
    }

    func fetchCollectionDetail(id: String) async throws -> CollectionDetail {
        return try await client.get(
            "/api/v1/content/collections/\(id)",
            as: CollectionDetail.self
        )
    }

    func fetchCollectionRecommendations() async throws -> [CollectionDetail] {
        return try await client.get(
            "/api/v1/content/collections/recommendations",
            as: [CollectionDetail].self
        )
    }

    func fetchCategories() async throws -> CategoriesResponse {
        return try await client.get(
            "/api/v1/content/categories",
            as: CategoriesResponse.self
        )
    }

    func fetchTrendingRecommendations(limit: Int = 10) async throws -> TrendingRecommendationsResponse {
        return try await client.get(
            "/api/v1/trending/recommendations",
            queryItems: [URLQueryItem(name: "limit", value: String(limit))],
            as: TrendingRecommendationsResponse.self
        )
    }

    func fetchTrailerStream(contentId: String) async throws -> TrailerStreamResponse {
        return try await client.get(
            "/api/v1/content/\(contentId)/trailer",
            as: TrailerStreamResponse.self
        )
    }
}
