import BayitDesignSystem
import SwiftUI

/// Grid view displaying search results with navigation handling.
struct SearchResultsGridView: View {
    let results: [UnifiedSearchResult]
    let onNavigate: (Route) -> Void

    private let columnCount: CGFloat = 3

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
    ]

    /// Concrete card width computed from screen bounds, horizontal padding, and column spacing
    private var cardWidth: CGFloat {
        let screenWidth = UIScreen.main.bounds.width
        let horizontalPadding = DesignTokens.Spacing.lg * 2
        let totalSpacing = DesignTokens.Spacing.md * (columnCount - 1)
        return floor((screenWidth - horizontalPadding - totalSpacing) / columnCount)
    }

    var body: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(results) { result in
                ZStack(alignment: .topTrailing) {
                    GlassContentCard(
                        thumbnailURL: result.thumbnail,
                        title: result.title,
                        subtitle: resultSubtitle(result),
                        badge: result.contentType,
                        subtitleFlags: result.availableSubtitleLanguages?.map { SubtitleLanguages.flag(for: $0) },
                        aspectRatio: 2 / 3,
                        width: cardWidth
                    ) {
                        onNavigate(routeForResult(result))
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

    // MARK: - Helpers

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
        var aiLangs = Set<String>()
        if result.availableSubtitleLanguages?.contains("he") == true {
            aiLangs.insert("he")
        }
        if result.availableSubtitleLanguages?.contains("en") == true {
            aiLangs.insert("en")
        }
        return aiLangs
    }

    private func routeForResult(_ result: UnifiedSearchResult) -> Route {
        switch result.contentType {
        case "live":
            return .player(contentId: result.id, contentType: .live)
        case "radio":
            return .player(contentId: result.id, contentType: .radio)
        case "podcast":
            return .podcastDetail(showId: result.id)
        default:
            if result.isSeries == true {
                return .seriesDetail(seriesId: result.id)
            } else {
                return .movieDetail(movieId: result.id)
            }
        }
    }
}
