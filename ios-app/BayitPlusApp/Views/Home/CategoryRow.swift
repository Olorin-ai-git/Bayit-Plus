import BayitDesignSystem
import SwiftUI

/// A horizontal row of content cards for a category on the home screen
struct CategoryRow: View {
    let category: ContentCategory
    let coordinator: NavigationCoordinator

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(category.name)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCarousel(items: category.items, itemWidth: itemWidth) { item in
                ZStack(alignment: .topTrailing) {
                    GlassContentCard(
                        thumbnailURL: item.thumbnail,
                        title: item.title,
                        subtitle: itemSubtitle(for: item),
                        badge: itemBadge(for: item),
                        subtitleFlags: item.availableSubtitleLanguages?.map { SubtitleLanguages.flag(for: $0) },
                        aspectRatio: itemAspectRatio(for: item),
                        width: itemWidth,
                        placeholderIcon: placeholderIcon(for: item)
                    ) {
                        navigateToItem(item)
                    }

                    if let languages = item.availableSubtitleLanguages, !languages.isEmpty {
                        SubtitleFlagsPill(
                            languages: languages,
                            aiLanguages: aiLanguages(for: item),
                            size: .small
                        )
                        .padding(DesignTokens.Spacing.xs)
                    }
                }
            }
        }
    }

    /// Determine item width based on content type
    /// Podcasts and audiobooks use smaller square cards (140px), movies/series use portrait cards (160px)
    private var itemWidth: CGFloat {
        let categoryNameLower = category.name.lowercased()
        if categoryNameLower.contains("podcast") || categoryNameLower.contains("audiobook") {
            return 140
        }
        return 160
    }

    /// Determine aspect ratio based on content type
    /// Podcasts and audiobooks use 1:1 (square), movies/series use 2:3 (portrait)
    private func itemAspectRatio(for item: ContentItem) -> CGFloat {
        if let type = item.type?.lowercased() {
            if type.contains("podcast") || type.contains("audiobook") {
                return 1.0  // Square
            }
        }
        // Check category name as fallback
        let categoryNameLower = category.name.lowercased()
        if categoryNameLower.contains("podcast") || categoryNameLower.contains("audiobook") {
            return 1.0  // Square
        }
        return 2.0 / 3.0  // Portrait (default for movies/series)
    }

    private func itemSubtitle(for item: ContentItem) -> String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private func itemBadge(for item: ContentItem) -> String? {
        if item.isSeries == true {
            if let count = item.totalEpisodes {
                return "\(count) Ep"
            }
            return "Series"
        }
        return nil
    }

    private func aiLanguages(for item: ContentItem) -> Set<String> {
        var aiLangs = Set<String>()
        // Assume Hebrew and English may have AI versions if available
        // In production, this would check actual subtitle metadata
        if item.availableSubtitleLanguages?.contains("he") == true {
            aiLangs.insert("he")
        }
        if item.availableSubtitleLanguages?.contains("en") == true {
            aiLangs.insert("en")
        }
        return aiLangs
    }

    private func placeholderIcon(for item: ContentItem) -> ContentPlaceholderIcon {
        if item.isSeries == true {
            return .series
        }
        if let type = item.type?.lowercased() {
            if type.contains("podcast") { return .podcast }
            if type.contains("audiobook") { return .audiobook }
            if type.contains("radio") { return .radio }
            if type.contains("live") { return .live }
        }
        let name = category.name.lowercased()
        if name.contains("series") { return .series }
        if name.contains("podcast") { return .podcast }
        if name.contains("audiobook") { return .audiobook }
        if name.contains("radio") { return .radio }
        if name.contains("live") { return .live }
        return .movie
    }

    private func navigateToItem(_ item: ContentItem) {
        if item.isSeries == true {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}
