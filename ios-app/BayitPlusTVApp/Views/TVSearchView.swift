import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS Search screen with system keyboard, filter pills, sort/filter controls,
/// autocomplete, trending/recent suggestions, pagination, and error state.
/// Reuses SearchViewModel from shared ViewModels.
struct TVSearchView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: SearchViewModel?
    @State private var searchText = ""
    @State private var showAISearch = false
    @State private var showSortSheet = false
    @State private var showFilterSheet = false

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        HStack(spacing: TVDesignTokens.Spacing.md) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: TVDesignTokens.FontSize.lg))
                                .foregroundStyle(DesignTokens.Text.muted)
                            Text(searchText)
                                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .semibold))
                                .foregroundStyle(DesignTokens.Text.primary)
                        }
                        .padding(.horizontal, TVDesignTokens.Spacing.xl)
                        .padding(.top, TVDesignTokens.Spacing.lg)
                        .padding(.bottom, TVDesignTokens.Spacing.sm)
                    }
                    TVSearchFilterPillsView(
                        selectedFilter: vm.selectedFilter,
                        onFilterChanged: { vm.onFilterChanged($0) }
                    )
                    TVSearchToolbarView(
                        sortOption: vm.sortOption,
                        activeFilterCount: vm.advancedFilters.activeCount,
                        onSortTap: { showSortSheet = true },
                        onFilterTap: { showFilterSheet = true }
                    )
                    searchContent(vm)
                }
            }
            .searchable(text: $searchText, prompt: localization.t("tvos.search.placeholder"))
            .onChange(of: searchText) { _, newValue in
                guard viewModel?.query != newValue else { return }
                viewModel?.query = newValue
                viewModel?.onQueryChanged()
            }
            .task {
                if viewModel == nil {
                    viewModel = SearchViewModel(
                        searchRepository: repos.search,
                        featureFlags: FeatureFlags(),
                        recentSearchesService: RecentSearchesService()
                    )
                    await viewModel?.loadInitialData()
                }
            }
            .sheet(isPresented: $showAISearch) { TVLLMSearchView() }
            .fullScreenCover(isPresented: $showSortSheet) {
                if let vm = viewModel {
                    TVSearchSortView(currentSort: vm.sortOption) { selected in
                        vm.sortOption = selected
                        showSortSheet = false
                        vm.onSortChanged()
                    }
                }
            }
            .fullScreenCover(isPresented: $showFilterSheet) {
                if let vm = viewModel {
                    TVSearchAdvancedFiltersView(
                        filters: Binding(get: { vm.advancedFilters }, set: { vm.advancedFilters = $0 }),
                        onApply: { showFilterSheet = false; vm.onFiltersApplied() },
                        onDismiss: { showFilterSheet = false }
                    )
                }
            }
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Content Router

    @ViewBuilder
    private func searchContent(_ vm: SearchViewModel) -> some View {
        if !vm.autocompleteSuggestions.isEmpty {
            TVSearchAutocompleteSuggestions(suggestions: vm.autocompleteSuggestions) {
                searchText = $0; vm.selectSuggestion($0)
            }
        }
        if let errorMessage = vm.error {
            errorState(errorMessage, onRetry: { vm.retrySearch() })
        } else if vm.isSearching {
            searchingState
        } else if showSuggestions(vm) {
            TVSearchSuggestionsView(
                trendingSearches: vm.trendingSearches,
                recentSearches: vm.recentSearches,
                onSelect: { searchText = $0; vm.selectSuggestion($0) },
                onClearRecent: { vm.clearRecentSearches() }
            )
        } else if vm.hasSearched && vm.results.isEmpty {
            emptyState(vm)
        } else if !vm.results.isEmpty {
            TVSearchResultsGridView(
                results: vm.results, totalResults: vm.totalResults,
                query: searchText,
                currentPage: vm.currentPage, totalPages: vm.totalPages,
                hasMore: vm.hasMore, isLoadingMore: vm.isLoadingMore,
                onLoadMore: { vm.loadMore() },
                onGoToPage: { vm.goToPage($0) },
                onSelect: { handleResultSelection($0) }
            )
        } else {
            searchPrompt
        }
    }

    private func showSuggestions(_ vm: SearchViewModel) -> Bool {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !vm.hasSearched
            && (!vm.trendingSearches.isEmpty || !vm.recentSearches.isEmpty)
    }

    // MARK: - States

    private var searchingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
            Text(localization.t("search.searching"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    private func errorState(_ message: String, onRetry: @escaping () -> Void) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            GlassButton(localization.t("common.retry"), variant: .secondary, size: .medium) { onRetry() }
                .tvFocusStyle()
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    private func emptyState(_ vm: SearchViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("search.noResults"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)
            Text(localization.t("search.tryDifferent"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
            if !vm.advancedFilters.isEmpty || vm.selectedFilter != .all {
                GlassButton(localization.t("search.clearFilters"), variant: .secondary, size: .medium) {
                    vm.clearFilters()
                }
                .tvFocusStyle()
            }
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    private var searchPrompt: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 80))
                .foregroundStyle(DesignTokens.Text.muted.opacity(0.4))
            Text(localization.t("tvos.search.searchForContent"))
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Text.muted)
            GlassButton(
                "AI Search", variant: .secondary, size: .medium,
                icon: Image(systemName: "sparkles")
            ) { showAISearch = true }
            .tvFocusStyle()
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    private func handleResultSelection(_ result: UnifiedSearchResult) {
        let contentType = result.contentType?.lowercased() ?? ""
        switch contentType {
        case "live":
            coordinator.presentPlayer(contentId: result.id, contentType: .liveTV)
        case "radio":
            coordinator.presentPlayer(contentId: result.id, contentType: .radio)
        case "podcast":
            coordinator.fullscreenRoute = .podcastDetail(showId: result.id)
        case "collection":
            coordinator.fullscreenRoute = .collectionDetail(collectionId: result.id)
        case "series":
            coordinator.fullscreenRoute = .seriesDetail(seriesId: result.id)
        case "audiobook":
            coordinator.fullscreenRoute = .audiobookDetail(audiobookId: result.id)
        default:
            coordinator.fullscreenRoute = .movieDetail(movieId: result.id)
        }
    }
}
