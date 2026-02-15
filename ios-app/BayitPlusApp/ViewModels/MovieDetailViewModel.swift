import Foundation
import Observation

/// ViewModel for the Movie Detail screen - manages content detail, related items
@MainActor
@Observable
final class MovieDetailViewModel {
    private(set) var detail: ContentDetail?
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any ContentRepository
    let movieId: String

    init(movieId: String, repository: any ContentRepository) {
        self.movieId = movieId
        self.repository = repository
    }

    @MainActor
    func loadDetail() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            detail = try await repository.fetchContentDetail(id: movieId)
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
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
