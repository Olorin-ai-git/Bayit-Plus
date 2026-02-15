import Foundation
import Observation

/// ViewModel for the Favorites screen - manages favorited content list.
@MainActor
@Observable
final class FavoritesViewModel {
    private(set) var items: [FavoriteItem] = []
    private(set) var total: Int = 0
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var currentPage = 1

    private let repository: any UserRepository
    private let pageSize = 20

    init(repository: any UserRepository) {
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        currentPage = 1

        do {
            let response = try await repository.fetchFavorites(
                page: currentPage,
                limit: pageSize
            )
            items = response.items
            total = response.total ?? response.items.count
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func loadMore() async {
        guard !isLoading, items.count < total else { return }
        isLoading = true

        do {
            let nextPage = currentPage + 1
            let response = try await repository.fetchFavorites(
                page: nextPage,
                limit: pageSize
            )
            items.append(contentsOf: response.items)
            currentPage = nextPage
            total = response.total ?? total
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func removeFavorite(contentId: String) async {
        do {
            _ = try await repository.removeFavorite(contentId: contentId)
            items.removeAll { $0.contentId == contentId || $0.id == contentId }
            total = max(0, total - 1)
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
    }

    @MainActor
    func toggleFavorite(contentId: String, contentType: String?) async -> Bool? {
        do {
            let request = FavoriteToggleRequest(
                contentId: contentId,
                contentType: contentType
            )
            let response = try await repository.toggleFavorite(request: request)
            return response.isFavorite
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            return nil
        }
    }
}
