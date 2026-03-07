import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS Search screen with system keyboard, filter pills, sort/filter controls,
/// autocomplete, trending/recent suggestions, pagination, and error state.
/// Reuses SearchViewModel from shared ViewModels.
struct TVSearchView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: SearchViewModel?
    @State private var searchText = ""
    @State var showAISearch = false
    @State private var showSortSheet = false
    @State private var showFilterSheet = false
    @State var selectedActorName: String?

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
            .navigationDestination(item: $selectedActorName) { actorName in
                TVActorDetailView(actorName: actorName)
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
            TVRecentSearchesView(
                recentSearches: vm.recentSearches,
                onSelect: { searchText = $0; vm.selectSuggestion($0) },
                onClear: { vm.clearRecentSearches() }
            )
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
}
