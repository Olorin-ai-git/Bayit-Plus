import BayitCore
import Foundation
import Observation

/// ViewModel for the Podcast detail screen - manages show detail and episode list
@Observable
final class PodcastDetailViewModel {
    private(set) var detail: PodcastDetail?
    private(set) var episodes: [PodcastEpisodeItem] = []
    private(set) var isLoading = false
    private(set) var isLoadingMore = false
    private(set) var error: String?
    private(set) var currentPage = 1
    private(set) var totalPages = 1

    private let showId: String
    private let repository: any PodcastRepository
    private let logger = BayitLogger(category: "PodcastDetail")
    private let pageSize = 20

    init(showId: String, repository: any PodcastRepository) {
        self.showId = showId
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            detail = try await repository.fetchPodcastDetail(id: showId)
            let episodesResponse = try await repository.fetchEpisodes(
                showId: showId,
                page: 1,
                limit: pageSize
            )
            episodes = episodesResponse.episodes
            currentPage = episodesResponse.page
            totalPages = episodesResponse.pages
            logger.info("Podcast detail loaded", context: [
                "showId": showId,
                "episodeCount": String(episodesResponse.total)
            ])
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to load podcast detail", error: error)
        }

        isLoading = false
    }

    @MainActor
    func loadMore() async {
        guard !isLoadingMore, currentPage < totalPages else { return }
        isLoadingMore = true

        do {
            let nextPage = currentPage + 1
            let response = try await repository.fetchEpisodes(
                showId: showId,
                page: nextPage,
                limit: pageSize
            )
            episodes.append(contentsOf: response.episodes)
            currentPage = response.page
            totalPages = response.pages
        } catch {
            logger.error("Failed to load more episodes", error: error)
        }

        isLoadingMore = false
    }

    @MainActor
    func refresh() async {
        currentPage = 1
        episodes = []
        await load()
    }
}
