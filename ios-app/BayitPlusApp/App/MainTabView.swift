import BayitDesignSystem
import BayitVoice
import SwiftUI

/// Main tab view with glass tab bar at the bottom
struct MainTabView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(RepositoryProvider.self) private var repos
    @Environment(FeatureFlags.self) private var featureFlags
    @Environment(AudioPlaybackManager.self) private var audioPlaybackManager
    @Environment(UserUIPreferencesStore.self) private var uiPreferences
    @Environment(\.appConfiguration) private var appConfiguration
    @State private var isVoiceModalPresented = false
    @State private var dockViewModel: WidgetDockViewModel?

    private let resolver = RouteDestinationResolver()

    var body: some View {
        ZStack(alignment: .bottom) {
            ZStack {
                ForEach(AppTab.visibleTabs(ownerMode: appConfiguration.ownerMode)) { tab in
                    tabContent(for: tab)
                        .opacity(coordinator.selectedTab == tab ? 1 : 0)
                        .allowsHitTesting(coordinator.selectedTab == tab)
                }
            }

            VStack(spacing: DesignTokens.Spacing.xs) {
                MiniAudioPlayerBar()
                GlassTabBar()
            }

            // Floating restored widgets (PiP windows) - shown on all tabs
            if let vm = dockViewModel {
                ForEach(vm.restoredWidgets) { widget in
                    PiPWidgetContainerView(
                        widget: widget,
                        onMinimize: {
                            withAnimation(.spring(duration: 0.3, bounce: 0.15)) {
                                vm.minimizeWidget(widgetId: widget.id)
                            }
                        },
                        onClose: {
                            withAnimation(.spring(duration: 0.3, bounce: 0.15)) {
                                vm.minimizeWidget(widgetId: widget.id)
                            }
                        }
                    )
                }
            }

            // Floating widget dock (left edge, vertically centered) - shown on all tabs
            if let vm = dockViewModel, uiPreferences.showWidgetsDock {
                PiPWidgetManagerView(
                    widgets: vm.minimizedWidgets,
                    isDockVisible: vm.isDockVisible,
                    onToggleMinimize: { widgetId in
                        withAnimation(.spring(duration: 0.3, bounce: 0.15)) {
                            vm.toggleMinimize(widgetId: widgetId)
                        }
                    },
                    onCloseDock: { vm.hideDock() }
                )
                .allowsHitTesting(true)
            }

            // Voice Avatar FAB (legacy feature - gated by feature flag and user preference)
            if featureFlags.isLegacyFeaturesEnabled && uiPreferences.showVoiceControlFAB {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        VoiceAvatarFAB {
                            isVoiceModalPresented = true
                        }
                        .padding(.trailing, DesignTokens.Spacing.lg)
                        .padding(.bottom, 100) // Above 6-tab bar
                    }
                }
            }
        }
        .ignoresSafeArea(edges: .bottom)
        .task {
            if dockViewModel == nil {
                dockViewModel = WidgetDockViewModel(repository: repos.widget)
            }
            if let response = try? await repos.settings.fetchPreferences() {
                uiPreferences.apply(response.preferences)
            }
            await dockViewModel?.loadWidgets()
        }
        .sheet(isPresented: $isVoiceModalPresented) {
            VoiceAssistantSheet(
                chatRepository: repos.chat,
                onDismiss: { isVoiceModalPresented = false }
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
            .presentationBackground(.ultraThinMaterial)
        }
    }

    private func tabContent(for tab: AppTab) -> some View {
        NavigationStack(path: binding(for: tab)) {
            VStack(spacing: 0) {
                TopNavigationBar()
                tabRootView(for: tab)
            }
            .navigationDestination(for: Route.self) { route in
                VStack(spacing: 0) {
                    TopNavigationBar()
                    BreadcrumbBar()
                    resolver.view(for: route)
                }
                .toolbar(.hidden, for: .navigationBar)
            }
        }
    }

    @ViewBuilder
    private func tabRootView(for tab: AppTab) -> some View {
        switch tab {
        case .home:
            HomeView()
        case .liveTV:
            LiveTVView()
        case .vod:
            VODView()
        case .zehAni:
            ZehAniHubView()
        case .podcasts:
            ListenView()
        case .search:
            SearchView()
        case .downloads:
            DownloadsView()
        }
    }

    private func binding(for tab: AppTab) -> Binding<NavigationPath> {
        Binding(
            get: { coordinator.paths[tab, default: NavigationPath()] },
            set: {
                coordinator.paths[tab] = $0
                coordinator.syncBreadcrumbs(for: tab, pathCount: $0.count)
            }
        )
    }
}
