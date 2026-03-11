import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS Listen screen - Radio, Podcasts, and Audiobooks in one tab.
/// Reuses PodcastsViewModel, RadioViewModel, and AudiobooksViewModel.
struct TVPodcastsView: View {
    @Environment(TVRepositoryProvider.self) var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(TVAudioPlaybackManager.self) var audioManager
    @Environment(LocalizationManager.self) var localization
    @State var viewModel: PodcastsViewModel?
    @State var audiobooksViewModel: AudiobooksViewModel?
    @State var radioStations: [RadioStationItem] = []
    @State var showAddSheet = false

    let radioColumns = [
        GridItem(.adaptive(
            minimum: TVDesignTokens.MinSize.posterWidth,
            maximum: TVDesignTokens.MinSize.posterWidth + 60
        ), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.shows.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.shows.isEmpty {
                    tvErrorState(error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .sheet(isPresented: $showAddSheet) {
            TVAddPodcastView(
                repository: repos.podcasts,
                onDismiss: { showAddSheet = false },
                onAdded: {
                    showAddSheet = false
                    Task { await viewModel?.refresh() }
                }
            )
        }
        .task {
            if viewModel == nil {
                viewModel = PodcastsViewModel(repository: repos.podcasts, localization: localization)
            }
            if audiobooksViewModel == nil {
                audiobooksViewModel = AudiobooksViewModel(repository: repos.audiobook)
            }
            async let podcastsLoad: () = viewModel?.loadInitial() ?? ()
            async let radioLoad: () = loadRadioStations()
            async let audiobooksLoad: () = audiobooksViewModel?.loadInitial() ?? ()
            _ = await (podcastsLoad, radioLoad, audiobooksLoad)
        }
    }

    private func contentSections(_ vm: PodcastsViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            // Radio stations section
            if !radioStations.isEmpty {
                radioSection
            }

            // Podcasts section label
            if !vm.shows.isEmpty {
                Text(localization.t("podcasts.title"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }

            if !vm.categories.isEmpty {
                categoryFilters(vm)
            }

            if !vm.shows.isEmpty {
                podcastsGrid(vm)
            }

            // Audiobooks section
            if let abVM = audiobooksViewModel, !abVM.items.isEmpty {
                audiobooksSection(abVM)
            }
        }
    }

    var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("podcasts.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
