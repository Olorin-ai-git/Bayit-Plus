import BayitNetworking
import Foundation

/// Repository protocol for audiobook listing and detail API operations.
protocol AudiobookRepository: Sendable {
    func fetchAll(page: Int?, pageSize: Int?, genre: String?, author: String?) async throws -> AudiobookListResponse
    func fetchDetail(id: String) async throws -> Audiobook
    func fetchWithChapters(id: String) async throws -> Audiobook
    func fetchAuthors() async throws -> AudiobookAuthorsResponse
    func invalidateCache()
}

/// Production implementation of `AudiobookRepository` using `APIClient`.
///
/// Caches the full unfiltered audiobook list and authors so that author/genre
/// filtering and the author-detail screen resolve instantly from memory.
final class APIAudiobookRepository: AudiobookRepository, @unchecked Sendable {
    private let client: APIClient
    private let lock = NSLock()
    private var cachedAll: AudiobookListResponse?
    private var cachedAuthors: AudiobookAuthorsResponse?

    init(client: APIClient) {
        self.client = client
    }

    func fetchAll(
        page: Int?,
        pageSize: Int?,
        genre: String?,
        author: String?
    ) async throws -> AudiobookListResponse {
        // Serve filtered requests from cache when possible
        let cached = lock.withLock { cachedAll }
        if let cached, let allItems = cached.items, author != nil || genre != nil {
            let filtered = allItems.filter { item in
                if let author, item.author?.caseInsensitiveCompare(author) != .orderedSame {
                    return false
                }
                return true
            }
            return AudiobookListResponse(
                items: filtered,
                total: filtered.count,
                page: 1,
                pageSize: filtered.count,
                totalPages: 1
            )
        }

        var queryItems: [URLQueryItem] = []
        if let page {
            queryItems.append(URLQueryItem(name: "page", value: String(page)))
        }
        if let pageSize {
            queryItems.append(URLQueryItem(name: "page_size", value: String(pageSize)))
        }
        if let author {
            queryItems.append(URLQueryItem(name: "author", value: author))
        }
        let response: AudiobookListResponse = try await client.get(
            "/api/v1/audiobooks",
            queryItems: queryItems,
            as: AudiobookListResponse.self
        )

        // Cache the full unfiltered response
        if author == nil && genre == nil {
            lock.withLock { cachedAll = response }
        }

        return response
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

    func fetchAuthors() async throws -> AudiobookAuthorsResponse {
        let cached = lock.withLock { cachedAuthors }
        if let cached { return cached }

        let response: AudiobookAuthorsResponse = try await client.get(
            "/api/v1/audiobooks/authors",
            as: AudiobookAuthorsResponse.self
        )
        lock.withLock { cachedAuthors = response }
        return response
    }

    func invalidateCache() {
        lock.withLock {
            cachedAll = nil
            cachedAuthors = nil
        }
    }
}
