import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Listen screen with radio stations, category filters and podcast show grid
struct PodcastsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: PodcastsViewModel?
    @State private var audiobooksViewModel: AudiobooksViewModel?
    @State private var radioStations: [RadioStationItem] = []
    @State private var showAddSheet = false

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            HStack {
                PageHeader(icon: "headphones", title: localization.t("listen.title"))
                Button {
                    showAddSheet = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Primary.default)
                }
                .padding(.trailing, DesignTokens.Spacing.lg)
            }

            if let vm = viewModel {
                if vm.isLoading && vm.shows.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.shows.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    contentView(vm)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
            await audiobooksViewModel?.refresh()
        }
        .sheet(isPresented: $showAddSheet) {
            AddPodcastView(
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
                viewModel = PodcastsViewModel(repository: repos.podcasts)
            }
            if audiobooksViewModel == nil {
                audiobooksViewModel = AudiobooksViewModel(repository: repos.audiobook)
            }
            await viewModel?.loadInitial()
            await audiobooksViewModel?.loadInitial()
            await loadRadioStations()
        }
    }

    private func contentView(_ vm: PodcastsViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            if !radioStations.isEmpty {
                RadioStationsRow(stations: radioStations, coordinator: coordinator)
            }

            Text(localization.t("podcasts.title"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            if !vm.categories.isEmpty {
                categoryFilters(vm)
            }

            showGrid(vm)

            if let audiobookVM = audiobooksViewModel, !audiobookVM.items.isEmpty {
                audiobooksSection(audiobookVM)
            }
        }
    }

    private func loadRadioStations() async {
        do {
            let response = try await repos.radio.fetchStations(cultureId: nil, genre: nil)
            radioStations = Array(response.stations.prefix(8))
        } catch {
            radioStations = []
        }
    }

    private func categoryFilters(_ vm: PodcastsViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                GlassChip(
                    title: "All",
                    isSelected: vm.selectedCategory == nil
                ) {
                    Task { await vm.filterByCategory(nil) }
                }

                ForEach(vm.categories) { cat in
                    GlassChip(
                        title: cat.name,
                        isSelected: vm.selectedCategory == cat.id
                    ) {
                        Task { await vm.filterByCategory(cat.id) }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private func showGrid(_ vm: PodcastsViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.shows) { show in
                PodcastShowCard(
                    show: show,
                    onTap: {
                        coordinator.navigate(to: .podcastDetail(showId: show.id))
                    },
                    onDelete: show.isUserAdded == true ? {
                        await vm.removePodcast(id: show.id)
                    } : nil
                )
                .onAppear {
                    if show.id == vm.shows.last?.id {
                        Task { await vm.loadMore() }
                    }
                }
            }

            if vm.isLoadingMore {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var loadingState: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0..<6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(1, contentMode: .fit)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }

    private func audiobooksSection(_ audiobookVM: AudiobooksViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            HStack {
                Text(localization.t("audiobooks.title"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                Spacer()
                Button {
                    coordinator.navigate(to: .audiobooks)
                } label: {
                    Text(localization.t("common.seeAll"))
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundColor(DesignTokens.Primary.default)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(Array(audiobookVM.items.prefix(10))) { audiobook in
                        AudiobookCardView(audiobook: audiobook) {
                            coordinator.navigate(to: .audiobookDetail(audiobookId: audiobook.id))
                        }
                        .frame(width: 150)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }
}

/// Podcast show card with cover art and metadata
private struct PodcastShowCard: View {
    let show: PodcastShow
    let onTap: () -> Void
    let onDelete: (() async -> Void)?

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                coverImage
                    .aspectRatio(1, contentMode: .fill)
                    .clipped()

                VStack(alignment: .leading, spacing: 2) {
                    Text(show.title ?? "Podcast")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let author = show.author {
                        Text(author)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }

                    if let lastUpdated = show.latestEpisode {
                        Text(lastUpdated)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Primary.p400)
                            .lineLimit(1)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.bottom, DesignTokens.Spacing.sm)
            }
            .glassCard()
        }
        .buttonStyle(.plain)
        .contextMenu {
            if show.isUserAdded == true {
                Button(role: .destructive) {
                    Task { await onDelete?() }
                } label: {
                    Label("Remove Podcast", systemImage: "trash")
                }
            }
        }
    }

    private var coverImage: some View {
        Group {
            if let urlStr = show.cover, let url = URL(string: urlStr) {
                CachedAsyncImage(url: url) {
                    coverPlaceholder
                }
            } else {
                coverPlaceholder
            }
        }
    }

    private var coverPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "headphones")
                .font(.system(size: 32))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }
}
