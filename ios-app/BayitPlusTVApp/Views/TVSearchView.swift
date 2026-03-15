import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS Search screen — clean redesign with dark gradient background,
/// category pills, trending poster row, recent search chips, and results grid.
/// Replaces the previous cluttered layout with a focused, cinematic experience.
struct TVSearchView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: SearchViewModel?
    @State private var searchText = ""
    @State var showAISearch = false

    private var isActiveSearch: Bool {
        !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        NavigationStack {
            ZStack {
                searchBackground
                    .ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    if let vm = viewModel {
                        VStack(alignment: .leading, spacing: 0) {
                            TVSearchFilterPillsView(
                                selectedFilter: vm.selectedFilter,
                                onFilterChanged: { vm.onFilterChanged($0) }
                            )
                            .padding(.top, TVDesignTokens.Spacing.lg)

                            if isActiveSearch {
                                activeSearchSections(vm)
                            } else {
                                idleSections(vm)
                            }
                        }
                        .padding(.bottom, TVDesignTokens.Spacing.xxxl)
                    }
                }
            }
            .searchable(text: $searchText, prompt: localization.t("tvos.search.placeholder"))
            .onChange(of: searchText) { _, newValue in
                guard viewModel?.query != newValue else { return }
                viewModel?.query = newValue
                viewModel?.onQueryChanged()
            }
            .task {
                guard viewModel == nil else { return }
                viewModel = SearchViewModel(
                    searchRepository: repos.search,
                    featureFlags: FeatureFlags(),
                    recentSearchesService: RecentSearchesService()
                )
                await viewModel?.loadInitialData()
            }
            .sheet(isPresented: $showAISearch) { TVLLMSearchView() }
        }
    }

    // MARK: - Background

    private var searchBackground: some View {
        LinearGradient(
            stops: [
                .init(color: Color(hex: 0x0C0A1A), location: 0.00),
                .init(color: Color(hex: 0x1A1040), location: 0.30),
                .init(color: Color(hex: 0x0F0D2A), location: 0.60),
                .init(color: Color(hex: 0x0A0818), location: 1.00),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Idle (no active search)

    @ViewBuilder
    private func idleSections(_ vm: SearchViewModel) -> some View {
        // Actors are excluded from idle shelves — they're irrelevant without a query context
        let shelfItems = vm.results.filter { $0.contentType?.lowercased() != "actor" }

        if vm.isSearching {
            searchingState
                .padding(.top, TVDesignTokens.Spacing.xxxxl)
        } else if !shelfItems.isEmpty {
            // Trending Now — landscape cards (first 4, featured first)
            TVSearchTrendingRow(
                items: Array(shelfItems.prefix(4)),
                onSelect: { handleResultSelection($0) }
            )
            .padding(.top, TVDesignTokens.Spacing.xxl)
        }

        // Recent Searches — inline wrapping chips, no section header hierarchy
        if !vm.recentSearches.isEmpty {
            recentSearchesSection(vm)
                .padding(.top, TVDesignTokens.Spacing.xl)
        }

        // Popular — portrait card shelf (items 5–10)
        if shelfItems.count > 4 {
            TVSearchPopularRow(
                items: Array(shelfItems.dropFirst(4).prefix(6)),
                onSelect: { handleResultSelection($0) }
            )
            .padding(.top, TVDesignTokens.Spacing.xxl)
        }
    }

    // MARK: - Active search

    @ViewBuilder
    private func activeSearchSections(_ vm: SearchViewModel) -> some View {
        if !vm.autocompleteSuggestions.isEmpty {
            TVSearchAutocompleteSuggestions(suggestions: vm.autocompleteSuggestions) {
                searchText = $0
                vm.selectSuggestion($0)
            }
            .padding(.top, TVDesignTokens.Spacing.lg)
        }

        Group {
            if let errorMessage = vm.error {
                errorState(errorMessage, onRetry: { vm.retrySearch() })
            } else if vm.isSearching {
                searchingState
            } else if vm.hasSearched && vm.results.isEmpty {
                emptyState(vm)
            } else if !vm.results.isEmpty {
                TVSearchResultsGridView(
                    results: vm.results,
                    totalResults: vm.totalResults,
                    query: searchText,
                    currentPage: vm.currentPage,
                    totalPages: vm.totalPages,
                    isLoadingMore: vm.isLoadingMore,
                    onGoToPage: { vm.goToPage($0) },
                    onSelect: { handleResultSelection($0) }
                )
            } else {
                searchPrompt
            }
        }
        .padding(.top, TVDesignTokens.Spacing.xxl)
    }

    // MARK: - Recent searches section

    // Figma: inline label + chips with border-white/20, no Clear button
    // tvOS: horizontal scroll (directional focus requires linear layout)
    private func recentSearchesSection(_ vm: SearchViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("search.recentSearches"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(.white.opacity(0.60))

                ForEach(vm.recentSearches, id: \.self) { query in
                    Button {
                        searchText = query
                        vm.selectSuggestion(query)
                    } label: {
                        Text(query)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(.white.opacity(0.70))
                            .padding(.horizontal, TVDesignTokens.Spacing.base)
                            .padding(.vertical, TVDesignTokens.Spacing.xs)
                            .overlay(Capsule().stroke(.white.opacity(0.20), lineWidth: 1.5))
                            .clipShape(Capsule())
                    }
                    .tvCardStyle()
                    .accessibilityLabel(query)
                }
            }
            .padding(.vertical, TVDesignTokens.Spacing.xs)
        }
        .focusSection()
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }
}
