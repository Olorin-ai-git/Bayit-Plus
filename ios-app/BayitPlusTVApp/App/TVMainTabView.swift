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
            // Language picker pill at top-right
            .overlay(alignment: .topTrailing) {
                languageButton
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

            // Widget sidebar (no .focusSection to avoid trapping focus)
            if let vm = dockViewModel, !vm.restoredWidgets.isEmpty {
                TVWidgetSidebarView(
                    widgets: vm.restoredWidgets,
                    onMinimize: { widgetId in vm.minimizeWidget(widgetId: widgetId) }
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
                    onCloseDock: { vm.hideDock() }
                )
                .padding(.bottom, TVDesignTokens.Spacing.xs)
            }
        }
        .task {
            if dockViewModel == nil {
                dockViewModel = WidgetDockViewModel(repository: repos.widget)
            }
            await dockViewModel?.loadWidgets()
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
