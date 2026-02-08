import Foundation
import Observation

/// ViewModel for the Playlist screen - manages user playlist items.
/// The backend returns all playlist items in a single response (no pagination).
@Observable
final class PlaylistViewModel {
    private(set) var items: [PlaylistItem] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any UserRepository

    init(repository: any UserRepository) {
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchPlaylist()
            items = response.items
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func removeItem(contentId: String) async {
        do {
            _ = try await repository.removePlaylistItem(contentId: contentId)
            items.removeAll { $0.contentId == contentId }
        } catch {
            self.error = error.localizedDescription
        }
    }

    @MainActor
    func reorderItem(contentId: String, newPosition: Int) async {
        do {
            let request = PlaylistReorderRequest(
                contentId: contentId,
                newPosition: newPosition
            )
            _ = try await repository.reorderPlaylist(request: request)
        } catch {
            self.error = error.localizedDescription
        }
    }

    @MainActor
    func toggleItem(contentId: String, contentType: String?) async -> Bool? {
        do {
            let request = PlaylistToggleRequest(
                contentType: contentType
            )
            let response = try await repository.togglePlaylistItem(
                contentId: contentId,
                request: request
            )
            return response.inPlaylist
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }
}
