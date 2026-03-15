import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Grid of search results with subtitle flag overlays and infinite scroll for tvOS.
struct TVSearchResultsGridView: View {
    @Environment(LocalizationManager.self) private var localization
    let results: [UnifiedSearchResult]
    let totalResults: Int
    let query: String
    let hasMore: Bool
    let isLoadingMore: Bool
    let onLoadMore: () -> Void
    let onSelect: (UnifiedSearchResult) -> Void

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
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
                ForEach(Array(results.enumerated()), id: \.element.id) { index, result in
                    resultPoster(result)
                        .onAppear {
                            if index == results.count - 1, hasMore {
                                onLoadMore()
                            }
                        }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)

            if isLoadingMore {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .scaleEffect(1.2)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
        }
        .padding(.top, TVDesignTokens.Spacing.lg)
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
        if let duration = result.duration?.value { parts.append(duration) }
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
