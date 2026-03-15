#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Full grid browse view for podcasts with category filter.
    /// Presented as a fullscreen modal from the Listen tab.
    struct TVPodcastBrowseView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(TVAudioPlaybackManager.self) private var audioManager
        @Environment(LocalizationManager.self) private var localization
        @State private var viewModel: PodcastsViewModel?
        @State private var showAddSheet = false

        private let columns = [
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
                        browseContent(vm)
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
                await viewModel?.loadInitial()
            }
        }

        private func browseContent(_ vm: PodcastsViewModel) -> some View {
            LazyVStack(spacing: TVDesignTokens.Spacing.lg) {
                headerRow(vm)
                if !vm.categories.isEmpty { categoryRow(vm) }
                podcastGrid(vm)
            }
            .padding(.top, TVDesignTokens.Spacing.lg)
        }

        private func headerRow(_: PodcastsViewModel) -> some View {
            HStack {
                Text(localization.t("listen.browsePodcasts"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button { showAddSheet = true } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "plus.circle")
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                        Text(localization.t("podcasts.addPodcast.addPodcast"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    }
                    .foregroundStyle(DesignTokens.Primary.default)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                }
                .tvCardStyle()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }

        private func categoryRow(_ vm: PodcastsViewModel) -> some View {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    categoryChip(localization.t("common.all"), isSelected: vm.selectedCategory == nil) {
                        Task { await vm.filterByCategory(nil) }
                    }
                    ForEach(vm.categories) { cat in
                        categoryChip(cat.name, isSelected: vm.selectedCategory == cat.id) {
                            Task { await vm.filterByCategory(cat.id) }
                        }
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
            .frame(height: TVDesignTokens.MinSize.focusableHeight + 20)
        }

        private func categoryChip(
            _ title: String,
            isSelected: Bool,
            action: @escaping () -> Void
        ) -> some View {
            Button(action: action) {
                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.secondary)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(isSelected ? DesignTokens.Glass.bgStrong : DesignTokens.Glass.bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
            }
            .tvCardStyle()
        }

        private func podcastGrid(_ vm: PodcastsViewModel) -> some View {
            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(vm.shows) { show in
                    TVPodcastShowCardView(
                        show: show,
                        onSelect: {
                            audioManager.play(contentId: show.id, contentType: .podcast)
                        },
                        onShowDetail: {
                            coordinator.fullscreenRoute = .podcastDetail(showId: show.id)
                        }
                    )
                    .onAppear {
                        if show.id == vm.shows.last?.id {
                            Task { await vm.loadMore() }
                        }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }

        private var loadingState: some View {
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
#endif
