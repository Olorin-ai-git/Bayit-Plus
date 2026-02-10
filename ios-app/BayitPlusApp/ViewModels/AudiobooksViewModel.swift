import Foundation
import Observation

/// ViewModel for the Audiobooks listing screen - manages paginated list with genre/author filters
@Observable
final class AudiobooksViewModel {
    private(set) var items: [Audiobook] = []
    private(set) var isLoading = false
    private(set) var isLoadingMore = false
    private(set) var error: String?
    private(set) var currentPage = 1
    private(set) var hasMore = true

    var selectedGenre: String?
    var selectedAuthor: String?

    private let repository: any AudiobookRepository
    private let pageSize = 20

    init(repository: any AudiobookRepository) {
        self.repository = repository
    }

    @MainActor
    func loadInitial() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        currentPage = 1

        do {
            let response = try await repository.fetchAll(
                page: 1,
                limit: pageSize,
                genre: selectedGenre,
                author: selectedAuthor
            )
            items = response.items ?? []
            let pages = response.totalPages ?? 1
            hasMore = currentPage < pages
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func loadMore() async {
        guard !isLoadingMore, hasMore else { return }
        isLoadingMore = true

        let nextPage = currentPage + 1

        do {
            let response = try await repository.fetchAll(
                page: nextPage,
                limit: pageSize,
                genre: selectedGenre,
                author: selectedAuthor
            )
            items.append(contentsOf: response.items ?? [])
            currentPage = nextPage
            let pages = response.totalPages ?? 1
            hasMore = currentPage < pages
        } catch {
            self.error = error.localizedDescription
        }

        isLoadingMore = false
    }

    @MainActor
    func filterByGenre(_ genre: String?) async {
        selectedGenre = genre
        await loadInitial()
    }

    @MainActor
    func filterByAuthor(_ author: String?) async {
        selectedAuthor = author
        await loadInitial()
    }

    @MainActor
    func refresh() async {
        await loadInitial()
    }
}
