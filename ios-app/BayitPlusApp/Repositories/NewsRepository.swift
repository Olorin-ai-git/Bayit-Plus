import BayitNetworking
import Foundation

/// Repository protocol for news API operations.
protocol NewsRepository: Sendable {
    /// Fetch Ynet breaking news (mivzakim).
    ///
    /// - Parameter limit: Maximum number of items to return.
    /// - Returns: Mivzakim response with news items.
    /// - Throws: `APIError` if the request fails.
    func fetchMivzakim(limit: Int) async throws -> MivzakimResponse
}

/// API-backed implementation of `NewsRepository`.
struct APINewsRepository: NewsRepository {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchMivzakim(limit: Int) async throws -> MivzakimResponse {
        try await client.get(
            "/api/v1/news/mivzakim",
            queryItems: [URLQueryItem(name: "limit", value: String(limit))],
            as: MivzakimResponse.self
        )
    }
}
