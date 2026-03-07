import BayitCore
import Foundation

public extension PlexAPIClient {
    /// Fetch library sections from a specific server.
    func fetchLibraries(
        server: PlexServer
    ) async throws -> [PlexLibrary] {
        let url = URL(string: "\(server.baseURL)/library/sections")!
        let data = try await authenticatedGet(url: url)

        let json = try JSONSerialization.jsonObject(
            with: data
        ) as? [String: Any] ?? [:]
        let container = json["MediaContainer"] as? [String: Any] ?? [:]
        let dirs = container["Directory"] as? [[String: Any]] ?? []

        return dirs.compactMap { dir -> PlexLibrary? in
            guard let key = dir["key"] as? String,
                  let title = dir["title"] as? String,
                  let rawType = dir["type"] as? String
            else { return nil }

            let libType = PlexLibraryType(rawType: rawType)
            guard libType == .movie || libType == .show else { return nil }

            return PlexLibrary(
                id: key,
                title: title,
                type: libType,
                itemCount: dir["count"] as? Int ?? 0
            )
        }
    }

    /// Fetch media items from a library section.
    func fetchLibraryItems(
        server: PlexServer,
        libraryId: String
    ) async throws -> [PlexMediaItem] {
        let urlStr = "\(server.baseURL)/library/sections/\(libraryId)/all"
        let data = try await authenticatedGet(url: URL(string: urlStr)!)

        let json = try JSONSerialization.jsonObject(
            with: data
        ) as? [String: Any] ?? [:]
        let container = json["MediaContainer"] as? [String: Any] ?? [:]
        let metadata = container["Metadata"] as? [[String: Any]] ?? []

        return metadata.compactMap { item -> PlexMediaItem? in
            guard let key = item["ratingKey"] as? String,
                  let title = item["title"] as? String
            else { return nil }

            let rawType = item["type"] as? String ?? "movie"
            let genres = item["Genre"] as? [[String: Any]] ?? []
            let firstGenre = genres.first?["tag"] as? String

            let media = item["Media"] as? [[String: Any]] ?? []
            let parts = media.first?["Part"] as? [[String: Any]] ?? []
            let streamPath = parts.first?["key"] as? String

            return PlexMediaItem(
                id: key,
                title: title,
                summary: item["summary"] as? String,
                year: item["year"] as? Int,
                duration: (item["duration"] as? Int).map { $0 / 1000 },
                thumbPath: item["thumb"] as? String,
                artPath: item["art"] as? String,
                genre: firstGenre,
                contentType: PlexLibraryType(rawType: rawType),
                streamPath: streamPath
            )
        }
    }

    /// Build a full stream URL for a media item.
    func streamURL(
        server: PlexServer,
        path: String
    ) -> URL? {
        var components = URLComponents(
            string: "\(server.baseURL)\(path)"
        )
        components?.queryItems = [
            URLQueryItem(name: "X-Plex-Token", value: authToken),
        ]
        return components?.url
    }
}
