import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Grid of search results with subtitle flag overlays and page navigation for tvOS.
struct TVSearchResultsGridView: View {
    @Environment(LocalizationManager.self) private var localization
    let results: [UnifiedSearchResult]
    let totalResults: Int
    let query: String
    let currentPage: Int
    let totalPages: Int
    let hasMore: Bool
    let isLoadingMore: Bool
    let onLoadMore: () -> Void
    let onGoToPage: (Int) -> Void
    let onSelect: (UnifiedSearchResult) -> Void

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(resultsHeaderText)
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(results) { result in
                    resultPoster(result)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)

            if totalPages > 1 {
                paginationControls
            } else if hasMore {
                loadMoreTrigger
            }
        }
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    // MARK: - Pagination

    private var paginationControls: some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()

            GlassButton(
                localization.t("search.previousPage"),
                variant: .secondary,
                size: .medium,
                isDisabled: currentPage <= 1 || isLoadingMore,
                icon: Image(systemName: "chevron.left")
            ) {
                onGoToPage(currentPage - 1)
            }
            .tvFocusStyle()

            Text(localization.t("search.pageIndicator", [
                "current": String(currentPage), "total": String(totalPages),
            ]))
            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
            .foregroundStyle(DesignTokens.Text.secondary)
            .frame(minWidth: 120)

            GlassButton(
                localization.t("search.nextPage"),
                variant: .secondary,
                size: .medium,
                isDisabled: currentPage >= totalPages || isLoadingMore,
                icon: Image(systemName: "chevron.right")
            ) {
                onGoToPage(currentPage + 1)
            }
            .tvFocusStyle()

            Spacer()
        }
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private var loadMoreTrigger: some View {
        Group {
            if isLoadingMore {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(maxWidth: .infinity)
                    .padding(TVDesignTokens.Spacing.xl)
            } else {
                Color.clear.frame(height: 1).onAppear { onLoadMore() }
            }
        }
    }

    // MARK: - Result Card

    private func resultPoster(_ result: UnifiedSearchResult) -> some View {
        ZStack(alignment: .topTrailing) {
            GlassFocusPoster(
                thumbnailURL: result.thumbnail,
                title: result.title ?? localization.t("common.untitled"),
                subtitle: resultSubtitle(result),
                badge: result.contentType,
                aspectRatio: 2 / 3,
                onSelect: { onSelect(result) }
            )
            if let languages = result.availableSubtitleLanguages, !languages.isEmpty {
                SubtitleFlagsPill(
                    languages: languages,
                    aiLanguages: aiLanguages(for: result),
                    size: .large
                )
                .padding(TVDesignTokens.Spacing.sm)
            }
        }
    }

    // MARK: - Helpers

    private var resultsHeaderText: String {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return "\(totalResults) \(localization.t("search.results"))"
        }
        return "\(totalResults) \(localization.t("search.resultsFor")) \"\(trimmed)\""
    }

    private func resultSubtitle(_ result: UnifiedSearchResult) -> String? {
        var parts: [String] = []
        if let year = result.year { parts.append(String(year)) }
        if let duration = result.duration { parts.append(duration) }
        if let genres = result.genres, let firstGenre = genres.first {
            parts.append(firstGenre)
        }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private func aiLanguages(for result: UnifiedSearchResult) -> Set<String> {
        var langs = Set<String>()
        if result.availableSubtitleLanguages?.contains("he") == true { langs.insert("he") }
        if result.availableSubtitleLanguages?.contains("en") == true { langs.insert("en") }
        return langs
    }
}
