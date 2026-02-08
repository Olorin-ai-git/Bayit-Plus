import BayitDesignSystem
import SwiftUI

/// Spotlight carousel showing featured content items
struct SpotlightSection: View {
    let items: [SpotlightItem]
    let coordinator: NavigationCoordinator

    var body: some View {
        GlassCarousel(items: items, itemWidth: 300) { item in
            GlassContentCard(
                thumbnailURL: item.backdrop ?? item.thumbnail,
                title: item.title,
                subtitle: spotlightSubtitle(for: item),
                badge: item.isSeries == true ? "Series" : nil,
                aspectRatio: 16 / 9,
                width: 300
            ) {
                navigateToItem(item)
            }
        }
    }

    private func spotlightSubtitle(for item: SpotlightItem) -> String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        if let rating = item.rating { parts.append(rating.value) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private func navigateToItem(_ item: SpotlightItem) {
        if item.isSeries == true {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}
