import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Standalone continue watching row that loads independently via .task.
/// Shows items with progress bars and time remaining.
/// Hides itself when the user has no in-progress content.
struct TVContinueWatchingRow: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    @State private var items: [WatchHistoryItem] = []
    @State private var hasLoaded = false

    var body: some View {
        Group {
            if hasLoaded && !items.isEmpty {
                TVContentSection(
                    title: localization.t("home.continueWatching"),
                    icon: "play.circle.fill",
                    items: items,
                    maxItems: 8,
                    seeAllAction: { coordinator.selectedTab = .profile }
                ) { item in
                    continueWatchingCard(item)
                }
            }
        }
        .task { await loadData() }
    }

    private func continueWatchingCard(_ item: WatchHistoryItem) -> some View {
        TVContentCard(
            imageURL: item.thumbnail,
            title: item.title ?? localization.t("common.untitled"),
            subtitle: remainingTimeText(item),
            progress: item.progress,
            aspectRatio: 16.0 / 9.0,
            placeholderIcon: "play.circle.fill"
        ) {
            let contentType = TVContentTypeMapper.map(item.type)
            if contentType == .vod {
                coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
            } else {
                coordinator.presentPlayer(
                    contentId: item.id,
                    contentType: contentType
                )
            }
        }
    }

    private func remainingTimeText(_ item: WatchHistoryItem) -> String? {
        guard let duration = item.duration,
              let progress = item.progress,
              duration > 0, progress > 0, progress < 100
        else { return item.type }
        let remainingSeconds = duration * (1.0 - progress / 100.0)
        let remainingMinutes = Int(remainingSeconds / 60)
        guard remainingMinutes > 0 else { return item.type }
        return localization.t(
            "home.minutesRemaining",
            ["minutes": String(remainingMinutes)]
        )
    }

    private func loadData() async {
        do {
            let response = try await repos.media.fetchContinueWatching()
            items = response.items
        } catch {
            items = []
        }
        hasLoaded = true
    }
}
