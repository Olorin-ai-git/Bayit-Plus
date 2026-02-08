import SwiftUI

/// A single breadcrumb entry for the navigation trail
struct BreadcrumbEntry: Identifiable {
    let id = UUID()
    let label: String
    let icon: String?
    let popCount: Int  // How many levels to pop (0 = root)
}

/// Manages navigation state across the app
@Observable
public final class NavigationCoordinator {
    /// Navigation path per tab
    var paths: [AppTab: NavigationPath] = [:]

    /// Currently selected tab
    var selectedTab: AppTab = .home

    /// Whether a fullscreen modal is presented (player, search)
    var fullscreenRoute: Route?

    /// Whether the auth flow is being shown
    var showingAuth: Bool = false

    /// Breadcrumb trail per tab (parallel to NavigationPath which is opaque)
    var breadcrumbTrails: [AppTab: [String]] = [:]

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
        for (index, label) in trail.enumerated() {
            let popsNeeded = trail.count - index - 1
            entries.append(BreadcrumbEntry(
                label: label,
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
            selectedTab = .radio
            paths[.radio] = NavigationPath()
            breadcrumbTrails[.radio] = []
        case .podcasts:
            selectedTab = .podcasts
            paths[.podcasts] = NavigationPath()
            breadcrumbTrails[.podcasts] = []

        case .player, .search:
            fullscreenRoute = route

        case .movieDetail, .seriesDetail, .podcastDetail, .epg:
            pushToCurrentTab(route)

        case .profile, .favorites, .playlist, .downloads,
             .recordings, .settings, .languageSettings,
             .notificationSettings, .billing, .subscription,
             .security, .children, .youngsters, .judaism,
             .flows, .morningRitual, .voiceOnboarding, .support,
             .trivia, .llmSearch, .familyControls, .shabbatMode,
             .jerusalemContent, .telAvivContent, .audiobooks,
             .audiobookDetail, .trending, .interactiveSubtitles,
             .chapters, .chatbot, .avatarMode, .betaCredits,
             .subscriptionGate, .household, .devicePairing,
             .helpCenter, .rewards, .passkeyManagement, .onboardingAI,
             .friends, .watchParty, .watchPartyDetail,
             .chess, .directMessages, .conversation:
            pushToCurrentTab(route)
        }
    }

    /// Push a route onto the current tab's navigation stack
    func pushToCurrentTab(_ route: Route) {
        paths[selectedTab, default: NavigationPath()].append(route)
        breadcrumbTrails[selectedTab, default: []].append(route.breadcrumbLabel)
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
        for _ in 0..<count {
            pop()
        }
    }

    /// Pop to root of current tab
    func popToRoot() {
        paths[selectedTab] = NavigationPath()
        breadcrumbTrails[selectedTab] = []
    }

    /// Present a route as a fullscreen modal (player, search)
    func presentFullscreen(_ route: Route) {
        fullscreenRoute = route
    }

    /// Dismiss fullscreen modal
    func dismissFullscreen() {
        fullscreenRoute = nil
    }

    /// Handle a deep link URL
    func handleDeepLink(_ url: URL) {
        guard let route = DeepLink.route(from: url) else { return }
        navigate(to: route)
    }
}
