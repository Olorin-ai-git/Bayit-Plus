import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Personalized recommendations row based on trending topics and user behavior.
/// Fetches from TrendingRepository.fetchRecommendations() and displays
/// as a standard horizontal content card row. Hides when empty.
struct TVRecommendedRow: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    @State private var items: [ContentItem] = []
    @State private var hasLoaded = false

    private let maxItems = 10

    var body: some View {
        Group {
            if hasLoaded && !items.isEmpty {
                TVContentSection(
                    title: localization.t("home.recommended"),
                    icon: "sparkles",
                    items: items,
                    maxItems: maxItems
                ) { item in
                    recommendedCard(item)
                }
            }
        }
        .task { await loadData() }
    }

    private func recommendedCard(_ item: ContentItem) -> some View {
        TVContentCard(
            imageURL: item.thumbnail,
            title: item.title ?? localization.t("common.untitled"),
            subtitle: item.category,
            aspectRatio: 2.0 / 3.0,
            placeholderIcon: contentIcon(for: item),
            availableSubtitleLanguages: item.availableSubtitleLanguages
        ) {
            navigateToItem(item)
        }
    }

    private func navigateToItem(_ item: ContentItem) {
        let ct = item.type?.lowercased() ?? ""
        if ct == "series" {
            coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
        } else if ct == "collection" || item.isCollectionParent == true {
            coordinator.fullscreenRoute = .collectionDetail(collectionId: item.id)
        } else if ct == "podcast" || ct == "podcast_episode" {
            coordinator.fullscreenRoute = .podcastDetail(showId: item.id)
        } else if ct == "audiobook" || ct == "audiobook_chapter" {
            coordinator.fullscreenRoute = .audiobookDetail(audiobookId: item.id)
        } else {
            coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
        }
    }

    private func contentIcon(for item: ContentItem) -> String {
        switch item.type?.lowercased() {
        case "series": return "tv.fill"
        case "podcast", "podcast_episode": return "mic.fill"
        case "audiobook", "audiobook_chapter": return "headphones"
        default: return "film"
        }
    }

    private func loadData() async {
        do {
            items = try await repos.trendingRepo.fetchRecommendations(
                limit: maxItems
            )
        } catch {
            items = []
        }
        hasLoaded = true
    }
}
