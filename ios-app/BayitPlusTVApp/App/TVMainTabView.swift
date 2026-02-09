import BayitDesignSystem
import SwiftUI

/// Main tab navigation for the tvOS app.
/// Uses TabView with tvOS-native top shelf styling.
struct TVMainTabView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator

    var body: some View {
        @Bindable var coord = coordinator

        TabView(selection: $coord.selectedTab) {
            TVHomeView()
                .tabItem {
                    Label(TVTab.home.title, systemImage: TVTab.home.iconName)
                }
                .tag(TVTab.home)

            TVLiveTVView()
                .tabItem {
                    Label(TVTab.liveTV.title, systemImage: TVTab.liveTV.iconName)
                }
                .tag(TVTab.liveTV)

            TVVODView()
                .tabItem {
                    Label(TVTab.vod.title, systemImage: TVTab.vod.iconName)
                }
                .tag(TVTab.vod)

            TVPodcastsView()
                .tabItem {
                    Label(TVTab.podcasts.title, systemImage: TVTab.podcasts.iconName)
                }
                .tag(TVTab.podcasts)

            TVAudiobooksView()
                .tabItem {
                    Label(TVTab.audiobooks.title, systemImage: TVTab.audiobooks.iconName)
                }
                .tag(TVTab.audiobooks)

            TVChildrenView()
                .tabItem {
                    Label(TVTab.children.title, systemImage: TVTab.children.iconName)
                }
                .tag(TVTab.children)

            TVJudaismView()
                .tabItem {
                    Label(TVTab.judaism.title, systemImage: TVTab.judaism.iconName)
                }
                .tag(TVTab.judaism)

            TVFlowsView()
                .tabItem {
                    Label(TVTab.flows.title, systemImage: TVTab.flows.iconName)
                }
                .tag(TVTab.flows)

            TVHouseholdView()
                .tabItem {
                    Label(TVTab.household.title, systemImage: TVTab.household.iconName)
                }
                .tag(TVTab.household)

            TVRecordingsView()
                .tabItem {
                    Label(TVTab.recordings.title, systemImage: TVTab.recordings.iconName)
                }
                .tag(TVTab.recordings)

            TVEPGView()
                .tabItem {
                    Label(TVTab.epg.title, systemImage: TVTab.epg.iconName)
                }
                .tag(TVTab.epg)

            TVFavoritesView()
                .tabItem {
                    Label(TVTab.favorites.title, systemImage: TVTab.favorites.iconName)
                }
                .tag(TVTab.favorites)

            TVWatchPartyView()
                .tabItem {
                    Label(TVTab.watchParty.title, systemImage: TVTab.watchParty.iconName)
                }
                .tag(TVTab.watchParty)

            TVSearchView()
                .tabItem {
                    Label(TVTab.search.title, systemImage: TVTab.search.iconName)
                }
                .tag(TVTab.search)

            TVSettingsView()
                .tabItem {
                    Label(TVTab.settings.title, systemImage: TVTab.settings.iconName)
                }
                .tag(TVTab.settings)
        }
    }
}
