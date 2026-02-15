import BayitCore
import Foundation
import Observation

/// ViewModel for the Podcasts screen - manages shows, categories, and pagination
@MainActor
@Observable
final class PodcastsViewModel {
    private(set) var shows: [PodcastShow] = []
    private(set) var categories: [PodcastCategory] = []
    private(set) var isLoading = false
    private(set) var isLoadingMore = false
    private(set) var isSyncing = false
    private(set) var error: String?
    private(set) var currentPage = 1
    private(set) var hasMore = true

    var selectedCategory: String?

    private let repository: any PodcastRepository
    private let logger = BayitLogger(category: "Podcasts")
    private let pageSize = 20

    init(repository: any PodcastRepository) {
        self.repository = repository
    }

    @MainActor
    func loadInitial() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        currentPage = 1

        do {
            async let showsResult = repository.fetchPodcasts(
                category: selectedCategory,
                page: 1,
                limit: pageSize
            )
            async let categoriesResult = repository.fetchCategories()

            let (showsResponse, categoriesResponse) = try await (showsResult, categoriesResult)
            shows = showsResponse.shows
            categories = categoriesResponse.categories
            hasMore = showsResponse.page < showsResponse.pages
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func loadMore() async {
        guard !isLoadingMore, hasMore else { return }
        isLoadingMore = true

        let nextPage = currentPage + 1

        do {
            let response = try await repository.fetchPodcasts(
                category: selectedCategory,
                page: nextPage,
                limit: pageSize
            )
            shows.append(contentsOf: response.shows)
            currentPage = nextPage
            hasMore = response.page < response.pages
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoadingMore = false
    }

    @MainActor
    func filterByCategory(_ category: String?) async {
        selectedCategory = category
        currentPage = 1
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchPodcasts(
                category: category,
                page: 1,
                limit: pageSize
            )
            shows = response.shows
            hasMore = response.page < response.pages
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func removePodcast(id: String) async {
        do {
            try await repository.removeCustomPodcast(id: id)
            shows.removeAll { $0.id == id }
            logger.info("Podcast removed", context: ["id": id])
        } catch {
            self.error = "Failed to remove podcast"
            logger.error("Failed to remove podcast", error: error)
        }
    }

    @MainActor
    func refresh() async {
        isSyncing = true
        do {
            try await repository.refreshAllPodcasts()
            logger.info("Podcast sync completed")
        } catch {
            logger.warning("Podcast sync failed (non-fatal): \(error.localizedDescription)")
        }
        isSyncing = false
        await loadInitial()
    }
}
