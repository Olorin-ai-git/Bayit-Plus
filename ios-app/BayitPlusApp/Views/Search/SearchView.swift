import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Search screen with unified search, content type filter pills,
/// trending/recent suggestions, and rich results grid.
struct SearchView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(FeatureFlags.self) private var featureFlags
    @Environment(LocalizationManager.self) private var localization
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
                let vm = SearchViewModel(
                    searchRepository: repos.search,
                    featureFlags: featureFlags
                )
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
                    placeholder: localization.t("search.placeholder"),
                    showVoiceButton: true,
                    onVoiceTap: {
                        coordinator.navigate(to: .voiceOnboarding)
                    }
                )
            }
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
                        title: localization.t(filter.localizationKey),
                        isSelected: vm.selectedFilter == filter
                    ) {
                        vm.onFilterChanged(filter)
                    }
                    .accessibilityLabel("\(localization.t(filter.localizationKey)) filter")
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
        // Autocomplete suggestions while typing
        if !vm.autocompleteSuggestions.isEmpty {
            autocompleteSuggestionsView(vm)
        }

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

    private func autocompleteSuggestionsView(_ vm: SearchViewModel) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(vm.autocompleteSuggestions, id: \.self) { suggestion in
                Button {
                    vm.selectSuggestion(suggestion)
                } label: {
                    HStack(spacing: DesignTokens.Spacing.md) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.muted)

                        Text(suggestion)
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundColor(DesignTokens.Text.primary)
                            .lineLimit(1)

                        Spacer()

                        Image(systemName: "arrow.up.left")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .padding(.vertical, DesignTokens.Spacing.md)
                }
                .buttonStyle(.plain)
            }
        }
        .background(DesignTokens.Glass.bg)
    }

    private func resultsHeader(_ vm: SearchViewModel) -> some View {
        Text("\(vm.totalResults) \(localization.t("search.resultsFor"))")
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundColor(DesignTokens.Text.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.top, DesignTokens.Spacing.sm)
            .accessibilityLabel("\(vm.totalResults) \(localization.t("search.resultsFor"))")
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

            Text(localization.t("search.searching"))
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

            Text(localization.t("search.noResults"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundColor(DesignTokens.Text.secondary)

            Text(localization.t("search.tryDifferent"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 80)
        .accessibilityElement(children: .combine)
    }
}
