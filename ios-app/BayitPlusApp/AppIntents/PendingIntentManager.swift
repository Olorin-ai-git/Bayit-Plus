import Foundation

/// Bridges App Intents to the main app navigation.
/// App Intents set a pending route; the app's scene picks it up
/// via onChange observation and navigates accordingly.
@Observable
final class PendingIntentManager: @unchecked Sendable {
    static let shared = PendingIntentManager()

    /// Route requested by a Siri intent that has not yet been handled.
    var pendingRoute: Route?

    /// Content ID for the last content played (used by Resume intent).
    var lastPlayedContentId: String?

    /// Content type for the last content played.
    var lastPlayedContentType: ContentType?

    private init() {}

    // MARK: - Intent Actions

    func requestPlay(contentId: String, contentType: ContentType) {
        pendingRoute = .player(contentId: contentId, contentType: contentType)
    }

    func requestSearch(query: String?) {
        pendingRoute = .search
    }

    func requestResume() {
        guard let id = lastPlayedContentId,
              let type = lastPlayedContentType else { return }
        pendingRoute = .player(contentId: id, contentType: type)
    }

    func requestLiveTV() {
        pendingRoute = .liveTV
    }

    func requestRadio() {
        pendingRoute = .radio
    }

    func requestPodcasts() {
        pendingRoute = .podcasts
    }

    /// Consume the pending route (called after navigation is performed).
    func consumePendingRoute() -> Route? {
        let route = pendingRoute
        pendingRoute = nil
        return route
    }

    /// Record the last played content for resume functionality.
    func recordPlayback(contentId: String, contentType: ContentType) {
        lastPlayedContentId = contentId
        lastPlayedContentType = contentType
    }
}
