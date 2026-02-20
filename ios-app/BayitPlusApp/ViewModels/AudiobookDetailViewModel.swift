import Foundation
import Observation

/// ViewModel for the Audiobook detail screen - manages detail, playback state, and speed control
@MainActor
@Observable
final class AudiobookDetailViewModel {
    private(set) var audiobook: Audiobook?
    private(set) var isLoading = false
    private(set) var error: String?

    var currentChapter: AudiobookChapter?
    var playbackSpeed: Float = 1.0
    var isPlaying = false

    private let repository: any AudiobookRepository
    private let audiobookId: String

    static let availableSpeeds: [Float] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

    init(audiobookId: String, repository: any AudiobookRepository) {
        self.audiobookId = audiobookId
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            audiobook = try await repository.fetchWithChapters(id: audiobookId)
            currentChapter = audiobook?.chapters?.first
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func selectChapter(_ chapter: AudiobookChapter) {
        currentChapter = chapter
    }

    @MainActor
    func setSpeed(_ speed: Float) {
        playbackSpeed = speed
    }

    @MainActor
    func togglePlayback() {
        isPlaying.toggle()
    }
}
