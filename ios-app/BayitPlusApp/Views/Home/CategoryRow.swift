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
                GlassContentCard(
                    thumbnailURL: item.thumbnail,
                    title: item.title,
                    subtitle: itemSubtitle(for: item),
                    badge: itemBadge(for: item),
                    subtitleFlags: item.availableSubtitleLanguages?.map { SubtitleLanguages.flag(for: $0) },
                    aspectRatio: itemAspectRatio(for: item),
                    width: itemWidth
                ) {
                    navigateToItem(item)
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

    private func navigateToItem(_ item: ContentItem) {
        if item.isSeries == true {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}
