import BayitCore
import BayitMedia
import Foundation
import Observation
import SwiftUI

/// tvOS tab definitions - 8 primary tabs for 10-foot UI clarity.
/// Secondary features are accessible as sub-sections within hub tabs:
/// - Zeh Ani: Avatar, Rewards, Beta Credits, Watch Party, Trivia, Chess, AI Chat
/// - Podcasts: includes Audiobooks section
/// - Kids: Children + Youngsters
/// - Profile: Friends, Messages, Settings, Favorites, Recordings, Widgets
/// - Home: Judaism, Flows, Culture, Household as content rows
enum TVTab: String, CaseIterable, Identifiable, Sendable {
    case home
    case liveTV
    case vod
    case zehAni
    case podcasts
    case kids
    case search
    case profile

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: return "Home"
        case .liveTV: return "Live"
        case .vod: return "VOD"
        case .zehAni: return "Zeh Ani"
        case .podcasts: return "Listen"
        case .kids: return "Kids"
        case .search: return "Search"
        case .profile: return "Profile"
        }
    }

    var iconName: String {
        switch self {
        case .home: return "house"
        case .liveTV: return "play.tv"
        case .vod: return "film"
        case .zehAni: return "person.fill.viewfinder"
        case .podcasts: return "headphones"
        case .kids: return "figure.and.child.holdinghands"
        case .search: return "magnifyingglass"
        case .profile: return "person.crop.circle"
        }
    }
}

/// Manages navigation state for the tvOS app.
@Observable
final class TVNavigationCoordinator {
    var selectedTab: TVTab = .home
    var showingAuth: Bool = false
    var showingSplash: Bool = true
    var paths: [TVTab: NavigationPath] = [:]

    /// Route for the fullscreen player modal. Set to non-nil to present.
    var fullscreenRoute: TVRoute?

    private let logger = BayitLogger(category: "TVNavigation")

    init() {
        for tab in TVTab.allCases {
            paths[tab] = NavigationPath()
        }
    }

    func popToRoot() {
        paths[selectedTab] = NavigationPath()
    }

    /// Present the fullscreen player for the given content.
    func presentPlayer(
        contentId: String,
        contentType: MediaContentType,
        channelId: String? = nil
    ) {
        logger.info("Presenting player: \(contentId), type: \(contentType.rawValue)")
        fullscreenRoute = .player(
            contentId: contentId,
            contentType: contentType,
            channelId: channelId
        )
    }

    /// Dismiss the current fullscreen modal.
    func dismissFullscreen() {
        fullscreenRoute = nil
    }

    /// Handle a `bayitplus://` deep link URL.
    func handleDeepLink(_ url: URL) {
        logger.info("Handling deep link: \(url.absoluteString)")

        // Check for tab-level navigation first
        if let tab = TVDeepLinkRouter.targetTab(from: url) {
            selectedTab = tab
        }

        // Check for content-level navigation (player, detail)
        if let route = TVDeepLinkRouter.route(from: url) {
            fullscreenRoute = route
        }
    }
}
