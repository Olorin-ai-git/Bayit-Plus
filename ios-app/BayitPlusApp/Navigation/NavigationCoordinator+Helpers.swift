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
