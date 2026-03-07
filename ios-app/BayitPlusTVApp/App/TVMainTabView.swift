#if os(tvOS)
    import BayitAuth
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Main tab navigation for the tvOS app.
    /// Uses TabView with tvOS-native top shelf styling.
    /// Overlays the widget dock at the bottom, language picker at the top-right.
    struct TVMainTabView: View {
        @Environment(TVNavigationCoordinator.self) var coordinator
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization
        @Environment(TVOnboardingPreferences.self) var prefs
        @Environment(\.appConfiguration) private var appConfiguration
        @State var dockViewModel: WidgetDockViewModel?
        @State var showLanguagePicker = false
        @State var widgetAutoHideTask: Task<Void, Never>?
        @State var isWidgetAreaFocused = false
        @State var hasAppeared = false

        var body: some View {
            @Bindable var coord = coordinator

            HStack(spacing: 0) {
                TabView(selection: $coord.selectedTab) {
                    TVSearchView()
                        .tabItem { Label(localization.t("nav.search"), systemImage: TVTab.search.iconName) }
                        .tag(TVTab.search)

                    TVHomeView()
                        .tabItem { Label(localization.t("nav.home"), systemImage: TVTab.home.iconName) }
                        .tag(TVTab.home)

                    if prefs.showLiveTV {
                        TVLiveTVView()
                            .tabItem { Label(localization.t("nav.liveTV"), systemImage: TVTab.liveTV.iconName) }
                            .tag(TVTab.liveTV)
                    }

                    if appConfiguration.ownerMode {
                        TVVODView()
                            .tabItem { Label(localization.t("nav.vod"), systemImage: TVTab.vod.iconName) }
                            .tag(TVTab.vod)
                    }

                    TVZehAniHubView()
                        .tabItem { Label(localization.t("nav.zehAni"), systemImage: TVTab.zehAni.iconName) }
                        .tag(TVTab.zehAni)

                    TVListenView()
                        .tabItem { Label(localization.t("nav.listen"), systemImage: TVTab.podcasts.iconName) }
                        .tag(TVTab.podcasts)

                    TVWidgetsView()
                        .tabItem { Label(localization.t("nav.widgets"), systemImage: TVTab.widgets.iconName) }
                        .tag(TVTab.widgets)

                    TVProfileView()
                        .tabItem { Label(localization.t("nav.profile"), systemImage: TVTab.profile.iconName) }
                        .tag(TVTab.profile)
                }
                .onAppear {
                    guard !hasAppeared else { return }
                    hasAppeared = true
                    coord.selectedTab = .home
                }
                // Mini audio player bar overlays at bottom when inline audio is active
                .overlay(alignment: .bottom) {
                    TVMiniAudioPlayerBar()
                }
                .fullScreenCover(isPresented: $showLanguagePicker) {
                    languagePickerSheet
                }

                // Widget sidebar - only rendered when dock is visible
                if let vm = dockViewModel, vm.isDockVisible, !vm.restoredWidgets.isEmpty {
                    TVWidgetSidebarView(
                        widgets: vm.restoredWidgets,
                        onMinimize: { widgetId in vm.minimizeWidget(widgetId: widgetId) }
                    )
                }
            }
            .ignoresSafeArea(.all, edges: .trailing)
            // Top-right pills placed on outer HStack so tvOS focus engine can reach them.
            // Overlays nested inside TabView are outside the focus scope and receive no focus.
            .overlay(alignment: .topTrailing) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    if let vm = dockViewModel, !vm.widgets.isEmpty {
                        widgetsButton(viewModel: vm)
                    }
                    languageButton
                }
                .padding(.top, TVDesignTokens.Spacing.md)
                .padding(.trailing, TVDesignTokens.Spacing.xl)
            }
            // Widget dock also on outer HStack for focus reachability.
            .overlay(alignment: .bottom) {
                if let vm = dockViewModel, vm.isDockVisible, !vm.minimizedWidgets.isEmpty {
                    TVWidgetDockView(
                        widgets: vm.minimizedWidgets,
                        isDockVisible: vm.isDockVisible,
                        onRestore: { widgetId in vm.toggleMinimize(widgetId: widgetId) },
                        onCloseDock: { vm.hideDock() },
                        onFocusChanged: { focused in handleWidgetFocusChanged(focused) }
                    )
                    .padding(.bottom, TVDesignTokens.Spacing.xs)
                }
            }
            // NavigationStack handles Menu/Back button navigation automatically.
            // No .onExitCommand override needed - it would trap users in sub-pages.
            .task {
                if dockViewModel == nil {
                    dockViewModel = WidgetDockViewModel(
                        repository: repos.widget,
                        initiallyVisible: false
                    )
                }
                await dockViewModel?.loadWidgets()
            }
            .onChange(of: dockViewModel?.isDockVisible) { _, isVisible in
                coordinator.dockIsVisible = isVisible ?? false
                if isVisible == true {
                    resetWidgetAutoHideTimer()
                } else {
                    widgetAutoHideTask?.cancel()
                    widgetAutoHideTask = nil
                }
            }
            .onChange(of: coordinator.showWidgetDock) { _, shouldShow in
                guard shouldShow else { return }
                coordinator.showWidgetDock = false
                dockViewModel?.showDock()
            }
            .onChange(of: coordinator.requestDockToggle) { _, shouldToggle in
                guard shouldToggle else { return }
                coordinator.requestDockToggle = false
                dockViewModel?.toggleDock()
            }
        }
    }
#endif
