import BayitDesignSystem
import SwiftUI

/// Search screen with real-time search and results grid
struct SearchView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: SearchViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
    ]

    var body: some View {
        VStack(spacing: 0) {
            searchBar

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
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = SearchViewModel(repository: repos.content)
            }
        }
    }

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

    private func resultsGrid(_ results: [SearchResult]) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(results) { result in
                ZStack(alignment: .topTrailing) {
                    GlassContentCard(
                        thumbnailURL: result.thumbnail,
                        title: result.title,
                        subtitle: resultSubtitle(result),
                        badge: result.type,
                        subtitleFlags: result.availableSubtitleLanguages?.map { SubtitleLanguages.flag(for: $0) },
                        aspectRatio: 2 / 3,
                        width: .infinity
                    ) {
                        navigateToResult(result)
                    }

                    if let languages = result.availableSubtitleLanguages, !languages.isEmpty {
                        SubtitleFlagsPill(
                            languages: languages,
                            aiLanguages: aiLanguages(for: result),
                            size: .small
                        )
                        .padding(DesignTokens.Spacing.xs)
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }

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

    private var searchPrompt: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 64))
                .foregroundColor(DesignTokens.Text.muted.opacity(0.4))
                .accessibilityHidden(true)

            Text("Search for content")
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundColor(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 100)
        .accessibilityElement(children: .combine)
    }

    private func resultSubtitle(_ result: SearchResult) -> String? {
        var parts: [String] = []
        if let year = result.year { parts.append(String(year)) }
        if let duration = result.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private func aiLanguages(for result: SearchResult) -> Set<String> {
        var aiLangs = Set<String>()
        if result.availableSubtitleLanguages?.contains("he") == true {
            aiLangs.insert("he")
        }
        if result.availableSubtitleLanguages?.contains("en") == true {
            aiLangs.insert("en")
        }
        return aiLangs
    }

    private func navigateToResult(_ result: SearchResult) {
        if result.type == "series" {
            coordinator.navigate(to: .seriesDetail(seriesId: result.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: result.id))
        }
    }
}
