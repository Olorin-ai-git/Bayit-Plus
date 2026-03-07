import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Mixed row of featured podcasts and audiobooks for the tvOS home screen.
/// Loads from both PodcastRepository and AudiobookRepository in parallel,
/// interleaves results, and displays as a horizontal shelf.
struct TVAudioPicksRow: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    @State private var audioItems: [AudioPickItem] = []
    @State private var hasLoaded = false

    private let maxItems = 10

    var body: some View {
        Group {
            if hasLoaded && !audioItems.isEmpty {
                TVContentSection(
                    title: localization.t("home.audioPicks"),
                    icon: "waveform",
                    items: audioItems,
                    maxItems: maxItems,
                    seeAllAction: { coordinator.selectedTab = .podcasts }
                ) { item in
                    audioPickCard(item)
                }
            }
        }
        .task { await loadData() }
    }

    private func audioPickCard(_ item: AudioPickItem) -> some View {
        TVContentCard(
            imageURL: item.imageURL,
            title: item.title,
            subtitle: item.subtitle,
            badge: item.badge,
            aspectRatio: 1.0,
            placeholderIcon: item.icon
        ) {
            navigateToItem(item)
        }
    }

    private func navigateToItem(_ item: AudioPickItem) {
        switch item.kind {
        case .podcast:
            coordinator.fullscreenRoute = .podcastDetail(showId: item.id)
        case .audiobook:
            coordinator.fullscreenRoute = .audiobookDetail(audiobookId: item.id)
        }
    }

    private func loadData() async {
        async let podcastsTask = loadPodcasts()
        async let audiobooksTask = loadAudiobooks()
        let (podcasts, audiobooks) = await (podcastsTask, audiobooksTask)
        audioItems = interleave(podcasts, audiobooks)
        hasLoaded = true
    }

    private func loadPodcasts() async -> [AudioPickItem] {
        do {
            let response = try await repos.podcasts.fetchPodcasts(
                category: nil, page: 1, limit: 6
            )
            return response.shows.map { show in
                AudioPickItem(
                    id: show.id,
                    kind: .podcast,
                    title: show.title ?? localization.t("common.untitled"),
                    subtitle: show.author,
                    imageURL: show.cover,
                    icon: "mic.fill",
                    badge: nil
                )
            }
        } catch {
            return []
        }
    }

    private func loadAudiobooks() async -> [AudioPickItem] {
        do {
            let response = try await repos.audiobook.fetchAll(
                page: 1, pageSize: 6, genre: nil, author: nil
            )
            return (response.items ?? []).map { book in
                AudioPickItem(
                    id: book.id,
                    kind: .audiobook,
                    title: book.title ?? localization.t("common.untitled"),
                    subtitle: book.author,
                    imageURL: book.thumbnail,
                    icon: "headphones",
                    badge: nil
                )
            }
        } catch {
            return []
        }
    }

    /// Interleave podcast and audiobook items for a mixed shelf experience.
    private func interleave(
        _ first: [AudioPickItem],
        _ second: [AudioPickItem]
    ) -> [AudioPickItem] {
        var result: [AudioPickItem] = []
        let maxCount = max(first.count, second.count)
        for i in 0 ..< maxCount {
            if i < first.count { result.append(first[i]) }
            if i < second.count { result.append(second[i]) }
        }
        return result
    }
}

// MARK: - Audio Pick Item Model

/// Unified item model for the mixed audio picks row.
struct AudioPickItem: Identifiable, Sendable {
    enum Kind: Sendable { case podcast, audiobook }

    let id: String
    let kind: Kind
    let title: String
    let subtitle: String?
    let imageURL: String?
    let icon: String
    let badge: String?
}
