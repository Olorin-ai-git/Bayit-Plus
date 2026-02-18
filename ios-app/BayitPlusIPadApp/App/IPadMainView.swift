import BayitDesignSystem
import BayitVoice
import SwiftUI

/// Main iPad layout using NavigationSplitView with sidebar navigation
struct IPadMainView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(RepositoryProvider.self) private var repos
    @Environment(FeatureFlags.self) private var featureFlags
    @Environment(AudioPlaybackManager.self) private var audioPlaybackManager
    @State private var isVoiceModalPresented = false
    @State private var dockViewModel: WidgetDockViewModel?
    @State private var columnVisibility: NavigationSplitViewVisibility = .all

    private let resolver = RouteDestinationResolver()

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            IPadSidebarView()
                .navigationSplitViewColumnWidth(min: 220, ideal: 260, max: 300)
        } detail: {
            ZStack(alignment: .bottom) {
                detailContent(for: coordinator.selectedTab)

                VStack(spacing: DesignTokens.Spacing.xs) {
                    MiniAudioPlayerBar()
                }

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

                if let vm = dockViewModel {
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

                if featureFlags.isLegacyFeaturesEnabled {
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            VoiceAvatarFAB {
                                isVoiceModalPresented = true
                            }
                            .padding(.trailing, DesignTokens.Spacing.lg)
                            .padding(.bottom, 80)
                        }
                    }
                }
            }
        }
        .navigationSplitViewStyle(.balanced)
        .task {
            if dockViewModel == nil {
                dockViewModel = WidgetDockViewModel(repository: repos.widget)
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

    @ViewBuilder
    private func detailContent(for tab: AppTab) -> some View {
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
            }
        }
    }

    @ViewBuilder
    private func tabRootView(for tab: AppTab) -> some View {
        switch tab {
        case .home:
            IPadHomeView()
        case .liveTV:
            IPadLiveTVView()
        case .vod:
            IPadVODView()
        case .zehAni:
            IPadZehAniHubView()
        case .podcasts:
            IPadPodcastsView()
        case .search:
            IPadSearchView()
        }
    }

    private func binding(for tab: AppTab) -> Binding<NavigationPath> {
        Binding(
            get: { coordinator.paths[tab, default: NavigationPath()] },
            set: { coordinator.paths[tab] = $0 }
        )
    }
}
