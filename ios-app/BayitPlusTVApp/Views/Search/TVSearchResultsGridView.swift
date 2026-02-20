import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Grid of search results with subtitle flag overlays and pagination trigger for tvOS.
struct TVSearchResultsGridView: View {
    @Environment(LocalizationManager.self) private var localization
    let results: [UnifiedSearchResult]
    let totalResults: Int
    let hasMore: Bool
    let isLoadingMore: Bool
    let onLoadMore: () -> Void
    let onSelect: (UnifiedSearchResult) -> Void

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("\(totalResults) \(localization.t("search.resultsFor"))")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(results) { result in
                    resultPoster(result)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)

            if hasMore {
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
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    private func resultPoster(_ result: UnifiedSearchResult) -> some View {
        ZStack(alignment: .topTrailing) {
            GlassFocusPoster(
                thumbnailURL: result.thumbnail,
                title: result.title ?? "Untitled",
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

    private func resultSubtitle(_ result: UnifiedSearchResult) -> String? {
        var parts: [String] = []
        if let year = result.year { parts.append(String(year)) }
        if let duration = result.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private func aiLanguages(for result: UnifiedSearchResult) -> Set<String> {
        var langs = Set<String>()
        if result.availableSubtitleLanguages?.contains("he") == true { langs.insert("he") }
        if result.availableSubtitleLanguages?.contains("en") == true { langs.insert("en") }
        return langs
    }
}
