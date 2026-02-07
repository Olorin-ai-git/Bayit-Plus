import Foundation
import Observation

/// ViewModel for the Playlist screen - manages user playlist items.
@Observable
final class PlaylistViewModel {
    private(set) var items: [PlaylistItem] = []
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
            let response = try await repository.fetchPlaylist(
                page: currentPage,
                limit: pageSize
            )
            items = response.items
            total = response.total ?? response.items.count
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func loadMore() async {
        guard !isLoading, items.count < total else { return }
        isLoading = true

        do {
            let nextPage = currentPage + 1
            let response = try await repository.fetchPlaylist(
                page: nextPage,
                limit: pageSize
            )
            items.append(contentsOf: response.items)
            currentPage = nextPage
            total = response.total ?? total
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func removeItem(contentId: String) async {
        do {
            _ = try await repository.removePlaylistItem(contentId: contentId)
            items.removeAll { $0.contentId == contentId || $0.id == contentId }
            total = max(0, total - 1)
        } catch {
            self.error = error.localizedDescription
        }
    }

    @MainActor
    func reorder(itemIds: [String]) async {
        do {
            let request = PlaylistReorderRequest(itemIds: itemIds)
            _ = try await repository.reorderPlaylist(request: request)
        } catch {
            self.error = error.localizedDescription
        }
    }

    @MainActor
    func toggleItem(contentId: String, contentType: String?) async -> Bool? {
        do {
            let request = PlaylistToggleRequest(
                contentId: contentId,
                contentType: contentType
            )
            let response = try await repository.togglePlaylistItem(request: request)
            return response.inPlaylist
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }
}
