import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Continue watching row with progress indicators
struct ContinueWatchingRow: View {
    @Environment(LocalizationManager.self) private var localization
    let items: [WatchHistoryItem]
    let coordinator: NavigationCoordinator

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("home.continueWatching"))
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

    private func itemSubtitle(for item: WatchHistoryItem) -> String? {
        var parts: [String] = []
        if let duration = item.duration {
            // Convert duration from seconds to readable format
            let hours = Int(duration) / 3600
            let minutes = (Int(duration) % 3600) / 60
            if hours > 0 {
                parts.append("\(hours)h \(minutes)m")
            } else {
                parts.append("\(minutes)m")
            }
        }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private func itemBadge(for item: WatchHistoryItem) -> String? {
        // Check if it's a series based on type
        if let type = item.type, type.contains("series") {
            return "Series"
        }
        return nil
    }

    private func navigateToItem(_ item: WatchHistoryItem) {
        // Determine navigation based on type
        if let type = item.type, type.contains("series") {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}
