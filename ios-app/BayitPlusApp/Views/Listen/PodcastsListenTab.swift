import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Podcasts content tab within the Listen screen - category filters and podcast grid
struct PodcastsListenTab: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: PodcastsViewModel?
    @State private var showAddSheet = false

    let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
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
        .refreshable {
            await viewModel?.refresh()
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
            await viewModel?.loadInitial()
        }
    }

    private func contentView(_ vm: PodcastsViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            addPodcastButton

            if !vm.categories.isEmpty {
                categoryFilters(vm)
            }

            showGrid(vm)
        }
    }

    private var addPodcastButton: some View {
        HStack {
            Spacer()
            Button {
                showAddSheet = true
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(DesignTokens.Primary.default)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
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
            ForEach(0 ..< 6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(1, contentMode: .fit)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }
}
