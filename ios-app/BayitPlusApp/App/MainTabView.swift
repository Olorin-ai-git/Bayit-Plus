import BayitVoice
import SwiftUI

/// Main tab view with glass tab bar at the bottom
struct MainTabView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(RepositoryProvider.self) private var repos
    @State private var isVoiceModalPresented = false
    @State private var dockViewModel: WidgetDockViewModel?

    private let resolver = RouteDestinationResolver()

    var body: some View {
        ZStack(alignment: .bottom) {
            tabContent(for: coordinator.selectedTab)

            GlassTabBar()

            // Floating restored widgets (PiP windows) - shown on all tabs except widgets
            if let vm = dockViewModel, coordinator.selectedTab != .widgets {
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

            // Floating widget dock (left edge, vertically centered) - hidden on widgets tab
            if let vm = dockViewModel, coordinator.selectedTab != .widgets {
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

            // Floating wizard hat FAB (bottom-right corner)
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    VoiceAvatarFAB {
                        isVoiceModalPresented = true
                    }
                    .padding(.trailing, 20)
                    .padding(.bottom, 90)  // Above tab bar
                }
            }
        }
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
    private func tabContent(for tab: AppTab) -> some View {
        NavigationStack(path: binding(for: tab)) {
            tabRootView(for: tab)
                .navigationDestination(for: Route.self) { route in
                    VStack(spacing: 0) {
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
            HomeView()
        case .liveTV:
            LiveTVView()
        case .vod:
            VODView()
        case .radio:
            RadioView()
        case .podcasts:
            PodcastsView()
        case .widgets:
            WidgetsView()
        }
    }

    private func binding(for tab: AppTab) -> Binding<NavigationPath> {
        Binding(
            get: { coordinator.paths[tab, default: NavigationPath()] },
            set: { coordinator.paths[tab] = $0 }
        )
    }
}
