import BayitCore
import BayitLocalization
import BayitMedia
import Foundation
import Observation
import SwiftUI

/// tvOS tab definitions - 8 primary tabs for 10-foot UI clarity.
/// Secondary features are accessible as sub-sections within hub tabs:
/// - Zeh Ani: Avatar, Rewards, Beta Credits, Watch Party, Trivia, Chess, AI Chat
/// - Podcasts: includes Audiobooks section
/// - Profile: Friends, Messages, Settings, Favorites, Recordings, Widgets
/// - Home: Judaism, Flows, Culture, Household as content rows
/// - BYOC: Bring Your Own Content (IPTV, Xtream, Plex, YouTube)
enum TVTab: String, CaseIterable, Identifiable, Sendable {
    case home
    case liveTV
    case vod
    case zehAni
    case podcasts
    case byoc
    case search
    case discover
    case profile
    case widgets
    case help

    var id: String {
        rawValue
    }

    var title: String {
        switch self {
        case .home: return "Home"
        case .liveTV: return "Live TV"
        case .vod: return "Movies"
        case .zehAni: return "Zeh Ani"
        case .podcasts: return "Podcasts"
        case .byoc: return "BYOC"
        case .search: return "Search"
        case .discover: return "Discover"
        case .profile: return "Profile"
        case .widgets: return "Widgets"
        case .help: return "Help"
        }
    }

    func localizedTitle(_ localization: LocalizationManager) -> String {
        switch self {
        case .home: return localization.t("nav.home")
        case .liveTV: return localization.t("nav.liveTV")
        case .vod: return localization.t("nav.vod")
        case .zehAni: return localization.t("nav.zehAni")
        case .podcasts: return localization.t("nav.listen")
        case .byoc: return localization.t("nav.myContent")
        case .search: return localization.t("nav.search")
        case .discover: return localization.t("nav.discover")
        case .profile: return localization.t("nav.profile")
        case .widgets: return localization.t("nav.widgets")
        case .help: return localization.t("nav.help")
        }
    }

    var iconName: String {
        switch self {
        case .home: return "house"
        case .liveTV: return "play.tv"
        case .vod: return "film"
        case .zehAni: return "person.fill.viewfinder"
        case .podcasts: return "headphones"
        case .byoc: return "play.tv"
        case .search: return "magnifyingglass"
        case .discover: return "sparkles"
        case .profile: return "person.crop.circle"
        case .widgets: return "square.grid.2x2"
        case .help: return "questionmark.circle"
        }
    }
}

/// A single entry in the tvOS breadcrumb trail.
struct TVBreadcrumbEntry: Identifiable {
    let id = UUID()
    let label: String
    let icon: String?
}

/// Manages navigation state for the tvOS app.
@Observable
final class TVNavigationCoordinator {
    var selectedTab: TVTab = .home
    var showingAuth: Bool = false
    var showingSplash: Bool = true
    /// True while an auto-login attempt is in-flight.
    /// Suppresses the sign-in screen so it never flashes during auto-login.
    var isAutoLoginInProgress: Bool
    var paths: [TVTab: NavigationPath] = [:]

    /// Route for the fullscreen player modal. Set to non-nil to present.
    var fullscreenRoute: TVRoute?

    /// Transient state for the category browse grid (shown within the Home tab).
    var categoryBrowseActive: Bool = false
    var categoryBrowseTitle: String = ""
    var categoryBrowseIcon: String = ""
    var categoryBrowseCategoryName: String = ""

    /// Set to `true` from any view (e.g. Profile) to surface the widget dock.
    /// TVMainTabView observes this and resets it after showing the dock.
    /// Whether a household profile has been selected for this session.
    var profileSelected: Bool = false

    /// The selected household member profile ID for the current session.
    var selectedProfileId: String?

    /// The display name of the currently selected profile (for greetings).
    var selectedProfileName: String?

    /// Avatar URL string of the currently selected household profile.
    var selectedProfileAvatar: String?

    /// Whether the onboarding flow should be shown for the current profile.
    var showingOnboarding: Bool = false

    var showWidgetDock: Bool = false

    /// Reflects the current dock visibility state, kept in sync by TVMainTabView.
    /// Read by TVWidgetsView to drive the dock toggle button label/icon.
    var dockIsVisible: Bool = false

    /// Set to `true` from TVWidgetsView to request a dock visibility toggle.
    /// TVMainTabView observes this, toggles the dock, then resets the flag.
    var requestDockToggle: Bool = false

    /// Breadcrumb trail per tab (tracks labels for the navigation stack).
    var breadcrumbTrails: [TVTab: [TVBreadcrumbEntry]] = [:]

