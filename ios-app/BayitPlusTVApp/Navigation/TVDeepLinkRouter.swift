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

        case "help":
            return .help

        case "missions":
            return .missions

        case "leaderboard":
            return .missionsLeaderboard

        case "wallet":
            return .shekelsWallet

        case "coupons":
            return .couponShop

        case "culture":
            guard let cultureId = pathComponents.dropFirst().first else { return nil }
            return .cultureDetail(id: cultureId)

        case "subscribe":
            return .subscriptionGate

        case "credits":
            return nil // Handled by tab navigation to profile

        case "accounts":
            return .connectedAccounts

        case "companion":
            guard let contentId = pathComponents.dropFirst().first else { return nil }
            return .aiCompanion(contentId: contentId)

        case "quiz":
            guard let contentId = pathComponents.dropFirst().first else { return nil }
            return .quiz(contentId: contentId)

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
        case "vod": return .vod
        case "zeh-ani", "avatar", "chess", "chatbot", "ai-chat": return .zehAni
        case "podcasts", "audiobooks": return .podcasts
        case "kids", "children", "youngsters": return .home
        case "byoc", "iptv", "plex", "xtream": return .byoc
        case "search": return .search
        case "discover": return .discover
        case "profile", "settings", "favorites", "messages", "friends",
             "help", "accounts", "credits", "subscribe": return .profile
        case "missions", "leaderboard", "wallet", "coupons": return .profile
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
