import BayitMedia
import Foundation
import Observation

/// ViewModel for the Audiobook detail screen - manages detail, playback state, and speed control
@MainActor
@Observable
final class AudiobookDetailViewModel {
    private(set) var audiobook: Audiobook?
    private(set) var isLoading = false
    private(set) var error: String?

    /// Saved progress from watch history (0-100).
    private(set) var savedProgress: Double = 0
    /// Saved position in seconds from watch history.
    private(set) var savedPosition: Double = 0

    /// Chapters parsed from embedded m4b metadata (used when backend has none).
    private(set) var embeddedChapters: [EmbeddedChapter] = []

    /// Whether the current audiobook uses embedded chapter markers.
    var hasEmbeddedChapters: Bool {
        (audiobook?.chapters ?? []).isEmpty && !embeddedChapters.isEmpty
    }

    /// Merged chapter list: backend chapters take priority, embedded as fallback.
    var effectiveChapters: [AudiobookChapter] {
        if let chapters = audiobook?.chapters, !chapters.isEmpty {
            return chapters
        }
        return embeddedChapters.map { embedded in
            AudiobookChapter(
                id: embedded.id,
                title: embedded.title,
                chapterNumber: embedded.chapterNumber,
                duration: embedded.formattedDuration,
                progress: nil,
                thumbnail: nil,
                streamUrl: nil,
                streamType: nil,
                startTime: embedded.startTime,
                endTime: embedded.endTime
            )
        }
    }

    var currentChapter: AudiobookChapter?
    var playbackSpeed: Float = 1.0
    var isPlaying = false

    private let repository: any AudiobookRepository
    private let mediaRepository: any MediaRepository
    private let audiobookId: String

    static let availableSpeeds: [Float] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

    init(audiobookId: String, repository: any AudiobookRepository, mediaRepository: any MediaRepository) {
        self.audiobookId = audiobookId
        self.repository = repository
        self.mediaRepository = mediaRepository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            audiobook = try await repository.fetchWithChapters(id: audiobookId)
            currentChapter = audiobook?.chapters?.first

            // If no backend chapters, try parsing from embedded m4b metadata
            if (audiobook?.chapters ?? []).isEmpty,
               let urlStr = audiobook?.streamUrl,
               let url = URL(string: urlStr)
            {
                embeddedChapters = await ChapterMetadataParser.parseChapters(from: url)
                if let first = effectiveChapters.first {
                    currentChapter = first
                }
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false

        // Fetch saved progress from watch history (non-blocking)
        await loadSavedProgress()
    }

    /// Load saved progress from the continue-watching history.
    private func loadSavedProgress() async {
        do {
            let history = try await mediaRepository.fetchContinueWatching()
            if let item = history.items.first(where: { $0.id == audiobookId }) {
                savedProgress = item.progress ?? 0
                savedPosition = item.position ?? 0
            }
        } catch {
            // Progress fetch is non-critical
        }
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

    // MARK: - Chapter Navigation

    // Index of the currently playing chapter in `effectiveChapters`.
    //
    // For embedded chapters, matches by comparing the current playback position
    // against each chapter's time range. For backend chapters, matches by content ID.
    #if os(tvOS)
        func currentChapterIndex(audioManager: TVAudioPlaybackManager, audiobook _: Audiobook) -> Int? {
            let chapters = effectiveChapters
            guard !chapters.isEmpty else { return nil }

            guard let activeId = audioManager.activeContentId else { return nil }
            return chapters.firstIndex { $0.id == activeId }
        }

        func canGoNextChapter(audioManager: TVAudioPlaybackManager, audiobook: Audiobook) -> Bool {
            guard let index = currentChapterIndex(audioManager: audioManager, audiobook: audiobook) else {
                return false
            }
            return index < effectiveChapters.count - 1
        }

        func canGoPreviousChapter(audioManager: TVAudioPlaybackManager, audiobook: Audiobook) -> Bool {
            guard let index = currentChapterIndex(audioManager: audioManager, audiobook: audiobook) else {
                return false
            }
            return index > 0
        }
    #else
        func currentChapterIndex(audioManager: AudioPlaybackManager, audiobook _: Audiobook) -> Int? {
            let chapters = effectiveChapters
            guard !chapters.isEmpty else { return nil }

            if hasEmbeddedChapters {
                let current = audioManager.currentTime
                return chapters.firstIndex { chapter in
                    guard let start = chapter.startTime, let end = chapter.endTime else { return false }
                    return current >= start && current < end
                }
            }

            guard let activeId = audioManager.activeContentId else { return nil }
            return chapters.firstIndex { $0.id == activeId }
        }

        func canGoNextChapter(audioManager: AudioPlaybackManager, audiobook: Audiobook) -> Bool {
            guard let index = currentChapterIndex(audioManager: audioManager, audiobook: audiobook) else {
                return false
            }
            return index < effectiveChapters.count - 1
        }

        func canGoPreviousChapter(audioManager: AudioPlaybackManager, audiobook: Audiobook) -> Bool {
            guard let index = currentChapterIndex(audioManager: audioManager, audiobook: audiobook) else {
                return false
            }
            return index > 0
        }
    #endif
}
