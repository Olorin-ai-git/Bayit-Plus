import BayitDesignSystem
import SwiftUI

/// Spotlight carousel showing featured content items
struct SpotlightSection: View {
    let items: [SpotlightItem]
    let coordinator: NavigationCoordinator

    var body: some View {
        GlassCarousel(items: items, itemWidth: 300) { item in
            ZStack(alignment: .topTrailing) {
                GlassContentCard(
                    thumbnailURL: item.backdrop ?? item.thumbnail,
                    title: item.title,
                    subtitle: spotlightSubtitle(for: item),
                    badge: item.isSeries == true ? "Series" : nil,
                    subtitleFlags: item.availableSubtitleLanguages?.map { SubtitleLanguages.flag(for: $0) },
                    aspectRatio: 16 / 9,
                    width: 300,
                    onTap: {
                        navigateToItem(item)
                    }
                )

                if let languages = item.availableSubtitleLanguages, !languages.isEmpty {
                    SubtitleFlagsPill(
                        languages: languages,
                        aiLanguages: aiLanguages(for: item),
                        size: .medium
                    )
                    .padding(DesignTokens.Spacing.sm)
                }
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

    private func aiLanguages(for item: SpotlightItem) -> Set<String> {
        var aiLangs = Set<String>()
        if item.availableSubtitleLanguages?.contains("he") == true {
            aiLangs.insert("he")
        }
        if item.availableSubtitleLanguages?.contains("en") == true {
            aiLangs.insert("en")
        }
        return aiLangs
    }

    private func navigateToItem(_ item: SpotlightItem) {
        if item.isSeries == true {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else {
            let contentType = ContentType(rawValue: item.type ?? "") ?? .movie
            coordinator.presentFullscreen(.player(contentId: item.id, contentType: contentType))
        }
    }
}
