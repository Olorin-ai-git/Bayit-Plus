import BayitDesignSystem
import SwiftUI

/// Search screen with unified search, content type filter pills,
/// trending/recent suggestions, and rich results grid.
struct SearchView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: SearchViewModel?

    var body: some View {
        VStack(spacing: 0) {
            searchBar
            if let vm = viewModel {
                filterPills(vm)
            }

            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    searchContent(vm)
                } else {
                    ScreenLoadingView()
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                let vm = SearchViewModel(searchRepository: repos.search)
                viewModel = vm
                await vm.loadInitialData()
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            if let vm = viewModel {
                GlassSearchBar(
                    text: Binding(
                        get: { vm.query },
                        set: { newValue in
                            vm.query = newValue
                            vm.onQueryChanged()
                        }
                    ),
                    placeholder: "Search movies, series, podcasts...",
                    showVoiceButton: true,
                    onVoiceTap: {
                        coordinator.navigate(to: .voiceOnboarding)
                    }
                )
            }

            Button("Cancel") {
                coordinator.dismissFullscreen()
            }
            .font(.system(size: DesignTokens.FontSize.md))
            .foregroundColor(DesignTokens.Primary.default)
            .accessibilityLabel("Cancel search")
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    // MARK: - Filter Pills

    private func filterPills(_ vm: SearchViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(SearchContentTypeFilter.allCases, id: \.self) { filter in
                    GlassChip(
                        title: filter.displayLabel,
                        isSelected: vm.selectedFilter == filter
                    ) {
                        vm.onFilterChanged(filter)
                    }
                    .accessibilityLabel("\(filter.displayLabel) filter")
                    .accessibilityAddTraits(vm.selectedFilter == filter ? .isSelected : [])
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .padding(.bottom, DesignTokens.Spacing.sm)
    }

    // MARK: - Content States

    @ViewBuilder
    private func searchContent(_ vm: SearchViewModel) -> some View {
        if vm.isSearching {
            searchingState
        } else if showSuggestions(vm) {
            SearchSuggestionsView(
                trendingSearches: vm.trendingSearches,
                recentSearches: vm.recentSearches,
                onSelect: { vm.selectSuggestion($0) },
                onClearRecent: { vm.clearRecentSearches() }
            )
        } else if !vm.results.isEmpty {
            resultsHeader(vm)
            SearchResultsGridView(results: vm.results) { route in
                coordinator.navigate(to: route)
            }
        } else if vm.hasSearched {
            emptyState
        }
    }

    private func resultsHeader(_ vm: SearchViewModel) -> some View {
        Text("\(vm.totalResults) results")
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundColor(DesignTokens.Text.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.top, DesignTokens.Spacing.sm)
            .accessibilityLabel("\(vm.totalResults) results found")
    }

    private func showSuggestions(_ vm: SearchViewModel) -> Bool {
        let trimmed = vm.query.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty && !vm.hasSearched
    }

    // MARK: - States

    private var searchingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.2)

            Text("Searching...")
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 80)
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Text.muted)
                .accessibilityHidden(true)

            Text("No results found")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundColor(DesignTokens.Text.secondary)

            Text("Try a different search term")
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 80)
        .accessibilityElement(children: .combine)
    }
}
