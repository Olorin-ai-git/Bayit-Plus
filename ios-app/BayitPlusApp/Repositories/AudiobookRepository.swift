import BayitNetworking
import Foundation

/// Repository protocol for audiobook listing and detail API operations.
protocol AudiobookRepository: Sendable {
    func fetchAll(page: Int?, pageSize: Int?, genre: String?, author: String?) async throws -> AudiobookListResponse
    func fetchDetail(id: String) async throws -> Audiobook
    func fetchWithChapters(id: String) async throws -> Audiobook
}

/// Production implementation of `AudiobookRepository` using `APIClient`.
final class APIAudiobookRepository: AudiobookRepository, @unchecked Sendable {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchAll(
        page: Int?,
        pageSize: Int?,
        genre: String?,
        author: String?
    ) async throws -> AudiobookListResponse {
        var queryItems: [URLQueryItem] = []
        if let page {
            queryItems.append(URLQueryItem(name: "page", value: String(page)))
        }
        if let pageSize {
            queryItems.append(URLQueryItem(name: "page_size", value: String(pageSize)))
        }
        if let genre {
            queryItems.append(URLQueryItem(name: "genre", value: genre))
        }
        if let author {
            queryItems.append(URLQueryItem(name: "author", value: author))
        }
        return try await client.get(
            "/api/v1/audiobooks",
            queryItems: queryItems,
            as: AudiobookListResponse.self
        )
    }

    func fetchDetail(id: String) async throws -> Audiobook {
        return try await client.get(
            "/api/v1/audiobooks/\(id)",
            as: Audiobook.self
        )
    }

    func fetchWithChapters(id: String) async throws -> Audiobook {
        return try await client.get(
            "/api/v1/audiobooks/\(id)/chapters",
            as: Audiobook.self
        )
    }
}
