import BayitNetworking
import Foundation

/// Repository protocol for Shabbat times, zmanim, and related content API operations.
protocol ShabbatRepository: Sendable {
    func fetchZmanTime(timezone: String?) async throws -> ZmanTimeResponse
    func fetchShabbatTimes(lat: Double, lon: Double) async throws -> ShabbatStatus
    func fetchShabbatContent() async throws -> [ContentItem]
    func updatePreferences(_ prefs: ZmanPreferences) async throws
}

/// Production implementation of `ShabbatRepository` using `APIClient`.
final class APIShabbatRepository: ShabbatRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchZmanTime(timezone: String?) async throws -> ZmanTimeResponse {
        var queryItems: [URLQueryItem] = []
        if let timezone {
            queryItems.append(URLQueryItem(name: "timezone", value: timezone))
        }
        return try await client.get(
            "/api/v1/zman/time",
            queryItems: queryItems,
            as: ZmanTimeResponse.self
        )
    }

    func fetchShabbatTimes(lat: Double, lon: Double) async throws -> ShabbatStatus {
        let queryItems = [
            URLQueryItem(name: "lat", value: String(lat)),
            URLQueryItem(name: "lon", value: String(lon)),
        ]
        return try await client.get(
            "/api/v1/shabbat/times",
            queryItems: queryItems,
            as: ShabbatStatus.self
        )
    }

    func fetchShabbatContent() async throws -> [ContentItem] {
        return try await client.get(
            "/api/v1/shabbat/content",
            as: [ContentItem].self
        )
    }

    func updatePreferences(_ prefs: ZmanPreferences) async throws {
        _ = try await client.put(
            "/api/v1/zman/preferences",
            body: prefs,
            as: MessageResponse.self
        )
    }
}
