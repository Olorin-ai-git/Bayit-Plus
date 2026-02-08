import Foundation
import Observation

/// ViewModel for chapter navigation - manages chapters and tracks the active chapter based on playback time
@Observable
final class ChapterNavigationViewModel {
    private(set) var chapters: [Chapter] = []
    private(set) var activeChapter: Chapter?
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any ChapterRepository

    init(repository: any ChapterRepository) {
        self.repository = repository
    }

    @MainActor
    func loadChapters(contentId: String) async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            chapters = try await repository.fetchChapters(contentId: contentId)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func loadLiveChapters(channelId: String) async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            chapters = try await repository.fetchLiveChapters(channelId: channelId)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func updateActiveChapter(currentTime: Double) {
        activeChapter = chapters.last { chapter in
            let start = chapter.startTime ?? 0
            return currentTime >= start
        }
    }
}
