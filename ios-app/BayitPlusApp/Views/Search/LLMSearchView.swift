import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Sheet modal for AI-powered natural language search with text input,
/// example queries, AI interpretation display, confidence meter, and results.
struct LLMSearchView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: LLMSearchViewModel?

    var body: some View {
        VStack(spacing: 0) {
            headerBar
            Divider().background(DesignTokens.Glass.border)

            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    queryInput
                    suggestionsSection
                    interpretationSection

                    if let vm = viewModel {
                        LLMSearchResultsView(
                            results: vm.results,
                            hasSearched: vm.hasSearched,
                            isSearching: vm.isSearching,
                            error: vm.error,
                            onNavigate: { navigateToItem($0) }
                        )
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = LLMSearchViewModel(repository: repos.llmSearch)
            }
        }
    }

    // MARK: - Header

    private var headerBar: some View {
        HStack {
            Text(localization.t("tvos.aiSearch.title"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Button {
                coordinator.pop()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel(localization.t("common.close"))
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    // MARK: - Query Input

    @ViewBuilder
    private var queryInput: some View {
        if let vm = viewModel {
            VStack(spacing: DesignTokens.Spacing.md) {
                GlassTextField(
                    localization.t("tvos.aiSearch.placeholder"),
                    text: Binding(
                        get: { vm.query },
                        set: { newValue in
                            vm.query = newValue
                            vm.onQueryChanged()
                        }
                    ),
                    icon: Image(systemName: "sparkles")
                )
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .accessibilityLabel(localization.t("search.query"))
                .accessibilityHint(localization.t("tvos.aiSearch.hint"))

                GlassButton(
                    localization.t("search.search"),
                    variant: .primary,
                    size: .medium,
                    isDisabled: vm.query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                    isLoading: vm.isSearching,
                    icon: Image(systemName: "magnifyingglass")
                ) {
                    let generator = UIImpactFeedbackGenerator(style: .medium)
                    generator.impactOccurred()
                    Task { await vm.search(language: nil) }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)

                if !vm.hasSearched {
                    exampleQueries
                }
            }
        }
    }

    // MARK: - Example Queries

    private var exampleQueries: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("tvos.aiSearch.trySuggestion"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.muted)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(sampleQueries, id: \.self) { query in
                        GlassChip(title: query) {
                            viewModel?.query = query
                            let generator = UIImpactFeedbackGenerator(style: .light)
                            generator.impactOccurred()
                            Task { await viewModel?.search(language: nil) }
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(localization.t("search.exampleQueries"))
    }

    // MARK: - Suggestions

    @ViewBuilder
    private var suggestionsSection: some View {
        if let vm = viewModel, !vm.suggestions.isEmpty, !vm.hasSearched {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                ForEach(vm.suggestions, id: \.self) { suggestion in
                    Button {
                        vm.query = suggestion
                        Task { await vm.search(language: nil) }
                    } label: {
                        HStack(spacing: DesignTokens.Spacing.sm) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)

                            Text(suggestion)
                                .font(.system(size: DesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.secondary)

                            Spacer()

                            Image(systemName: "arrow.up.left")
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                        .padding(.vertical, DesignTokens.Spacing.sm)
                        .padding(.horizontal, DesignTokens.Spacing.lg)
                    }
                    .accessibilityLabel("Suggestion: \(suggestion)")
                }
            }
        }
    }

    // MARK: - Interpretation

    @ViewBuilder
    private var interpretationSection: some View {
        if let vm = viewModel, let interpretation = vm.interpretation {
            LLMSearchInterpretationView(interpretation: interpretation)
                .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }
}
