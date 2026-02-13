import BayitDesignSystem
import BayitMedia
import SwiftUI

/// tvOS Podcasts screen with horizontal shelves organized by category.
/// Reuses PodcastsViewModel from shared ViewModels.
struct TVPodcastsView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @State private var viewModel: PodcastsViewModel?
    @State private var showAddSheet = false

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
                viewModel = PodcastsViewModel(repository: repos.podcasts)
            }
            await viewModel?.loadInitial()
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: PodcastsViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            if !vm.categories.isEmpty {
                categoryFilters(vm)
            }

            if !vm.shows.isEmpty {
                podcastsGrid(vm)
            }
        }
    }

    private func categoryFilters(_ vm: PodcastsViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                categoryChip("All", isSelected: vm.selectedCategory == nil) {
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
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    private func podcastsGrid(_ vm: PodcastsViewModel) -> some View {
        let columns = [
            GridItem(.adaptive(
                minimum: TVDesignTokens.MinSize.posterWidth,
                maximum: TVDesignTokens.MinSize.posterWidth + 60
            ), spacing: TVDesignTokens.Spacing.focusGap),
        ]

        return VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack {
                Text(vm.selectedCategory != nil ? "Podcasts" : "All Podcasts")
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button {
                    showAddSheet = true
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "plus.circle")
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                        Text("Add Podcast")
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    }
                    .foregroundStyle(DesignTokens.Primary.default)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                }
                .buttonStyle(.card)
                .tvFocusStyle()

                Button {
                    Task { await vm.refresh() }
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                            .rotationEffect(.degrees(vm.isSyncing ? 360 : 0))
                            .animation(
                                vm.isSyncing
                                    ? .linear(duration: 1).repeatForever(autoreverses: false)
                                    : .default,
                                value: vm.isSyncing
                            )
                        Text("Refresh")
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    }
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                }
                .buttonStyle(.card)
                .tvFocusStyle()
                .disabled(vm.isSyncing)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(vm.shows) { show in
                    GlassFocusPoster(
                        thumbnailURL: show.cover,
                        title: show.title ?? "Podcast",
                        subtitle: show.author,
                        metadata: show.latestEpisode,
                        aspectRatio: 1.0,
                        onSelect: {
                            coordinator.presentPlayer(
                                contentId: show.id,
                                contentType: .podcast
                            )
                        }
                    )
                    .tvFocusStyle()
                    .contextMenu {
                        if show.isUserAdded == true {
                            Button(role: .destructive) {
                                Task { await vm.removePodcast(id: show.id) }
                            } label: {
                                Label("Remove Podcast", systemImage: "trash")
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
        }
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text("Loading Podcasts...")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
