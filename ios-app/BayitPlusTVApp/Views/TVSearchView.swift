import BayitDesignSystem
import BayitMedia
import SwiftUI

/// tvOS Search screen with system keyboard and results grid.
/// Reuses SearchViewModel from shared ViewModels.
struct TVSearchView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
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
                    if vm.isSearching {
                        searchingState
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
                    viewModel = SearchViewModel(searchRepository: repos.search)
                }
            }
            .sheet(isPresented: $showAISearch) {
                TVLLMSearchView()
            }
        }
    }

    private func resultsGrid(_ results: [UnifiedSearchResult]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("\(results.count) Results")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(results) { result in
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
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    private var searchingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text("Searching...")
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

            Text("No results found")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)

            Text("Try a different search term")
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

            Text("Search for content")
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
