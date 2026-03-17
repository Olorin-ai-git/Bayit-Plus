#if os(tvOS)
    import BayitAuth
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    struct TVMainTabView: View {
        @Environment(TVNavigationCoordinator.self) var coordinator
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization
        @Environment(TVOnboardingPreferences.self) var prefs
        @Environment(AuthManager.self) var authManager
        @Environment(\.appConfiguration) private var appConfiguration
        @State var dockViewModel: WidgetDockViewModel?
        @State var widgetsViewModel: WidgetsViewModel?
        @State var pickerViewModel: ContentPickerViewModel?
        @State var proactiveSuggestionViewModel: TVProactiveSuggestionViewModel?
        @State var showLanguagePicker = false
        @State var showCreateWidget = false
        @State var hasAppeared = false

        var body: some View {
            @Bindable var coord = coordinator

            HStack(spacing: 0) {
                TVAppSidebarView(
                    avatarURL: coordinator.selectedProfileAvatar.flatMap { URL(string: $0) },
                    restoredWidgets: dockViewModel?.widgets ?? [],
                    onAvatarTap: { coordinator.selectedTab = .profile },
                    onLanguageTap: { showLanguagePicker = true },
                    onAddWidget: { showCreateWidget = true },
                    onClose: { dockViewModel?.dismissFromSidebar(widgetId: $0) },
                    onShowQuickDock: { coordinator.showQuickDock = true }
                )

                TabView(selection: $coord.selectedTab) {
                    TVHomeView()
                        .tabItem { Label(localization.t("nav.home"), systemImage: TVTab.home.iconName) }
                        .tag(TVTab.home)

                    TVSearchView()
                        .tabItem { Label(localization.t("nav.search"), systemImage: TVTab.search.iconName) }
                        .tag(TVTab.search)

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

                    TVBYOCSourceListView(isEmbedded: true, onDismiss: {})
                        .tabItem { Label(localization.t("nav.byoc"), systemImage: TVTab.byoc.iconName) }
                        .tag(TVTab.byoc)

                    TVDiscoverView()
                        .tabItem { Label(localization.t("nav.discover"), systemImage: TVTab.discover.iconName) }
                        .tag(TVTab.discover)

                    TVProfileView()
                        .tabItem { Label(localization.t("nav.profile"), systemImage: TVTab.profile.iconName) }
                        .tag(TVTab.profile)

                    HelpSupportView()
                        .tabItem { Label(localization.t("nav.help"), systemImage: TVTab.help.iconName) }
                        .tag(TVTab.help)
                }
                .overlay(alignment: .bottom) {
                    TVMiniAudioPlayerBar()
                }
                .overlay(alignment: .bottom) {
                    if coordinator.showQuickDock {
                        TVQuickDockView(
                            onShowWidgets: { showCreateWidget = true },
                            onDismiss: { coordinator.showQuickDock = false }
                        )
                        .padding(.bottom, 60)
                        .zIndex(100)
                        .animation(.spring(duration: 0.35, bounce: 0.1), value: coordinator.showQuickDock)
                    }
                }
                .overlay(alignment: .top) {
                    if let vm = proactiveSuggestionViewModel {
                        TVProactiveSuggestionBannerView(
                            viewModel: vm,
                            onExecute: { handleProactiveSuggestion($0) }
                        )
                    }
                }
            }
            .onAppear {
                guard !hasAppeared else { return }
                hasAppeared = true
                coord.selectedTab = .home
            }
            .fullScreenCover(isPresented: $showLanguagePicker) {
                languagePickerSheet
            }
            .fullScreenCover(isPresented: $showCreateWidget) {
                if let wvm = widgetsViewModel, let pvm = pickerViewModel {
                    TVCreateWidgetView(
                        widgetsViewModel: wvm,
                        pickerViewModel: pvm,
                        onDismiss: {
                            showCreateWidget = false
                            Task { await dockViewModel?.loadWidgets() }
                        }
                    )
                }
            }
            .onExitCommand {}
            .task {
                if dockViewModel == nil {
                    dockViewModel = WidgetDockViewModel(repository: repos.widget, initiallyVisible: false)
                }
                if widgetsViewModel == nil {
                    widgetsViewModel = WidgetsViewModel(repository: repos.widget)
                }
                if pickerViewModel == nil {
                    pickerViewModel = ContentPickerViewModel(
                        liveTV: repos.liveTV, podcasts: repos.podcasts,
                        radio: repos.radio, audiobook: repos.audiobook
                    )
                }
                async let dock: () = dockViewModel?.loadWidgets() ?? ()
                async let picker: () = pickerViewModel?.loadAll() ?? ()
                _ = await (dock, picker)
            }
            .task(id: coordinator.selectedProfileId) {
                if proactiveSuggestionViewModel == nil {
                    proactiveSuggestionViewModel = TVProactiveSuggestionViewModel(
                        repository: repos.proactiveSuggestion
                    )
                }
                proactiveSuggestionViewModel?.stop()
                proactiveSuggestionViewModel?.start(profileId: coordinator.selectedProfileId)
            }
            .onChange(of: coordinator.selectedTab) { _, newTab in
                guard let userId = authManager.user?.id else { return }
                coordinator.trackVisit(tab: newTab, userId: userId)
            }
        }
    }
#endif
