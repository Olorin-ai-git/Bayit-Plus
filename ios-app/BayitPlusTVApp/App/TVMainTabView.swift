#if os(tvOS)
import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Main tab navigation for the tvOS app.
/// Uses TabView with tvOS-native top shelf styling.
/// Overlays the widget dock at the bottom and profile pill at the top-right.
struct TVMainTabView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var dockViewModel: WidgetDockViewModel?

    var body: some View {
        @Bindable var coord = coordinator

        HStack(spacing: 0) {
            TabView(selection: $coord.selectedTab) {
                TVHomeView()
                    .tabItem { Label(TVTab.home.title, systemImage: TVTab.home.iconName) }
                    .tag(TVTab.home)

                TVLiveTVView()
                    .tabItem { Label(TVTab.liveTV.title, systemImage: TVTab.liveTV.iconName) }
                    .tag(TVTab.liveTV)

                TVVODView()
                    .tabItem { Label(TVTab.vod.title, systemImage: TVTab.vod.iconName) }
                    .tag(TVTab.vod)

                TVZehAniHubView()
                    .tabItem { Label(TVTab.zehAni.title, systemImage: TVTab.zehAni.iconName) }
                    .tag(TVTab.zehAni)

                TVPodcastsView()
                    .tabItem { Label(TVTab.podcasts.title, systemImage: TVTab.podcasts.iconName) }
                    .tag(TVTab.podcasts)

                TVKidsHubView()
                    .tabItem { Label(TVTab.kids.title, systemImage: TVTab.kids.iconName) }
                    .tag(TVTab.kids)

                TVSearchView()
                    .tabItem { Label(TVTab.search.title, systemImage: TVTab.search.iconName) }
                    .tag(TVTab.search)

                TVProfileView()
                    .tabItem { Label(TVTab.profile.title, systemImage: TVTab.profile.iconName) }
                    .tag(TVTab.profile)
            }
            .onAppear {
                coord.selectedTab = .home
            }
            // Widget dock floats above content (overlay avoids focus trapping)
            .overlay(alignment: .bottom) {
                if let vm = dockViewModel, vm.isDockVisible, !vm.minimizedWidgets.isEmpty {
                    TVWidgetDockView(
                        widgets: vm.minimizedWidgets,
                        isDockVisible: vm.isDockVisible,
                        onRestore: { widgetId in vm.toggleMinimize(widgetId: widgetId) },
                        onCloseDock: { vm.hideDock() }
                    )
                    .padding(.bottom, TVDesignTokens.Spacing.lg)
                }
            }

            // Widget sidebar (no .focusSection to avoid trapping focus)
            if let vm = dockViewModel, !vm.restoredWidgets.isEmpty {
                TVWidgetSidebarView(
                    widgets: vm.restoredWidgets,
                    onMinimize: { widgetId in vm.minimizeWidget(widgetId: widgetId) }
                )
            }
        }
        .ignoresSafeArea(.all, edges: .trailing)
        .task {
            if dockViewModel == nil {
                dockViewModel = WidgetDockViewModel(repository: repos.widget)
            }
            await dockViewModel?.loadWidgets()
        }
    }

    // MARK: - Profile Pill

}
#endif
