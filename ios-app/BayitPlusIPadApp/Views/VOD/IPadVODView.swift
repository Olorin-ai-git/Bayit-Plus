import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iPad-optimized VOD screen with 4-column content grid
struct IPadVODView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: VODViewModel?
    @State private var continueWatchingItems: [WatchHistoryItem] = []

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            PageHeader(icon: "film.fill", title: "VOD")

            if let vm = viewModel {
                if !continueWatchingItems.isEmpty && vm.selectedType == .all {
                    ContinueWatchingSection(items: continueWatchingItems) { item in
                        coordinator.navigate(to: .player(
                            contentId: item.id,
                            contentType: ContentType(rawValue: item.type ?? "movie") ?? .movie
                        ))
                    }
                }

                contentTypeFilters(vm)

                if !vm.categories.isEmpty { categoryFilters(vm) }
                if !vm.availableGenres.isEmpty { genreFilters(vm) }

                if vm.isLoading && vm.items.isEmpty {
                    loadingGrid
                } else if let error = vm.error, vm.items.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    vodGrid(vm.items, isLoadingMore: vm.isLoadingMore)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable { await viewModel?.refresh() }
        .task {
            if viewModel == nil {
                viewModel = VODViewModel(repository: repos.content)
            }
            await viewModel?.loadContent()
            await loadContinueWatching()
        }
    }

    private func loadContinueWatching() async {
        guard let items = try? await repos.content.fetchContinueWatching() else { return }
        continueWatchingItems = items.items
    }

    private func contentTypeFilters(_ vm: VODViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(VODFilterType.allCases) { type in
                    GlassChip(
                        title: localization.t(type.localizationKey),
                        isSelected: vm.selectedType == type
                    ) {
                        vm.selectedType = type
                        Task { await vm.loadContent() }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }
    }

    private func categoryFilters(_ vm: VODViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                GlassChip(
                    title: localization.t("vod.allCategories"),
                    isSelected: vm.selectedCategory == nil
                ) {
                    vm.selectedCategory = nil
                    vm.applyFilters()
                }
                ForEach(vm.categories) { category in
                    GlassChip(
                        title: category.name,
                        isSelected: vm.selectedCategory == category.id
                    ) {
                        vm.selectedCategory = category.id
                        vm.applyFilters()
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }
    }

    private func genreFilters(_ vm: VODViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                GlassChip(
                    title: localization.t("vod.allGenres"),
                    isSelected: vm.selectedGenre == nil
                ) {
                    vm.selectedGenre = nil
                    vm.applyFilters()
                }
                ForEach(vm.availableGenres, id: \.self) { genre in
                    GlassChip(
                        title: genre,
                        isSelected: vm.selectedGenre == genre
                    ) {
                        vm.selectedGenre = genre
                        vm.applyFilters()
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
        }
    }

    private func vodGrid(
        _ items: [ContentItem], isLoadingMore: Bool
    ) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(items) { item in
                IPadVODCard(item: item) { navigateToItem(item) }
                    .onAppear {
                        if item.id == items.last?.id {
                            Task { await viewModel?.loadMore() }
                        }
                    }
            }
            if isLoadingMore {
                ProgressView().tint(DesignTokens.Primary.default)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.top, DesignTokens.Spacing.md)
    }

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0..<12, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(2 / 3, contentMode: .fit)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.top, DesignTokens.Spacing.md)
    }

    private func navigateToItem(_ item: ContentItem) {
        if item.isCollectionParent == true {
            coordinator.navigate(to: .collectionDetail(collectionId: item.id))
        } else if item.isSeries == true {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}
