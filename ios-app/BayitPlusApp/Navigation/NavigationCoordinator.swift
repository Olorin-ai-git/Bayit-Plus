import SwiftUI

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

    init() {
        for tab in AppTab.allCases {
            paths[tab] = NavigationPath()
        }
    }

    /// Navigate to a route
    func navigate(to route: Route) {
        switch route {
        case .home:
            selectedTab = .home
            paths[.home] = NavigationPath()
        case .liveTV:
            selectedTab = .liveTV
            paths[.liveTV] = NavigationPath()
        case .vod:
            selectedTab = .vod
            paths[.vod] = NavigationPath()
        case .radio:
            selectedTab = .radio
            paths[.radio] = NavigationPath()
        case .podcasts:
            selectedTab = .podcasts
            paths[.podcasts] = NavigationPath()

        case .player, .search:
            fullscreenRoute = route

        case .movieDetail, .seriesDetail, .podcastDetail, .epg:
            pushToCurrentTab(route)

        case .profile, .favorites, .playlist, .downloads,
             .recordings, .settings, .languageSettings,
             .notificationSettings, .billing, .subscription,
             .security, .children, .youngsters, .judaism,
             .flows, .morningRitual, .voiceOnboarding, .support:
            pushToCurrentTab(route)
        }
    }

    /// Push a route onto the current tab's navigation stack
    func pushToCurrentTab(_ route: Route) {
        paths[selectedTab, default: NavigationPath()].append(route)
    }

    /// Pop the current tab's navigation stack
    func pop() {
        guard paths[selectedTab, default: NavigationPath()].count > 0 else { return }
        paths[selectedTab, default: NavigationPath()].removeLast()
    }

    /// Pop to root of current tab
    func popToRoot() {
        paths[selectedTab] = NavigationPath()
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
