import BayitAuth
import BayitMedia
import SwiftUI

/// Root content view - shows auth flow or main tab view
struct ContentView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(AuthManager.self) private var authManager
    @Environment(RepositoryProvider.self) private var repositories
    @Environment(MediaPlayer.self) private var mediaPlayer

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
            PlayerView(
                contentId: contentId,
                contentType: contentType,
                player: mediaPlayer,
                repository: repositories.media,
                contentRepository: repositories.content
            )
        case .search:
            SearchView()
        default:
            EmptyView()
        }
    }
}
