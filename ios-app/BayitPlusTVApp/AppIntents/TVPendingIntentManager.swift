#if os(tvOS)
    import BayitMedia
    import Foundation
    import Observation

    /// Bridges tvOS App Intents to the navigation system.
    /// Intents set a pending action; TVContentView observes and navigates.
    @Observable
    final class TVPendingIntentManager: @unchecked Sendable {
        static let shared = TVPendingIntentManager()

        /// Pending navigation action requested by a Siri intent.
        var pendingTab: TVTab?
        var pendingRoute: TVRoute?

        /// Last played content for resume functionality.
        var lastPlayedContentId: String?
        var lastPlayedContentType: MediaContentType?

        private init() {}

        // MARK: - Intent Actions

        func requestPlay(contentId: String, contentType: String) {
            let type = TVContentTypeMapper.map(contentType)
            pendingRoute = .player(
                contentId: contentId,
                contentType: type,
                channelId: nil
            )
        }

        func requestSearch(query _: String?) {
            pendingTab = .search
        }

        func requestResume() {
            guard let id = lastPlayedContentId,
                  let type = lastPlayedContentType else { return }
            pendingRoute = .player(
                contentId: id,
                contentType: type,
                channelId: nil
            )
        }

        func requestLiveTV() {
            pendingTab = .liveTV
        }

        func requestRadio() {
            pendingTab = .home
        }

        func requestPodcasts() {
            pendingTab = .podcasts
        }

        /// Consume pending navigation (called after navigation is performed).
        func consumePending() -> (tab: TVTab?, route: TVRoute?) {
            let tab = pendingTab
            let route = pendingRoute
            pendingTab = nil
            pendingRoute = nil
            return (tab, route)
        }

        /// Record last played content for resume functionality.
        func recordPlayback(
            contentId: String,
            contentType: MediaContentType
        ) {
            lastPlayedContentId = contentId
            lastPlayedContentType = contentType
        }
    }
#endif
