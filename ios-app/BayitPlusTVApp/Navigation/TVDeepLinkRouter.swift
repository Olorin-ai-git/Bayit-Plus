import BayitMedia
import Foundation

/// Parses `bayitplus://` deep link URLs into tvOS-specific `TVRoute` values.
/// Simplified version of the iOS `DeepLinkRouter` supporting the routes
/// available on Apple TV (player, tab switches, Top Shelf content links).
enum TVDeepLinkRouter {

    /// Attempt to parse a URL into a `TVRoute`.
    /// Returns `nil` if the URL does not match any known route.
    static func route(from url: URL) -> TVRoute? {
        let pathComponents = url.pathComponents.filter { $0 != "/" }
        guard let first = pathComponents.first else { return nil }

        switch first {
        case "play":
            guard let contentId = pathComponents.dropFirst().first else { return nil }
            let typeString = queryValue(from: url, key: "type")
            let contentType = TVContentTypeMapper.map(typeString)
            let channelId = queryValue(from: url, key: "channelId")
            return .player(
                contentId: contentId,
                contentType: contentType,
                channelId: channelId
            )

        case "content":
            guard let contentId = pathComponents.dropFirst().first else { return nil }
            let typeString = queryValue(from: url, key: "type")
            let contentType = TVContentTypeMapper.map(typeString)
            return .player(contentId: contentId, contentType: contentType, channelId: nil)

        case "podcast":
            guard let showId = pathComponents.dropFirst().first else { return nil }
            return .podcastDetail(showId: showId)

        case "series":
            guard let seriesId = pathComponents.dropFirst().first else { return nil }
            return .seriesDetail(seriesId: seriesId)

        case "movie":
            guard let movieId = pathComponents.dropFirst().first else { return nil }
            return .movieDetail(movieId: movieId)

        default:
            return nil
        }
    }

    /// Extract the target tab from a deep link URL, if applicable.
    /// Used for tab-level navigation (e.g., `bayitplus://live` switches to Live TV tab).
    static func targetTab(from url: URL) -> TVTab? {
        let pathComponents = url.pathComponents.filter { $0 != "/" }
        guard let first = pathComponents.first else { return .home }

        switch first {
        case "home": return .home
        case "live": return .liveTV
        case "podcasts": return .podcasts
        case "audiobooks": return .audiobooks
        case "search": return .search
        case "vod": return .vod
        case "favorites": return .favorites
        case "profile": return .profile
        case "settings": return .settings
        default: return nil
        }
    }

    // MARK: - Private Helpers

    private static func queryValue(from url: URL, key: String) -> String? {
        URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == key })?
            .value
    }
}
