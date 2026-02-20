import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS AI-powered natural language search with text input,
/// example queries, AI interpretation display, and results grid.
struct TVLLMSearchView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: LLMSearchViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                headerSection
                queryInput
                suggestionsSection
                interpretationSection

                if let vm = viewModel {
                    TVLLMSearchResultsView(
                        results: vm.results,
                        hasSearched: vm.hasSearched,
                        isSearching: vm.isSearching,
                        error: vm.error,
                        onNavigate: { navigateToItem($0) }
                    )
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.xxl)
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = LLMSearchViewModel(repository: repos.llmSearch)
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "sparkles")
                .font(.system(size: TVDesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Primary.p400)
                .accessibilityHidden(true)

            Text(localization.t("tvos.aiSearch.title"))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("tvos.aiSearch.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    // MARK: - Query Input

    @ViewBuilder
    private var queryInput: some View {
        if let vm = viewModel {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                TextField(
                    localization.t("tvos.aiSearch.placeholder"),
                    text: Binding(
                        get: { vm.query },
                        set: { newValue in
                            vm.query = newValue
                            vm.onQueryChanged()
                        }
                    )
                )
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .submitLabel(.search)
                .onSubmit { Task { await vm.search(language: nil) } }

                GlassButton(
                    localization.t("search.search"),
                    variant: .primary,
                    size: .medium,
                    isDisabled: vm.query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                    isLoading: vm.isSearching,
                    icon: Image(systemName: "magnifyingglass")
                ) {
                    Task { await vm.search(language: nil) }
                }
                .tvFocusStyle()

                if !vm.hasSearched {
                    exampleQueries
                }
            }
        }
    }

    // MARK: - Example Queries

    private var exampleQueries: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("tvos.aiSearch.trySuggestion"))
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.muted)

            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(sampleQueries, id: \.self) { query in
                    Button {
                        viewModel?.query = query
                        Task { await viewModel?.search(language: nil) }
                    } label: {
                        Text(query)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .padding(.horizontal, TVDesignTokens.Spacing.lg)
                            .padding(.vertical, TVDesignTokens.Spacing.md)
                            .background(DesignTokens.Glass.bgLight)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .tvFocusStyle()
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(localization.t("search.exampleQueries"))
    }

    // MARK: - Suggestions

    @ViewBuilder
    private var suggestionsSection: some View {
        if let vm = viewModel, !vm.suggestions.isEmpty, !vm.hasSearched {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                ForEach(vm.suggestions, id: \.self) { suggestion in
                    Button {
                        vm.query = suggestion
                        Task { await vm.search(language: nil) }
                    } label: {
                        HStack(spacing: TVDesignTokens.Spacing.lg) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)

                            Text(suggestion)
                                .font(.system(size: TVDesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.secondary)

                            Spacer()

                            Image(systemName: "arrow.up.left")
                                .font(.system(size: TVDesignTokens.FontSize.xs))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                        .padding(.vertical, TVDesignTokens.Spacing.md)
                        .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    }
                    .buttonStyle(.plain)
                    .tvFocusStyle()
                    .accessibilityLabel("Suggestion: \(suggestion)")
                }
            }
        }
    }

    // MARK: - Interpretation

    @ViewBuilder
    private var interpretationSection: some View {
        if let vm = viewModel, let interpretation = vm.interpretation {
            TVLLMSearchInterpretationView(interpretation: interpretation)
        }
    }

    // MARK: - Helpers

    private var sampleQueries: [String] {
        [
            localization.t("search.exampleQuery1"),
            localization.t("search.exampleQuery2"),
            localization.t("search.exampleQuery3"),
            localization.t("search.exampleQuery4"),
        ]
    }

    private func navigateToItem(_ item: ContentItem) {
        let itemType = item.type?.lowercased() ?? ""
        switch itemType {
        case "podcast":
            coordinator.fullscreenRoute = .podcastDetail(showId: item.id)
        case "live":
            coordinator.presentPlayer(contentId: item.id, contentType: .liveTV)
        case "radio":
            coordinator.presentPlayer(contentId: item.id, contentType: .radio)
        default:
            if item.isSeries == true {
                coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
            } else {
                coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
            }
        }
    }
}
