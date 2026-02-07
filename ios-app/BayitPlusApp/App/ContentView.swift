import BayitAuth
import SwiftUI

/// Root content view - shows auth flow or main tab view
struct ContentView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        @Bindable var coord = coordinator

        ZStack {
            Color.black
                .ignoresSafeArea()

            if coordinator.showingAuth {
                AuthFlowView()
                    .transition(.opacity)
            } else {
                MainTabView()
                    .transition(.opacity)
            }

            if let fullscreenRoute = coordinator.fullscreenRoute {
                fullscreenView(for: fullscreenRoute)
                    .transition(.move(edge: .bottom))
            }
        }
        .animation(.easeInOut(duration: 0.3), value: coordinator.showingAuth)
        .animation(.spring(duration: 0.4, bounce: 0.1), value: coordinator.fullscreenRoute != nil)
    }

    @ViewBuilder
    private func fullscreenView(for route: Route) -> some View {
        switch route {
        case .player(let contentId, let contentType):
            PlayerPlaceholderView(
                contentId: contentId,
                contentType: contentType
            )
        case .search:
            SearchView()
        default:
            EmptyView()
        }
    }
}

// MARK: - Placeholder views (replaced in Phase 3)

struct PlayerPlaceholderView: View {
    let contentId: String
    let contentType: ContentType

    @Environment(NavigationCoordinator.self) private var coordinator

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 16) {
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(.white.opacity(0.6))

                Text("Player")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(.white)

                Text("Content: \(contentId)")
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.5))

                Button("Dismiss") {
                    coordinator.dismissFullscreen()
                }
                .foregroundStyle(.purple)
            }
        }
    }
}
