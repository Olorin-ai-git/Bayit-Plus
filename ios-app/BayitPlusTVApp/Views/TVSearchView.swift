import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS Search screen with system keyboard, filter pills, trending/recent
/// suggestions, and subtitle flag overlays on results.
/// Reuses SearchViewModel from shared ViewModels.
struct TVSearchView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: SearchViewModel?
    @State private var searchText = ""
    @State private var showAISearch = false

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    TVSearchFilterPillsView(
                        selectedFilter: Binding(
                            get: { vm.selectedFilter },
                            set: { _ in }
                        ),
                        onFilterChanged: { vm.onFilterChanged($0) }
                    )

                    if vm.isSearching {
                        searchingState
                    } else if showSuggestions(vm) {
                        TVSearchSuggestionsView(
                            trendingSearches: vm.trendingSearches,
                            recentSearches: vm.recentSearches,
                            onSelect: { suggestion in
                                searchText = suggestion
                                vm.selectSuggestion(suggestion)
                            },
                            onClearRecent: { vm.clearRecentSearches() }
                        )
                    } else if vm.hasSearched && vm.results.isEmpty {
                        emptyState
                    } else if !vm.results.isEmpty {
                        resultsGrid(vm.results)
                    } else {
                        searchPrompt
                    }
                }
            }
            .background(DesignTokens.Background.primary)
            .searchable(
                text: $searchText,
                prompt: "Search movies, series, podcasts..."
            )
            .onChange(of: searchText) { _, newValue in
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
            .sheet(isPresented: $showAISearch) {
                TVLLMSearchView()
            }
        }
    }

    // MARK: - Helpers

    private func showSuggestions(_ vm: SearchViewModel) -> Bool {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !vm.hasSearched
            && (!vm.trendingSearches.isEmpty || !vm.recentSearches.isEmpty)
    }

    private func aiLanguages(for result: UnifiedSearchResult) -> Set<String> {
        var langs = Set<String>()
        if result.availableSubtitleLanguages?.contains("he") == true {
            langs.insert("he")
        }
        if result.availableSubtitleLanguages?.contains("en") == true {
            langs.insert("en")
        }
        return langs
    }

    // MARK: - Results

    private func resultsGrid(_ results: [UnifiedSearchResult]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("\(results.count) \(localization.t("search.resultsFor"))")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(results) { result in
                    ZStack(alignment: .topTrailing) {
                        GlassFocusPoster(
                            thumbnailURL: result.thumbnail,
                            title: result.title ?? "Untitled",
                            subtitle: resultSubtitle(result),
                            badge: result.contentType,
                            aspectRatio: 2 / 3,
                            onSelect: {
                                coordinator.presentPlayer(
                                    contentId: result.id,
                                    contentType: TVContentTypeMapper.map(result.contentType)
                                )
                            }
                        )

                        if let languages = result.availableSubtitleLanguages,
                           !languages.isEmpty
                        {
                            SubtitleFlagsPill(
                                languages: languages,
                                aiLanguages: aiLanguages(for: result),
                                size: .large
                            )
                            .padding(TVDesignTokens.Spacing.sm)
                        }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    // MARK: - States

    private var searchingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("search.searching"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    private var emptyState: some View {
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
                "AI Search",
                variant: .secondary,
                size: .medium,
                icon: Image(systemName: "sparkles")
            ) {
                showAISearch = true
            }
            .tvFocusStyle()
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    private func resultSubtitle(_ result: UnifiedSearchResult) -> String? {
        var parts: [String] = []
        if let year = result.year { parts.append(String(year)) }
        if let duration = result.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }
}
