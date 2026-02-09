import BayitDesignSystem
import SwiftUI

/// Podcasts screen with category filters and show grid
struct PodcastsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: PodcastsViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            PageHeader(icon: "headphones", title: "Podcasts")

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
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                viewModel = PodcastsViewModel(repository: repos.podcasts)
            }
            await viewModel?.loadInitial()
        }
    }

    private func contentView(_ vm: PodcastsViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            if !vm.categories.isEmpty {
                categoryFilters(vm)
            }

            showGrid(vm)
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
                PodcastShowCard(show: show) {
                    coordinator.navigate(to: .podcastDetail(showId: show.id))
                }
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
}

/// Podcast show card with cover art and metadata
private struct PodcastShowCard: View {
    let show: PodcastShow
    let onTap: () -> Void

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
                }
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.bottom, DesignTokens.Spacing.sm)
            }
            .glassCard()
        }
        .buttonStyle(.plain)
    }

    private var coverImage: some View {
        Group {
            if let urlStr = show.cover, let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        coverPlaceholder
                    }
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
