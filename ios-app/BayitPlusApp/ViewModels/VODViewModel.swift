import Foundation
import Observation

/// ViewModel for the VOD screen - manages movies/series grid with pagination
@Observable
final class VODViewModel {
    private(set) var items: [ContentItem] = []
    private(set) var isLoading = false
    private(set) var isLoadingMore = false
    private(set) var error: String?
    private(set) var currentPage = 1
    private(set) var hasMore = true

    var selectedType: String?

    private let repository: any ContentRepository
    private let pageSize = 20

    init(repository: any ContentRepository) {
        self.repository = repository
    }

    @MainActor
    func loadContent() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        currentPage = 1

        do {
            let response = try await repository.fetchAllContent(
                page: currentPage,
                limit: pageSize
            )
            items = response.items
            hasMore = response.page < (response.total / pageSize + 1)
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
            let response = try await repository.fetchAllContent(
                page: nextPage,
                limit: pageSize
            )
            items.append(contentsOf: response.items)
            currentPage = nextPage
            hasMore = response.page < (response.total / pageSize + 1)
        } catch {
            self.error = error.localizedDescription
        }

        isLoadingMore = false
    }

    @MainActor
    func refresh() async {
        error = nil
        currentPage = 1
        isLoading = true

        do {
            let response = try await repository.fetchAllContent(
                page: 1,
                limit: pageSize
            )
            items = response.items
            hasMore = response.page < (response.total / pageSize + 1)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
