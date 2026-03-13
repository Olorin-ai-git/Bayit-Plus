import Foundation

// MARK: - Minimized Player & Deep Link

extension NavigationCoordinator {
    /// Minimize fullscreen player to PiP bar (keeps playback alive)
    func minimizeFullscreen(title: String?, thumbnail: String?) {
        minimizedRoute = fullscreenRoute
        minimizedTitle = title
        minimizedThumbnail = thumbnail
        fullscreenRoute = nil
    }

    /// Restore minimized player to fullscreen
    func restoreMinimizedPlayer() {
        fullscreenRoute = minimizedRoute
        minimizedRoute = nil
        minimizedTitle = nil
        minimizedThumbnail = nil
    }

    /// Close minimized player completely
    func closeMinimizedPlayer() {
        minimizedRoute = nil
        minimizedTitle = nil
        minimizedThumbnail = nil
    }

    /// Dismiss fullscreen modal
    func dismissFullscreen() {
        fullscreenRoute = nil
    }

    /// Dismiss pending TV login
    func dismissTVLogin() {
        pendingTVLogin = nil
    }

    /// Handle a deep link URL
    func handleDeepLink(_ url: URL) {
        guard let route = DeepLink.route(from: url) else { return }
        navigate(to: route)
    }
}

// MARK: - Last Visited Route

extension NavigationCoordinator {
    /// Saves the current tab and the top-of-stack restorable route for a user.
    ///
    /// Call this whenever `selectedTab` changes or a meaningful route is pushed.
    func saveLastVisited(userId: String) {
        let topRoute = breadcrumbTrails[selectedTab]?.last
        lastVisitedManager.save(tab: selectedTab, route: topRoute, userId: userId)
    }

    /// Restores the previously saved tab and route for a user.
    ///
    /// Navigates to the stored tab first, then pushes the stored route on top.
    /// Safe to call even when no data is stored (no-op in that case).
    func restoreLastVisited(userId: String) {
        guard let saved = lastVisitedManager.restore(userId: userId) else { return }
        selectedTab = saved.tab
        if let route = saved.route {
            pushToCurrentTab(route)
        }
    }

    /// Clears the stored last-visited entry for a user (call on sign-out).
    func clearLastVisited(userId: String) {
        lastVisitedManager.clear(userId: userId)
    }
}
