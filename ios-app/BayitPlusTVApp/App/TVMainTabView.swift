#if os(tvOS)
    import BayitAuth
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Main tab navigation for the tvOS app.
    /// Uses TabView with tvOS-native top shelf styling.
    /// Overlays the widget dock at the bottom, language picker at the top-right.
    struct TVMainTabView: View {
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(LocalizationManager.self) private var localization
        @State private var dockViewModel: WidgetDockViewModel?
        @State private var showLanguagePicker = false
        @State private var widgetAutoHideTask: Task<Void, Never>?
        @State private var isWidgetAreaFocused = false

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

                    TVLiveTVView()
                        .tabItem { Label(localization.t("nav.liveTV"), systemImage: TVTab.liveTV.iconName) }
                        .tag(TVTab.liveTV)

                    TVVODView()
                        .tabItem { Label(localization.t("nav.vod"), systemImage: TVTab.vod.iconName) }
                        .tag(TVTab.vod)

                    TVZehAniHubView()
                        .tabItem { Label(localization.t("nav.zehAni"), systemImage: TVTab.zehAni.iconName) }
                        .tag(TVTab.zehAni)

                    TVPodcastsView()
                        .tabItem { Label(localization.t("nav.listen"), systemImage: TVTab.podcasts.iconName) }
                        .tag(TVTab.podcasts)

                    TVKidsHubView()
                        .tabItem { Label(localization.t("nav.children"), systemImage: TVTab.kids.iconName) }
                        .tag(TVTab.kids)

                    TVProfileView()
                        .tabItem { Label(localization.t("nav.profile"), systemImage: TVTab.profile.iconName) }
                        .tag(TVTab.profile)
                }
                .onAppear {
                    coord.selectedTab = .home
                }
                // Top-right navigation pills: widgets toggle + language picker
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
                        onMinimize: { widgetId in vm.minimizeWidget(widgetId: widgetId) },
                        onFocusChanged: { focused in handleWidgetFocusChanged(focused) }
                    )
                }
            }
            .ignoresSafeArea(.all, edges: .trailing)
            // Widget dock placed on the outer HStack so the tvOS focus engine can reach it.
            // Overlays nested inside TabView are outside the focus scope and receive no focus.
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
            .onExitCommand {
                // Prevent Menu/Back button from navigating past the main tab view
                // to the login screen. At the tab bar root, this is a no-op.
            }
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
        }

        // MARK: - Language Button

        private var languageButton: some View {
            Button {
                showLanguagePicker = true
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: "globe")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                    Text(localization.currentLanguage.rawValue.uppercased())
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .semibold
                        ))
                }
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
            }
            .buttonStyle(.card)
            .accessibilityLabel(localization.t("settings.chooseLanguage"))
        }

        // MARK: - Widgets Button

        private func widgetsButton(viewModel vm: WidgetDockViewModel) -> some View {
            Button {
                vm.isDockVisible ? vm.hideDock() : vm.showDock()
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: "square.grid.2x2")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                    Text("\(vm.widgets.count)")
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .semibold
                        ))
                }
                .foregroundStyle(
                    vm.isDockVisible
                        ? DesignTokens.Primary.p300
                        : DesignTokens.Text.primary
                )
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(
                    vm.isDockVisible
                        ? DesignTokens.Primary.p400.opacity(0.15)
                        : DesignTokens.Glass.bgMedium
                )
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(
                        vm.isDockVisible
                            ? DesignTokens.Primary.p400.opacity(0.4)
                            : DesignTokens.Glass.border,
                        lineWidth: 1
                    )
                )
            }
            .buttonStyle(.card)
            .accessibilityLabel(localization.t("nav.widgets"))
        }

        // MARK: - Widget Auto-Hide

        private func handleWidgetFocusChanged(_ focused: Bool) {
            isWidgetAreaFocused = focused
            if focused {
                widgetAutoHideTask?.cancel()
                widgetAutoHideTask = nil
            } else {
                resetWidgetAutoHideTimer()
            }
        }

        private func resetWidgetAutoHideTimer() {
            widgetAutoHideTask?.cancel()
            guard !isWidgetAreaFocused else { return }
            widgetAutoHideTask = Task {
                try? await Task.sleep(for: .seconds(10))
                guard !Task.isCancelled else { return }
                guard !isWidgetAreaFocused else { return }
                dockViewModel?.hideDock()
            }
        }

        // MARK: - Language Picker Sheet

        private var languagePickerSheet: some View {
            ZStack(alignment: .topTrailing) {
                TVLanguageSettingsView()

                Button {
                    showLanguagePicker = false
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.xl))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                .buttonStyle(.card)
                .padding(.top, TVDesignTokens.Spacing.xl)
                .padding(.trailing, TVDesignTokens.Spacing.xl)
                .accessibilityLabel(localization.t("common.dismiss"))
            }
            .background(DesignTokens.Background.primary)
        }
    }
#endif
