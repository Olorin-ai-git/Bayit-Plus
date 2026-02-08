import BayitAuth
import BayitMedia
import SwiftUI

/// Root content view - shows auth flow or main tab view
struct ContentView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(AuthManager.self) private var authManager
    @Environment(RepositoryProvider.self) private var repositories
    @Environment(MediaPlayer.self) private var mediaPlayer

    @State private var suggestionEngine = ProactiveSuggestionEngine()
    @State private var proactiveVM: ProactiveVoiceViewModel?

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

            // Shabbat banner overlay (top)
            if ShabbatModeService.shared.isShabbatActive
                || ShabbatModeService.shared.isErevShabbat {
                VStack {
                    ShabbatBannerView()
                        .withAutoLoad()
                    Spacer()
                }
                .transition(.move(edge: .top))
            }

            // Proactive suggestion banner overlay (bottom, above tab bar)
            if let vm = proactiveVM, vm.isVisible {
                VStack {
                    Spacer()
                    ProactiveSuggestionBannerView(viewModel: vm)
                        .padding(.bottom, 80) // Above tab bar
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.3), value: coordinator.showingAuth)
        .animation(.spring(duration: 0.4, bounce: 0.1), value: coordinator.fullscreenRoute != nil)
        .animation(.spring(duration: 0.4), value: ShabbatModeService.shared.isShabbatActive)
        .animation(.spring(duration: 0.4), value: proactiveVM?.isVisible)
        .task {
            ShabbatModeService.shared.startPolling(
                repository: repositories.shabbat
            )
        }
        .task {
            if proactiveVM == nil {
                proactiveVM = ProactiveVoiceViewModel(engine: suggestionEngine)
            }
            await MainActor.run {
                proactiveVM?.start()
            }
        }
        .onChange(of: suggestionEngine.currentSuggestion?.id) { _, _ in
            proactiveVM?.observeEngine()
            handleSuggestionNavigation()
        }
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

    private func handleSuggestionNavigation() {
        guard let vm = proactiveVM,
              let suggestion = vm.suggestion,
              let action = suggestion.action else { return }

        // Navigation is handled when the user taps "execute" in the banner.
        // The ProactiveVoiceViewModel.execute() is called by the banner view.
        // We observe route changes here for programmatic navigation.
        if let route = vm.actionRoute {
            switch route {
            case "morningRitual":
                coordinator.navigate(to: .morningRitual)
            case "shabbat", "shabbatMode":
                coordinator.navigate(to: .shabbatMode)
            case "radio":
                coordinator.navigate(to: .radio)
            case "trending":
                coordinator.navigate(to: .trending)
            case "llm-search":
                coordinator.navigate(to: .llmSearch)
            default:
                coordinator.navigate(to: .home)
            }
        }
    }
}
