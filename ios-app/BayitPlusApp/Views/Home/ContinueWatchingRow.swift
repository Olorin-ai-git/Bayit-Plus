import BayitDesignSystem
import SwiftUI

/// Continue watching row with progress indicators
struct ContinueWatchingRow: View {
    let items: [ContinueWatchingItem]
    let coordinator: NavigationCoordinator

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("Continue Watching")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCarousel(items: items, itemWidth: 160) { item in
                VStack(spacing: 0) {
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

                    // Progress bar
                    if let progress = item.progress, progress > 0 {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Rectangle()
                                    .fill(DesignTokens.Glass.bgMedium)
                                    .frame(height: 4)

                                Rectangle()
                                    .fill(DesignTokens.Primary.p600)
                                    .frame(width: geo.size.width * CGFloat(progress / 100), height: 4)
                            }
                        }
                        .frame(height: 4)
                    }
                }
            }
        }
    }

    private func itemSubtitle(for item: ContinueWatchingItem) -> String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private func itemBadge(for item: ContinueWatchingItem) -> String? {
        if item.isSeries == true {
            if let count = item.totalEpisodes {
                return "\(count) Ep"
            }
            return "Series"
        }
        return nil
    }

    private func navigateToItem(_ item: ContinueWatchingItem) {
        if item.isSeries == true {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}
