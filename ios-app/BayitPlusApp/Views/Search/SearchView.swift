import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Search screen with unified search, content type filter pills, sort/filter controls,
/// trending/recent suggestions, rich results grid, and pagination.
struct SearchView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(FeatureFlags.self) private var featureFlags
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: SearchViewModel?

    var body: some View {
        VStack(spacing: 0) {
            PageHeader(icon: "magnifyingglass", title: localization.t("search.title"))
                .walkthroughTarget(id: "discover_llm_search_step1")
            if let vm = viewModel {
                searchBar(vm)
                filterPills(vm)
                searchToolbar(vm)
            }
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel { searchContent(vm) }
                else { ScreenLoadingView() }
            }
            .walkthroughTarget(id: "discover_llm_search_step3")
        }
        .background(DesignTokens.Background.primary)
        .walkthroughOverlay(featureId: "llm_search", localize: localization.t)
        .task {
            if viewModel == nil {
                let vm = SearchViewModel(searchRepository: repos.search, featureFlags: featureFlags)
                viewModel = vm
                await vm.loadInitialData()
            }
        }
        .sheet(isPresented: sheetBinding(\.showSortSheet)) {
            if let vm = viewModel {
                SortOptionsSheet(
                    selectedSort: Binding(get: { vm.sortOption }, set: { vm.sortOption = $0 }),
                    onDismiss: { vm.showSortSheet = false; vm.onSortChanged() }
                )
            }
        }
        .sheet(isPresented: sheetBinding(\.showFilterSheet)) {
            if let vm = viewModel {
                SearchFilterSheet(
                    filters: Binding(get: { vm.advancedFilters }, set: { vm.advancedFilters = $0 }),
                    onApply: { vm.showFilterSheet = false; vm.onFiltersApplied() },
                    onDismiss: { vm.showFilterSheet = false }
                )
            }
        }
    }

    private func sheetBinding(_ keyPath: ReferenceWritableKeyPath<SearchViewModel, Bool>) -> Binding<Bool> {
        Binding(get: { viewModel?[keyPath: keyPath] ?? false },
                set: { viewModel?[keyPath: keyPath] = $0 })
    }

    // MARK: - Search Bar

    private func searchBar(_ vm: SearchViewModel) -> some View {
        GlassSearchBar(
            text: Binding(get: { vm.query }, set: { vm.query = $0; vm.onQueryChanged() }),
            placeholder: localization.t("search.placeholder"),
            showVoiceButton: true,
            onVoiceTap: { coordinator.navigate(to: .voiceOnboarding) }
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
        .walkthroughTarget(id: "discover_llm_search_step2")
    }

    // MARK: - Filter Pills

    private func filterPills(_ vm: SearchViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(SearchContentTypeFilter.allCases, id: \.self) { filter in
                    GlassChip(
                        title: localization.t(filter.localizationKey),
                        isSelected: vm.selectedFilter == filter
                    ) { vm.onFilterChanged(filter) }
                        .accessibilityAddTraits(vm.selectedFilter == filter ? .isSelected : [])
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    // MARK: - Toolbar (Sort + Filter)

    private func searchToolbar(_ vm: SearchViewModel) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Button { vm.showSortSheet = true } label: {
                Label(localization.t(vm.sortOption.localizationKey), systemImage: "arrow.up.arrow.down")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(vm.sortOption != .relevance ? DesignTokens.Primary.default : DesignTokens.Text.secondary)
            }
            Spacer()
            Button { vm.showFilterSheet = true } label: {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "line.3.horizontal.decrease")
                    if vm.advancedFilters.activeCount > 0 {
                        Text("\(vm.advancedFilters.activeCount)")
                            .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: DesignTokens.Spacing.lg, height: DesignTokens.Spacing.lg)
                            .background(DesignTokens.Primary.default)
                            .clipShape(Circle())
                    }
                }
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(vm.advancedFilters.isEmpty ? DesignTokens.Text.secondary : DesignTokens.Primary.default)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.xs)
    }

    // MARK: - Content States

    @ViewBuilder
    private func searchContent(_ vm: SearchViewModel) -> some View {
        if !vm.autocompleteSuggestions.isEmpty {
            SearchAutocompleteSuggestions(suggestions: vm.autocompleteSuggestions) { vm.selectSuggestion($0) }
        }
        if let errorMessage = vm.error {
            ErrorStateView(message: errorMessage, onRetry: { vm.retrySearch() })
        } else if vm.isSearching {
            VStack(spacing: DesignTokens.Spacing.lg) {
                ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.2)
                Text(localization.t("search.searching"))
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity).padding(.top, 80)
        } else if vm.query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !vm.hasSearched {
            SearchSuggestionsView(
                trendingSearches: vm.trendingSearches, recentSearches: vm.recentSearches,
                onSelect: { vm.selectSuggestion($0) }, onClearRecent: { vm.clearRecentSearches() }
            )
        } else if !vm.results.isEmpty {
            Text("\(vm.totalResults) \(localization.t("search.resultsFor"))")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.top, DesignTokens.Spacing.sm)
            SearchResultsGridView(results: vm.results) { coordinator.navigate(to: $0) }
            if vm.hasMore {
                if vm.isLoadingMore { ProgressView().tint(DesignTokens.Primary.default).padding() }
                else { Color.clear.frame(height: 1).onAppear { vm.loadMore() } }
            }
        } else if vm.hasSearched {
            emptyState(vm)
        }
    }

    private func emptyState(_ vm: SearchViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48)).foregroundColor(DesignTokens.Text.muted)
                .accessibilityHidden(true)
            Text(localization.t("search.noResults"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundColor(DesignTokens.Text.secondary)
            Text(localization.t("search.tryDifferent"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.muted)
            if !vm.advancedFilters.isEmpty || vm.selectedFilter != .all {
                GlassButton(localization.t("search.clearFilters"), variant: .secondary, size: .medium) {
                    vm.clearFilters()
                }
            }
        }
        .frame(maxWidth: .infinity).padding(.top, 80)
        .accessibilityElement(children: .combine)
    }
}
