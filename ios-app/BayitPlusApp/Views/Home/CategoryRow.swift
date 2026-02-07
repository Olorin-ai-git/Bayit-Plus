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

            GlassCarousel(items: category.items, itemWidth: 160) { item in
                GlassContentCard(
                    thumbnailURL: item.thumbnail,
                    title: item.title,
                    subtitle: itemSubtitle(for: item),
                    badge: itemBadge(for: item),
                    aspectRatio: 2 / 3,
                    width: 160
                ) {
                    navigateToItem(item)
                }
            }
        }
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
