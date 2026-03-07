#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Unified audio discovery hub for tvOS.
    /// Combines radio, podcasts, and audiobooks into a single Listen tab
    /// with hero, continue listening, and discovery sections.
    struct TVListenView: View {
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(TVNavigationCoordinator.self) var coordinator
        @Environment(TVAudioPlaybackManager.self) var audioManager
        @Environment(LocalizationManager.self) var localization
        @Environment(TVOnboardingPreferences.self) var prefs

        @State var podcastsVM: PodcastsViewModel?
        @State var audiobooksVM: AudiobooksViewModel?
        @State var radioVM: RadioViewModel?
        @State var showAddPodcastSheet = false

        var body: some View {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
                    TVAudioHeroSection(
                        podcastShows: podcastsVM?.shows ?? [],
                        audiobooks: audiobooksVM?.items ?? [],
                        radioStations: radioVM?.stations ?? []
                    )

                    TVContinueListeningRow()

                    if prefs.showRadio {
                        TVRadioStationsRow(stations: radioVM?.stations ?? [])
                    }

                    if prefs.showPodcasts {
                        TVPodcastsDiscoveryRow(
                            shows: podcastsVM?.shows ?? [],
                            onAddPodcast: { showAddPodcastSheet = true }
                        )
                    }

                    if prefs.showAudiobooks {
                        TVAudiobooksDiscoveryRow(
                            audiobooks: audiobooksVM?.items ?? []
                        )
                    }

                    if prefs.showPodcasts {
                        TVAudioCategoriesRow(
                            podcastCategories: podcastsVM?.categories ?? []
                        )
                    }
                }
                .padding(.bottom, TVDesignTokens.Spacing.xxxl)
            }
            .background(DesignTokens.Background.primary)
            .sheet(isPresented: $showAddPodcastSheet) {
                TVAddPodcastView(
                    repository: repos.podcasts,
                    onDismiss: { showAddPodcastSheet = false },
                    onAdded: {
                        showAddPodcastSheet = false
                        Task { await podcastsVM?.refresh() }
                    }
                )
            }
            .task { await loadAllContent() }
        }

        private func loadAllContent() async {
            if podcastsVM == nil {
                podcastsVM = PodcastsViewModel(repository: repos.podcasts)
            }
            if audiobooksVM == nil {
                audiobooksVM = AudiobooksViewModel(repository: repos.audiobook)
            }
            if radioVM == nil {
                radioVM = RadioViewModel(repository: repos.radio)
            }

            async let podcasts: () = podcastsVM?.loadInitial() ?? ()
            async let audiobooks: () = audiobooksVM?.loadInitial() ?? ()
            async let radio: () = radioVM?.loadStations() ?? ()
            _ = await (podcasts, audiobooks, radio)
        }
    }
#endif
