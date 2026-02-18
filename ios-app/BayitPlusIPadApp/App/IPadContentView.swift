import BayitAuth
import BayitDesignSystem
import BayitNetworking
import SwiftUI

/// Root content view for iPad - shows splash, then auth flow or main split view
struct IPadContentView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(AuthManager.self) private var authManager
    @Environment(RepositoryProvider.self) private var repositories

    @State private var showingSplash = true

    var body: some View {
        @Bindable var coord = coordinator

        ZStack {
            DesignTokens.Background.primary
                .ignoresSafeArea()

            if showingSplash {
                SplashView {
                    withAnimation(.easeInOut(duration: 0.5)) {
                        showingSplash = false
                    }
                }
                .transition(.opacity)
            } else if coordinator.showingAuth {
                AuthFlowView()
                    .transition(.opacity)
            } else {
                IPadMainView()
                    .transition(.opacity)
            }

            if let fullscreenRoute = coordinator.fullscreenRoute {
                fullscreenView(for: fullscreenRoute)
                    .transition(.move(edge: .bottom))
            }

            if let tvLoginRoute = coordinator.pendingTVLogin {
                tvLoginView(for: tvLoginRoute)
                    .transition(.move(edge: .bottom))
            }

            if ShabbatModeService.shared.isShabbatActive
                || ShabbatModeService.shared.isErevShabbat {
                VStack {
                    ShabbatBannerView()
                    Spacer()
                }
                .transition(.move(edge: .top))
            }
        }
        .onChange(of: authManager.isAuthenticated) { _, isAuth in
            coordinator.showingAuth = !isAuth
        }
        .animation(.easeInOut(duration: 0.3), value: showingSplash)
        .animation(.easeInOut(duration: 0.3), value: coordinator.showingAuth)
        .animation(.spring(duration: 0.4, bounce: 0.1), value: coordinator.fullscreenRoute != nil)
        .animation(.spring(duration: 0.4, bounce: 0.1), value: coordinator.pendingTVLogin != nil)
        .animation(.spring(duration: 0.4), value: ShabbatModeService.shared.isShabbatActive)
        .onReceive(
            NotificationCenter.default.publisher(for: APIClient.unauthorizedNotification)
        ) { _ in
            Task { await authManager.signOut() }
        }
        .task {
            ShabbatModeService.shared.startPolling(
                repository: repositories.shabbat
            )
        }
    }

    @ViewBuilder
    private func fullscreenView(for route: Route) -> some View {
        switch route {
        case .player(let contentId, let contentType, let resume):
            IPadPlayerView(
                contentId: contentId,
                contentType: contentType,
                resume: resume
            )
        case .search:
            IPadSearchView()
        default:
            EmptyView()
        }
    }

    @ViewBuilder
    private func tvLoginView(for route: Route) -> some View {
        NavigationStack {
            if case .tvLogin(let sessionId, let token, let expires) = route {
                TVLoginView(sessionId: sessionId, token: token, expires: expires)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            GlassButton(
                                "Close",
                                variant: .secondary,
                                size: .medium,
                                icon: Image(systemName: "xmark")
                            ) {
                                coordinator.dismissTVLogin()
                            }
                        }
                    }
            }
        }
    }
}
