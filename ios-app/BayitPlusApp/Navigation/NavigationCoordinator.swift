import BayitCore
import SwiftUI

/// A single breadcrumb entry for the navigation trail
struct BreadcrumbEntry: Identifiable {
    let id = UUID()
    let label: String
    let icon: String?
    let popCount: Int // How many levels to pop (0 = root)
}

/// Manages navigation state across the app
@Observable
public final class NavigationCoordinator {
    /// Maximum number of breadcrumb entries retained per tab to prevent unbounded growth.
    private static let maxBreadcrumbsPerTab = 20
    /// Navigation path per tab
    var paths: [AppTab: NavigationPath] = [:]

    /// Currently selected tab
    var selectedTab: AppTab = .home

    /// Whether a fullscreen modal is presented (player)
    var fullscreenRoute: Route?

    /// Minimized video player state (PiP bar)
    var minimizedRoute: Route?
    var minimizedTitle: String?
    var minimizedThumbnail: String?

    /// Whether the auth flow is being shown
    var showingAuth: Bool = false

    /// Pending TV login route (shown even when not authenticated)
    var pendingTVLogin: Route?

    /// Breadcrumb trail per tab (parallel to NavigationPath which is opaque)
    var breadcrumbTrails: [AppTab: [Route]] = [:]

    /// Current breadcrumb entries for the active tab
    var currentBreadcrumbs: [BreadcrumbEntry] {
        let trail = breadcrumbTrails[selectedTab] ?? []
        var entries: [BreadcrumbEntry] = []

        // Tab root is always the first breadcrumb
        entries.append(BreadcrumbEntry(
            label: selectedTab.title,
            icon: selectedTab.selectedIconName,
            popCount: trail.count
        ))

        // Add each route in the trail
        for (index, route) in trail.enumerated() {
            let popsNeeded = trail.count - index - 1
            entries.append(BreadcrumbEntry(
                label: route.breadcrumbLabel,
                icon: nil,
                popCount: popsNeeded
            ))
        }

        return entries
    }

    init() {
        for tab in AppTab.allCases {
            paths[tab] = NavigationPath()
            breadcrumbTrails[tab] = []
        }
    }

    /// Navigate to a route
    func navigate(to route: Route) {
        switch route {
        case .home:
            selectedTab = .home
            paths[.home] = NavigationPath()
            breadcrumbTrails[.home] = []

        case .liveTV:
            selectedTab = .liveTV
            paths[.liveTV] = NavigationPath()
            breadcrumbTrails[.liveTV] = []

        case .vod:
            selectedTab = .vod
            paths[.vod] = NavigationPath()
            breadcrumbTrails[.vod] = []

        case .radio:
            // Radio is no longer a tab -- push as content on current tab
            pushToCurrentTab(route)

        case .zehAni:
            selectedTab = .zehAni
            paths[.zehAni] = NavigationPath()
            breadcrumbTrails[.zehAni] = []

        case .podcasts:
            selectedTab = .podcasts
            paths[.podcasts] = NavigationPath()
            breadcrumbTrails[.podcasts] = []

        case .search:
            selectedTab = .search
            paths[.search] = NavigationPath()
            breadcrumbTrails[.search] = []

        case .player:
            fullscreenRoute = route

        case .movieDetail, .seriesDetail, .collectionDetail, .podcastDetail, .epg:
            pushToCurrentTab(route)

        case .tvLogin:
            // Special handling: TV login should show even when not authenticated
            BayitLogger(category: "Navigation").info("Setting pendingTVLogin route")
            pendingTVLogin = route

        case .profile, .favorites, .playlist, .downloads,
             .recordings, .settings, .languageSettings,
             .notificationSettings, .billing, .subscription,
             .security, .connectedAccounts,
             .playbackSettings, .audioSettings,
             .accessibilitySettings, .privacySettings,
             .children, .youngsters, .judaism,
             .flows, .morningRitual, .voiceOnboarding, .support,
             .trivia, .llmSearch, .familyControls, .shabbatMode,
             .jerusalemContent, .telAvivContent, .audiobooks,
             .audiobookCollections, .audiobookAuthorDetail,
             .audiobookDetail, .trending, .interactiveSubtitles,
             .chapters, .chatbot, .avatarMode, .betaCredits,
             .subscriptionGate, .household, .devicePairing,
             .helpCenter, .rewards, .widgets, .onboardingAI,
             .friends, .watchParty, .watchPartyDetail,
             .chess, .directMessages, .conversation,
             .mfaSetup, .phoneVerification,
             .zehAniMagicMirror, .zehAniV2V,
             .zehAniAvatar3D, .zehAniHighlights,
             .zehAniContacts, .zehAniFeedback,
             .zehAniAvatarSettings,
             .zehAniMovieInteractions, .zehAniMovieCharacters,
             .zehAniCharacterDialogue:
            pushToCurrentTab(route)
        }
    }

    /// Push a route onto the current tab's navigation stack
    func pushToCurrentTab(_ route: Route) {
        // Do not push if already at this route (prevents duplicate breadcrumbs on refresh)
        if let current = breadcrumbTrails[selectedTab, default: []].last, current == route {
            return
        }
        paths[selectedTab, default: NavigationPath()].append(route)
        breadcrumbTrails[selectedTab, default: []].append(route)

        // Cap breadcrumb trail to prevent unbounded memory growth
        if let trail = breadcrumbTrails[selectedTab],
           trail.count > Self.maxBreadcrumbsPerTab
        {
            let overflow = trail.count - Self.maxBreadcrumbsPerTab
            breadcrumbTrails[selectedTab]?.removeFirst(overflow)
        }
    }

    /// Pop the current tab's navigation stack
    func pop() {
        guard paths[selectedTab, default: NavigationPath()].count > 0 else { return }
        paths[selectedTab, default: NavigationPath()].removeLast()
        if !(breadcrumbTrails[selectedTab] ?? []).isEmpty {
            breadcrumbTrails[selectedTab]?.removeLast()
        }
    }

    /// Pop multiple levels from the current tab
    func pop(count: Int) {
        for _ in 0 ..< count {
            pop()
        }
    }

    /// Pop to root of current tab
    func popToRoot() {
        paths[selectedTab] = NavigationPath()
        breadcrumbTrails[selectedTab] = []
    }

    /// Sync breadcrumbs when SwiftUI's back button shrinks the navigation path
    func syncBreadcrumbs(for tab: AppTab, pathCount: Int) {
        let trailCount = breadcrumbTrails[tab, default: []].count
        if trailCount > pathCount {
            breadcrumbTrails[tab]?.removeLast(trailCount - pathCount)
        }
    }

    /// Present a route as a fullscreen modal (player)
    func presentFullscreen(_ route: Route) {
        fullscreenRoute = route
    }
}
