import BayitMedia
import Foundation

/// Navigation routes for the tvOS app.
/// Simpler than iOS routes since tvOS uses tab-level navigation with fullscreen modals.
enum TVRoute: Hashable, Identifiable {

    var id: Int { hashValue }
    /// Present the fullscreen player.
    case player(contentId: String, contentType: MediaContentType, channelId: String?)
    /// Navigate to podcast detail screen.
    case podcastDetail(showId: String)
    /// Navigate to series detail screen.
    case seriesDetail(seriesId: String)
    /// Navigate to movie detail screen.
    case movieDetail(movieId: String)
    /// Navigate to audiobook detail screen.
    case audiobookDetail(audiobookId: String)
    /// Show voice assistant overlay.
    case voiceAssistant

    // MARK: - Hashable

    func hash(into hasher: inout Hasher) {
        switch self {
        case .player(let contentId, let contentType, let channelId):
            hasher.combine("player")
            hasher.combine(contentId)
            hasher.combine(contentType.rawValue)
            hasher.combine(channelId)
        case .podcastDetail(let showId):
            hasher.combine("podcastDetail")
            hasher.combine(showId)
        case .seriesDetail(let seriesId):
            hasher.combine("seriesDetail")
            hasher.combine(seriesId)
        case .movieDetail(let movieId):
            hasher.combine("movieDetail")
            hasher.combine(movieId)
        case .audiobookDetail(let audiobookId):
            hasher.combine("audiobookDetail")
            hasher.combine(audiobookId)
        case .voiceAssistant:
            hasher.combine("voiceAssistant")
        }
    }

    static func == (lhs: TVRoute, rhs: TVRoute) -> Bool {
        switch (lhs, rhs) {
        case let (.player(lId, lType, lCh), .player(rId, rType, rCh)):
            return lId == rId && lType == rType && lCh == rCh
        case let (.podcastDetail(lId), .podcastDetail(rId)):
            return lId == rId
        case let (.seriesDetail(lId), .seriesDetail(rId)):
            return lId == rId
        case let (.movieDetail(lId), .movieDetail(rId)):
            return lId == rId
        case let (.audiobookDetail(lId), .audiobookDetail(rId)):
            return lId == rId
        case (.voiceAssistant, .voiceAssistant):
            return true
        default:
            return false
        }
    }
}
