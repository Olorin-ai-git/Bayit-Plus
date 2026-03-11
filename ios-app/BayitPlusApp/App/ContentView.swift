import BayitAuth
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import BayitNetworking
import SwiftUI

/// Root content view - shows splash, then auth flow or main tab view
struct ContentView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(AuthManager.self) private var authManager
    @Environment(RepositoryProvider.self) private var repositories
    @Environment(MediaPlayer.self) private var mediaPlayer
    @Environment(WidgetDataSyncService.self) private var widgetSync
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.appConfiguration) private var appConfiguration

    @State private var showingSplash = true
    @State private var showingOnboarding = false

    var body: some View {
        @Bindable var coord = coordinator

        ZStack {
            DesignTokens.Background.primary
                .ignoresSafeArea()

            if showingSplash {
                SplashView {
                    withAnimation(.easeInOut(duration: 0.5)) {
                        showingSplash = false
                        if authManager.isAuthenticated {
                            showingOnboarding = !OnboardingFlowViewModel.hasCompletedOnboarding
                        }
                    }
                }
                .transition(.opacity)
            } else if coordinator.showingAuth {
                AuthFlowView()
                    .transition(.opacity)
            } else if showingOnboarding {
                OnboardingFlowView {
                    withAnimation {
                        showingOnboarding = false
                    }
                }
                .transition(.opacity)
            } else {
                if UIDevice.current.userInterfaceIdiom == .pad {
                    IPadContentView()
                        .transition(.opacity)
                } else {
                    MainTabView()
                        .transition(.opacity)
                }
            }

            if let fullscreenRoute = coordinator.fullscreenRoute {
                fullscreenView(for: fullscreenRoute)
                    .transition(.move(edge: .bottom))
            }

            if let tvLoginRoute = coordinator.pendingTVLogin {
                tvLoginView(for: tvLoginRoute)
                    .transition(.move(edge: .bottom))
            }

            // Mini video player bar (bottom)
            VStack {
                Spacer()
                MiniVideoPlayerBar()
            }

            // Shabbat banner overlay (top)
            if ShabbatModeService.shared.isShabbatActive
                || ShabbatModeService.shared.isErevShabbat
            {
                VStack {
                    ShabbatBannerView()
                    Spacer()
                }
                .transition(.move(edge: .top))
            }
        }
        .onChange(of: authManager.isAuthenticated) { _, isAuth in
            coordinator.showingAuth = !isAuth
            if isAuth {
                showingOnboarding = !OnboardingFlowViewModel.hasCompletedOnboarding
            }
        }
        .animation(.easeInOut(duration: 0.3), value: showingSplash)
        .animation(.easeInOut(duration: 0.3), value: coordinator.showingAuth)
        .animation(.easeInOut(duration: 0.3), value: showingOnboarding)
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
        case let .player(contentId, contentType, resume):
            PlayerView(
                contentId: contentId,
                contentType: contentType,
                resume: resume,
                player: mediaPlayer,
                repository: repositories.media,
                contentRepository: repositories.content,
                liveTVRepository: repositories.liveTV,
                radioRepository: repositories.radio,
                podcastRepository: repositories.podcasts,
                audiobookRepository: repositories.audiobook,
                widgetSync: widgetSync,
                downloadManager: downloadManager,
                progressIntervalSeconds: appConfiguration.progressTrackingIntervalSeconds
            )
        case .search:
            SearchView()
        default:
            EmptyView()
        }
    }

    private func tvLoginView(for route: Route) -> some View {
        NavigationStack {
            if case let .tvLogin(sessionId, token, expires) = route {
                TVLoginView(sessionId: sessionId, token: token, expires: expires)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            GlassButton(
                                localization.t("common.close"),
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
