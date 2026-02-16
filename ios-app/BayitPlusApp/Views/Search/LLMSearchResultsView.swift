import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Results list for LLM search showing content items with thumbnails,
/// metadata, and navigation. Extracted from LLMSearchView for file size compliance.
struct LLMSearchResultsView: View {
    @Environment(LocalizationManager.self) private var localization
    let results: [ContentItem]
    let hasSearched: Bool
    let isSearching: Bool
    let error: String?
    let onNavigate: (ContentItem) -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if hasSearched && results.isEmpty && !isSearching {
                emptyResults
            } else if !results.isEmpty {
                resultsList
            }

            if let error {
                GlassAlert(
                    type: .error,
                    title: localization.t("search.searchFailed"),
                    message: error
                )
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    // MARK: - Results List

    private var resultsList: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("\(results.count) \(localization.t("search.resultsFor"))")
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.muted)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            ForEach(results) { item in
                resultRow(item)
            }
        }
    }

    private func resultRow(_ item: ContentItem) -> some View {
        Button {
            onNavigate(item)
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                GlassContentCard(
                    thumbnailURL: item.thumbnail,
                    title: nil,
                    subtitle: nil,
                    aspectRatio: 16 / 9,
                    width: 120,
                    onTap: {}
                )

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(item.title ?? "")
                        .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let category = item.category {
                        Text(category)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }

                    if let year = item.year {
                        Text(String(year))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .accessibilityLabel(item.title ?? "Content item")
    }

    // MARK: - Empty State

    private var emptyResults: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Text.muted)
                .accessibilityHidden(true)

            Text(localization.t("search.noResults"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)

            Text(localization.t("search.tryDifferent"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, DesignTokens.Spacing.xxxl)
        .accessibilityElement(children: .combine)
    }
}
