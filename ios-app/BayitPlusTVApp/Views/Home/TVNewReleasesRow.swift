import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Recently added content row for the tvOS home screen.
/// Fetches the latest content page and displays as a horizontal shelf.
/// Hides itself when no new content is available.
struct TVNewReleasesRow: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    @State private var items: [ContentItem] = []
    @State private var hasLoaded = false

    private let pageSize = 15

    var body: some View {
        Group {
            if hasLoaded && !items.isEmpty {
                TVContentSection(
                    title: localization.t("home.newReleases"),
                    icon: "sparkle",
                    items: items,
                    maxItems: pageSize
                ) { item in
                    newReleaseCard(item)
                }
            }
        }
        .task { await loadData() }
    }

    private func newReleaseCard(_ item: ContentItem) -> some View {
        TVContentCard(
            imageURL: item.thumbnail,
            title: item.title ?? localization.t("common.untitled"),
            subtitle: subtitleText(for: item),
            badge: item.type?.lowercased() == "series"
                ? localization.t("home.series") : nil,
            aspectRatio: 2.0 / 3.0,
            placeholderIcon: contentIcon(for: item),
            availableSubtitleLanguages: item.availableSubtitleLanguages
        ) {
            navigateToItem(item)
        }
    }

    private func subtitleText(for item: ContentItem) -> String? {
        var parts: [String] = []
        if let year = item.year {
            parts.append(String(year))
        }
        if let category = item.category {
            parts.append(category)
        }
        return parts.isEmpty ? item.type : parts.joined(separator: " | ")
    }

    private func navigateToItem(_ item: ContentItem) {
        let ct = item.type?.lowercased() ?? ""
        if ct == "series" {
            coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
        } else if ct == "collection" || item.isCollectionParent == true {
            coordinator.fullscreenRoute = .collectionDetail(collectionId: item.id)
        } else {
            coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
        }
    }

    private func contentIcon(for item: ContentItem) -> String {
        switch item.type?.lowercased() {
        case "series": return "tv.fill"
        case "collection": return "rectangle.stack.fill"
        default: return "film"
        }
    }

    private func loadData() async {
        do {
            let response = try await repos.content.fetchAllContent(
                page: 1,
                limit: pageSize
            )
            items = response.items
        } catch {
            items = []
        }
        hasLoaded = true
    }
}
