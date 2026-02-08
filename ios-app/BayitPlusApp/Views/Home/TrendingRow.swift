import BayitDesignSystem
import SwiftUI

/// Trending content row (What's Hot in Israel)
struct TrendingRow: View {
    let items: [TrendingItem]
    let coordinator: NavigationCoordinator

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("What's Hot in Israel")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCarousel(items: items, itemWidth: 160) { item in
                GlassContentCard(
                    thumbnailURL: item.thumbnail,
                    title: item.title,
                    subtitle: trendingSubtitle(for: item),
                    badge: trendingBadge(for: item),
                    aspectRatio: 2 / 3,
                    width: 160
                ) {
                    navigateToItem(item)
                }
            }
        }
    }

    private func trendingSubtitle(for item: TrendingItem) -> String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private func trendingBadge(for item: TrendingItem) -> String? {
        if item.isSeries == true {
            if let count = item.totalEpisodes {
                return "\(count) Ep"
            }
            return "Series"
        }
        return nil
    }

    private func navigateToItem(_ item: TrendingItem) {
        if item.isSeries == true {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}
