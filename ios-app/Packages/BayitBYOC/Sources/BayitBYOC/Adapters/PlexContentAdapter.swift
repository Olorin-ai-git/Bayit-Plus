import Foundation

/// Converts Plex media items into BYOCContentItem for unified display.
public enum PlexContentAdapter {
    /// Convert a Plex media item to a BYOC content item.
    public static func adapt(
        item: PlexMediaItem,
        server: PlexServer,
        sourceId: String,
        authToken: String
    ) -> BYOCContentItem {
        let thumb: URL? = item.thumbPath.flatMap { path in
            imageURL(server: server, path: path, token: authToken)
        }
        let art: URL? = item.artPath.flatMap { path in
            imageURL(server: server, path: path, token: authToken)
        }
        let stream: URL? = item.streamPath.flatMap { path in
            mediaURL(server: server, path: path, token: authToken)
        }

        return BYOCContentItem(
            id: "plex-\(sourceId)-\(item.id)",
            title: item.title,
            description: item.summary,
            thumbnailURL: thumb,
            backdropURL: art,
            duration: item.duration,
            year: item.year,
            genre: item.genre,
            sourceType: .plex,
            sourceId: sourceId,
            streamURL: stream,
            contentType: mapContentType(item.contentType)
        )
    }

    /// Convert an array of Plex items.
    public static func adaptAll(
        items: [PlexMediaItem],
        server: PlexServer,
        sourceId: String,
        authToken: String
    ) -> [BYOCContentItem] {
        items.map { adapt(
            item: $0,
            server: server,
            sourceId: sourceId,
            authToken: authToken
        ) }
    }

    private static func mapContentType(
        _ type: PlexLibraryType
    ) -> BYOCContentType {
        switch type {
        case .movie: return .movie
        case .show: return .series
        default: return .movie
        }
    }

    private static func imageURL(
        server: PlexServer,
        path: String,
        token: String
    ) -> URL? {
        authenticatedURL(server: server, path: path, token: token)
    }

    private static func mediaURL(
        server: PlexServer,
        path: String,
        token: String
    ) -> URL? {
        authenticatedURL(server: server, path: path, token: token)
    }

    private static func authenticatedURL(
        server: PlexServer,
        path: String,
        token: String
    ) -> URL? {
        var components = URLComponents(
            string: "\(server.baseURL)\(path)"
        )
        components?.queryItems = [
            URLQueryItem(name: "X-Plex-Token", value: token),
        ]
        return components?.url
    }
}
