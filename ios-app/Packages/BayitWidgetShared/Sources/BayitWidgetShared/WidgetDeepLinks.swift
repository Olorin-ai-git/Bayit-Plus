import Foundation

/// Builds deep link URLs for widget tap actions.
///
/// All widgets use the `bayitplus://` URL scheme handled by the
/// main app's `NavigationCoordinator.handleDeepLink(_:)`.
public enum WidgetDeepLinks {

    private static let scheme = "bayitplus"

    // MARK: - Navigation

    /// Deep link to the Live TV tab.
    public static var liveTV: URL {
        buildURL(path: "live")
    }

    /// Deep link to the Radio tab.
    public static var radio: URL {
        buildURL(path: "radio")
    }

    /// Deep link to the Podcasts tab.
    public static var podcasts: URL {
        buildURL(path: "podcasts")
    }

    /// Deep link to the Audiobooks section.
    public static var audiobooks: URL {
        buildURL(path: "audiobooks")
    }

    /// Deep link to the Search screen.
    public static var search: URL {
        buildURL(path: "search")
    }

    /// Deep link to the Trending section.
    public static var trending: URL {
        buildURL(path: "trending")
    }

    /// Deep link to Shabbat Mode.
    public static var shabbatMode: URL {
        buildURL(path: "shabbatMode")
    }

    /// Deep link to the Home tab.
    public static var home: URL {
        buildURL(path: "")
    }

    // MARK: - Content

    /// Deep link to a specific content item (movie, series, episode).
    public static func content(id: String, type: SharedContentType) -> URL {
        buildURL(path: "play/\(id)", queryItems: [URLQueryItem(name: "type", value: type.rawValue)])
    }

    /// Deep link to a specific playlist.
    public static func playlist(id: String) -> URL {
        buildURL(path: "playlist/\(id)")
    }

    /// Deep link to a specific channel.
    public static func channel(_ channelID: String) -> URL {
        buildURL(path: "channel/\(channelID)")
    }

    /// Deep link to a specific radio station.
    public static func station(_ stationID: String) -> URL {
        buildURL(path: "station/\(stationID)")
    }

    /// Deep link to a specific audiobook detail.
    public static func audiobook(id: String) -> URL {
        buildURL(path: "audiobooks/\(id)")
    }

    // MARK: - Auth

    /// Deep link to trigger login flow.
    public static var login: URL {
        buildURL(path: "profile")
    }

    // MARK: - Builder

    private static func buildURL(path: String, queryItems: [URLQueryItem] = []) -> URL {
        var components = URLComponents()
        components.scheme = scheme
        components.host = ""
        components.path = "/\(path)"
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        guard let url = components.url else {
            fatalError("Failed to construct widget deep link for path: \(path)")
        }
        return url
    }
}