    /// Current breadcrumb trail for the active tab.
    var currentBreadcrumbs: [TVBreadcrumbEntry] {
        breadcrumbTrails[selectedTab] ?? []
    }

    /// Whether the current tab has navigation depth (breadcrumbs to show).
    var hasBreadcrumbs: Bool {
        !(breadcrumbTrails[selectedTab] ?? []).isEmpty
    }

    private let logger = BayitLogger(category: "TVNavigation")

    /// Manages persistence of the last-visited tab and route per user.
    let lastVisitedRouteManager: TVLastVisitedRouteManager

    init(
        isAutoLoginInProgress: Bool = false,
        lastVisitedRouteManager: TVLastVisitedRouteManager
    ) {
        self.isAutoLoginInProgress = isAutoLoginInProgress
        self.lastVisitedRouteManager = lastVisitedRouteManager
        for tab in TVTab.allCases {
            paths[tab] = NavigationPath()
            breadcrumbTrails[tab] = []
        }
    }

    /// Record that the user has navigated to `tab` (and optionally a detail `route`).
    /// Call this whenever the selected tab changes or a restorable route is pushed.
    func trackVisit(tab: TVTab, route: TVRoute? = nil, userId: String) {
        lastVisitedRouteManager.save(tab: tab, route: route, userId: userId)
    }

    func popToRoot() {
        paths[selectedTab] = NavigationPath()
        breadcrumbTrails[selectedTab] = []
    }

    /// Push a breadcrumb entry for the current tab.
    func pushBreadcrumb(label: String, icon: String? = nil) {
        breadcrumbTrails[selectedTab, default: []].append(
            TVBreadcrumbEntry(label: label, icon: icon)
        )
    }

    /// Pop the last breadcrumb from the current tab.
    func popBreadcrumb() {
        guard !(breadcrumbTrails[selectedTab] ?? []).isEmpty else { return }
        breadcrumbTrails[selectedTab]?.removeLast()
    }

    /// Present the fullscreen player for the given content.
    func presentPlayer(
        contentId: String,
        contentType: MediaContentType,
        channelId: String? = nil,
        directUrl: String? = nil
    ) {
        logger.info("Presenting player: \(contentId), type: \(contentType.rawValue)")
        fullscreenRoute = .player(
            contentId: contentId,
            contentType: contentType,
            channelId: channelId,
            directUrl: directUrl
        )
    }

    /// Dismiss the current fullscreen modal.
    func dismissFullscreen() {
        fullscreenRoute = nil
    }

    /// Present the category browse grid within the Home tab (preserves tab bar).
    func presentCategoryBrowse(title: String, icon: String, categoryName: String) {
        categoryBrowseTitle = title
        categoryBrowseIcon = icon
        categoryBrowseCategoryName = categoryName
        categoryBrowseActive = true
    }

    /// Dismiss the category browse grid and return to the Home scroll view.
    func dismissCategoryBrowse() {
        categoryBrowseActive = false
    }

    /// Push a route onto the current tab's navigation stack.
    func navigate(to route: TVRoute) {
        paths[selectedTab]?.append(route)
    }

    /// Open web content URL on tvOS.
    /// tvOS has no browser — logs a warning rather than attempting to open.
    func presentWebView(url: URL, title: String) {
        logger.warning("Cannot open URL on tvOS — no browser available: \(url.absoluteString) (\(title))")
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

    /// Handle an NSUserActivity from Siri/Spotlight search.
    func handleUserActivity(_ activity: NSUserActivity) {
        logger.info("Handling user activity: \(activity.activityType)")

        let userInfo = activity.userInfo ?? [:]

        switch activity.activityType {
        case "tv.bayit.plus.playContent":
            guard let contentId = userInfo["contentId"] as? String else {
                return
            }
            let typeString = userInfo["contentType"] as? String
            let contentType = TVContentTypeMapper.map(typeString)
            fullscreenRoute = .player(
                contentId: contentId,
                contentType: contentType,
                channelId: nil
            )

        case "tv.bayit.plus.searchContent":
            selectedTab = .search

        case "tv.bayit.plus.resumeWatching":
            if let contentId = userInfo["contentId"] as? String {
                let typeString = userInfo["contentType"] as? String
                let type = TVContentTypeMapper.map(typeString)
                fullscreenRoute = .player(
                    contentId: contentId,
                    contentType: type,
                    channelId: nil
                )
            }

        default:
            break
        }
    }

    /// Handle pending intent navigation from AppIntents.
    func handlePendingIntent() {
        let pending = TVPendingIntentManager.shared.consumePending()
        if let tab = pending.tab {
            selectedTab = tab
        }
        if let route = pending.route {
            fullscreenRoute = route
        }
    }
}
