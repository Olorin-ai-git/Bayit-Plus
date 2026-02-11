#if os(tvOS)
import BayitDesignSystem
import SwiftUI

/// Main tab navigation for the tvOS app.
/// Uses TabView with tvOS-native top shelf styling.
/// Overlays the widget dock at the bottom across all tabs.
struct TVMainTabView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var dockViewModel: WidgetDockViewModel?

    var body: some View {
        @Bindable var coord = coordinator

        ZStack {
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

                TVPodcastsView()
                    .tabItem { Label(TVTab.podcasts.title, systemImage: TVTab.podcasts.iconName) }
                    .tag(TVTab.podcasts)

                TVAudiobooksView()
                    .tabItem { Label(TVTab.audiobooks.title, systemImage: TVTab.audiobooks.iconName) }
                    .tag(TVTab.audiobooks)

                TVChildrenView()
                    .tabItem { Label(TVTab.children.title, systemImage: TVTab.children.iconName) }
                    .tag(TVTab.children)

                TVYoungstersView()
                    .tabItem { Label(TVTab.youngsters.title, systemImage: TVTab.youngsters.iconName) }
                    .tag(TVTab.youngsters)

                TVJudaismView()
                    .tabItem { Label(TVTab.judaism.title, systemImage: TVTab.judaism.iconName) }
                    .tag(TVTab.judaism)

                TVFlowsView()
                    .tabItem { Label(TVTab.flows.title, systemImage: TVTab.flows.iconName) }
                    .tag(TVTab.flows)

                TVCultureView()
                    .tabItem { Label(TVTab.culture.title, systemImage: TVTab.culture.iconName) }
                    .tag(TVTab.culture)

                TVHouseholdView()
                    .tabItem { Label(TVTab.household.title, systemImage: TVTab.household.iconName) }
                    .tag(TVTab.household)

                TVRecordingsView()
                    .tabItem { Label(TVTab.recordings.title, systemImage: TVTab.recordings.iconName) }
                    .tag(TVTab.recordings)

                TVEPGView()
                    .tabItem { Label(TVTab.epg.title, systemImage: TVTab.epg.iconName) }
                    .tag(TVTab.epg)

                TVFavoritesView()
                    .tabItem { Label(TVTab.favorites.title, systemImage: TVTab.favorites.iconName) }
                    .tag(TVTab.favorites)

                TVWatchPartyView()
                    .tabItem { Label(TVTab.watchParty.title, systemImage: TVTab.watchParty.iconName) }
                    .tag(TVTab.watchParty)

                TVTriviaView()
                    .tabItem { Label(TVTab.trivia.title, systemImage: TVTab.trivia.iconName) }
                    .tag(TVTab.trivia)

                TVFriendsView()
                    .tabItem { Label(TVTab.friends.title, systemImage: TVTab.friends.iconName) }
                    .tag(TVTab.friends)

                TVDirectMessagesView()
                    .tabItem { Label(TVTab.messages.title, systemImage: TVTab.messages.iconName) }
                    .tag(TVTab.messages)

                TVChessView()
                    .tabItem { Label(TVTab.chess.title, systemImage: TVTab.chess.iconName) }
                    .tag(TVTab.chess)

                TVChatbotView()
                    .tabItem { Label(TVTab.aiChat.title, systemImage: TVTab.aiChat.iconName) }
                    .tag(TVTab.aiChat)

                TVAvatarModeView()
                    .tabItem { Label(TVTab.avatar.title, systemImage: TVTab.avatar.iconName) }
                    .tag(TVTab.avatar)

                TVRewardsView()
                    .tabItem { Label(TVTab.rewards.title, systemImage: TVTab.rewards.iconName) }
                    .tag(TVTab.rewards)

                TVBetaCreditsView()
                    .tabItem { Label(TVTab.betaCredits.title, systemImage: TVTab.betaCredits.iconName) }
                    .tag(TVTab.betaCredits)

                TVSearchView()
                    .tabItem { Label(TVTab.search.title, systemImage: TVTab.search.iconName) }
                    .tag(TVTab.search)

                TVProfileView()
                    .tabItem { Label(TVTab.profile.title, systemImage: TVTab.profile.iconName) }
                    .tag(TVTab.profile)

                TVSettingsView()
                    .tabItem { Label(TVTab.settings.title, systemImage: TVTab.settings.iconName) }
                    .tag(TVTab.settings)
            }

            // Widget sidebar (right edge - restored widgets)
            if let vm = dockViewModel, !vm.restoredWidgets.isEmpty {
                TVWidgetSidebarView(
                    widgets: vm.restoredWidgets,
                    onMinimize: { widgetId in vm.minimizeWidget(widgetId: widgetId) },
                    onPlay: { widget in playWidget(widget) }
                )
            }

            // Widget dock (bottom bar - minimized widgets)
            if let vm = dockViewModel {
                TVWidgetDockView(
                    widgets: vm.minimizedWidgets,
                    isDockVisible: vm.isDockVisible,
                    onRestore: { widgetId in vm.toggleMinimize(widgetId: widgetId) },
                    onCloseDock: { vm.hideDock() }
                )
            }
        }
        .task {
            if dockViewModel == nil {
                dockViewModel = WidgetDockViewModel(repository: repos.widget)
            }
            await dockViewModel?.loadWidgets()
        }
    }

    /// Play a widget's content by navigating to the appropriate player.
    private func playWidget(_ widget: WidgetItem) {
        guard let content = widget.content, let contentType = content.contentType else { return }

        switch contentType {
        case .liveChannel, .live:
            if let channelId = content.liveChannelId {
                coordinator.presentPlayer(contentId: channelId, contentType: .liveTV, channelId: channelId)
            }
        case .radio:
            if let stationId = content.stationId {
                coordinator.presentPlayer(contentId: stationId, contentType: .radio)
            }
        case .podcast:
            if let podcastId = content.podcastId {
                coordinator.fullscreenRoute = .podcastDetail(showId: podcastId)
            }
        case .vod:
            if let contentId = content.contentId {
                coordinator.presentPlayer(contentId: contentId, contentType: .vod)
            }
        case .audiobook:
            if let audiobookId = content.audiobookId ?? content.contentId {
                coordinator.fullscreenRoute = .audiobookDetail(audiobookId: audiobookId)
            }
        case .iframe, .custom:
            break
        }
    }
}
#endif
