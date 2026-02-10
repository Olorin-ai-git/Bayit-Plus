import BayitAuth
import BayitDesignSystem
import BayitMedia
import BayitNetworking
import SwiftUI

/// Root content view for the tvOS app.
/// Shows splash on first launch, then auth flow or main tab view.
struct TVContentView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        ZStack {
            DesignTokens.Colors.Background.primary
                .ignoresSafeArea()

            if coordinator.showingSplash {
                TVSplashView(
                    onFinished: {
                        withAnimation(.easeInOut(duration: 0.5)) {
                            coordinator.showingSplash = false
                        }
                    }
                )
                .transition(.opacity)
            } else if coordinator.showingAuth {
                TVSignInView(
                    onAuthSuccess: {
                        withAnimation {
                            coordinator.showingAuth = false
                        }
                    },
                    logger: TVAppAPILogger()
                )
                .transition(.opacity)
            } else {
                TVMainTabView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut, value: coordinator.showingSplash)
        .animation(.easeInOut, value: coordinator.showingAuth)
        .fullScreenCover(item: fullscreenBinding) { route in
            fullscreenView(for: route)
        }
        .onOpenURL { url in
            coordinator.handleDeepLink(url)
        }
    }

    // MARK: - Fullscreen Player

    private var fullscreenBinding: Binding<TVRoute?> {
        Binding(
            get: { coordinator.fullscreenRoute },
            set: { coordinator.fullscreenRoute = $0 }
        )
    }

    @ViewBuilder
    private func fullscreenView(for route: TVRoute) -> some View {
        switch route {
        case .player(let contentId, let contentType, let channelId):
            TVPlayerView(
                contentId: contentId,
                contentType: contentType,
                channelId: channelId
            )
        case .podcastDetail, .seriesDetail, .movieDetail:
            EmptyView()
        }
    }
}
