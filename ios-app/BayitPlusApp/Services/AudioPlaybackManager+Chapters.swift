import Foundation

/// Chapter navigation methods for AudioPlaybackManager.
///
/// Registers chapter metadata when audiobook playback starts, and exposes
/// `skipToNextChapter`, `skipToPreviousChapter`, and `playChapter` so the
/// MiniAudioPlayerBar can navigate chapters without the detail view being visible.
extension AudioPlaybackManager {
    // MARK: - Chapter Registration

    func setChapters(_ chapters: [AudiobookChapter], audiobook: Audiobook, isEmbedded: Bool) {
        activeChapters = chapters
        activeAudiobook = audiobook
        isEmbeddedChapters = isEmbedded
    }

    func clearChapters() {
        activeChapters = []
        activeAudiobook = nil
        isEmbeddedChapters = false
    }

    // MARK: - Current Chapter

    var currentChapterIndex: Int? {
        guard !activeChapters.isEmpty else { return nil }
        if isEmbeddedChapters {
            let current = currentTime
            return activeChapters.firstIndex {
                guard let start = $0.startTime, let end = $0.endTime else { return false }
                return current >= start && current < end
            }
        }
        guard let id = activeContentId else { return nil }
        return activeChapters.firstIndex { $0.id == id }
    }

    var canGoNextChapter: Bool {
        guard let idx = currentChapterIndex else { return false }
        return idx < activeChapters.count - 1
    }

    var canGoPreviousChapter: Bool {
        guard let idx = currentChapterIndex else { return false }
        return idx > 0
    }

    // MARK: - Navigation

    func skipToNextChapter() {
        guard let idx = currentChapterIndex, idx < activeChapters.count - 1 else { return }
        playChapter(activeChapters[idx + 1])
    }

    func skipToPreviousChapter() {
        guard let idx = currentChapterIndex, idx > 0 else { return }
        playChapter(activeChapters[idx - 1])
    }

    /// Plays a chapter directly — handles both per-chapter stream URLs and embedded m4b seeking.
    func playChapter(_ chapter: AudiobookChapter) {
        guard let book = activeAudiobook else { return }

        if isEmbeddedChapters {
            guard let start = chapter.startTime else { return }
            if activeContentId == book.id, isActive {
                Task {
                    await mediaPlayer.seek(to: start)
                    if !isPlaying { mediaPlayer.play() }
                    updateNowPlayingPosition()
                }
            }
        } else {
            guard let urlStr = chapter.streamUrl, let url = URL(string: urlStr) else { return }
            let cover = book.thumbnail.flatMap { URL(string: $0) }
            playDirectURL(
                url: url,
                title: chapter.title ?? "Chapter",
                subtitle: book.title,
                artworkURL: cover,
                contentId: chapter.id ?? book.id,
                contentType: .audiobook
            )
        }
    }
}
