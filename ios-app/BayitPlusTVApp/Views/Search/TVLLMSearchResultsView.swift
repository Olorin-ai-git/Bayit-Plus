import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Results list for LLM search showing content items with poster thumbnails
/// and metadata. tvOS version using GlassFocusPoster for 10-foot UI.
struct TVLLMSearchResultsView: View {
    @Environment(LocalizationManager.self) private var localization
    let results: [ContentItem]
    let hasSearched: Bool
    let isSearching: Bool
    let error: String?
    let onNavigate: (ContentItem) -> Void

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            if hasSearched && results.isEmpty && !isSearching {
                emptyResults
            } else if !results.isEmpty {
                resultsList
            }

            if let error {
                errorBanner(error)
            }
        }
    }

    // MARK: - Results List

    private var resultsList: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("\(results.count) \(localization.t("search.resultsFor"))")
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                .foregroundStyle(DesignTokens.Text.muted)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(results) { item in
                    GlassFocusPoster(
                        thumbnailURL: item.thumbnail,
                        title: item.title ?? "Untitled",
                        subtitle: resultSubtitle(item),
                        badge: item.type,
                        aspectRatio: 2 / 3,
                        onSelect: { onNavigate(item) }
                    )
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    // MARK: - Empty State

    private var emptyResults: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)
                .accessibilityHidden(true)

            Text(localization.t("search.noResults"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)

            Text(localization.t("search.tryDifferent"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
        .accessibilityElement(children: .combine)
    }

    // MARK: - Error

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.ErrorColor.default)

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(localization.t("errors.loadingFailed"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Spacer()
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.ErrorColor.default.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    // MARK: - Helpers

    private func resultSubtitle(_ item: ContentItem) -> String? {
        var parts: [String] = []
        if let category = item.category { parts.append(category) }
        if let year = item.year { parts.append(String(year)) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }
}
