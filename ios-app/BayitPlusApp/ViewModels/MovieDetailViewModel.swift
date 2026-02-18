import Foundation
import Observation

/// ViewModel for the Movie Detail screen - manages content detail, related items, favorites
@MainActor
@Observable
final class MovieDetailViewModel {
    private(set) var detail: ContentDetail?
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isFavorite = false
    private(set) var isFavoriteLoading = false

    private let repository: any ContentRepository
    private let userRepository: any UserRepository
    let movieId: String

    init(movieId: String, repository: any ContentRepository, userRepository: any UserRepository) {
        self.movieId = movieId
        self.repository = repository
        self.userRepository = userRepository
    }

    @MainActor
    func loadDetail() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            async let detailTask = repository.fetchContentDetail(id: movieId)
            async let favoriteTask: Void = loadFavoriteStatus()
            detail = try await detailTask
            await favoriteTask
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func toggleFavorite() async {
        isFavoriteLoading = true
        let previousState = isFavorite
        isFavorite.toggle() // Optimistic update

        do {
            let response = try await userRepository.toggleFavorite(
                request: FavoriteToggleRequest(contentId: movieId, contentType: "vod")
            )
            isFavorite = response.isFavorite ?? !previousState
        } catch {
            isFavorite = previousState // Revert on error
        }

        isFavoriteLoading = false
    }

    @MainActor
    private func loadFavoriteStatus() async {
        do {
            let response = try await userRepository.checkFavorite(contentId: movieId)
            isFavorite = response.isFavorite ?? false
        } catch {
            // Silently fail - favorites check is non-critical
        }
    }

    var relatedItems: [RelatedItem] {
        detail?.related ?? []
    }

    var hasTrailer: Bool {
        detail?.trailerUrl != nil
    }

    var hasSubtitles: Bool {
        detail?.hasSubtitles == true
    }

    var subtitleLanguages: [String] {
        detail?.availableSubtitleLanguages ?? []
    }
}
