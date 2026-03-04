import BayitDesignSystem
import BayitMedia
import Foundation
import SwiftUI

// MARK: - Playback Actions & Chapter Navigation

extension AudiobookDetailView {
    // MARK: - Playback State

    func isAudiobookPlaying(_ audiobook: Audiobook) -> Bool {
        audioManager.activeContentId == audiobook.id && audioManager.isActive
    }

    func isChapterPlaying(_ chapter: AudiobookChapter) -> Bool {
        guard let chapterId = chapter.id else { return false }
        return audioManager.activeContentId == chapterId && audioManager.isActive
    }

    func playAudiobook(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) {
        if isAudiobookPlaying(audiobook) {
            audioManager.togglePlayPause()
            return
        }

        if let firstChapter = audiobook.chapters?.first,
           let urlStr = firstChapter.streamUrl,
           let url = URL(string: urlStr)
        {
            let coverURL = audiobook.thumbnail.flatMap { URL(string: $0) }
            audioManager.playDirectURL(
                url: url,
                title: firstChapter.title ?? audiobook.title ?? "",
                subtitle: audiobook.author,
                artworkURL: coverURL,
                contentId: firstChapter.id ?? audiobook.id,
                contentType: .audiobook
            )
        } else {
            audioManager.play(contentId: audiobook.id, contentType: .audiobook)
        }
        audioManager.setChapters(vm.effectiveChapters, audiobook: audiobook, isEmbedded: vm.hasEmbeddedChapters)
    }

    func playChapter(_ chapter: AudiobookChapter, audiobook: Audiobook, vm: AudiobookDetailViewModel) {
        if isChapterPlaying(chapter) {
            audioManager.togglePlayPause()
            return
        }

        guard let urlStr = chapter.streamUrl,
              let url = URL(string: urlStr) else { return }

        let coverURL = audiobook.thumbnail.flatMap { URL(string: $0) }
        audioManager.playDirectURL(
            url: url,
            title: chapter.title ?? "Chapter",
            subtitle: audiobook.title,
            artworkURL: coverURL,
            contentId: chapter.id ?? audiobook.id,
            contentType: .audiobook
        )
        audioManager.setChapters(vm.effectiveChapters, audiobook: audiobook, isEmbedded: false)
    }

    // MARK: - Skip Controls

    func skipForward(_ audiobook: Audiobook) {
        guard isAudiobookPlaying(audiobook) else { return }
        Task {
            await audioManager.mediaPlayer.skipForward(seconds: 30)
            audioManager.updateNowPlayingPosition()
        }
    }

    func skipBackward(_ audiobook: Audiobook) {
        guard isAudiobookPlaying(audiobook) else { return }
        Task {
            await audioManager.mediaPlayer.skipBackward(seconds: 15)
            audioManager.updateNowPlayingPosition()
        }
    }

    // MARK: - Chapter Navigation

    func skipToNextChapter(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) {
        let chapters = vm.effectiveChapters
        guard let index = vm.currentChapterIndex(audioManager: audioManager, audiobook: audiobook),
              index < chapters.count - 1
        else { return }

        let next = chapters[index + 1]
        vm.selectChapter(next)

        if vm.hasEmbeddedChapters {
            playEmbeddedChapter(next, audiobook: audiobook, vm: vm)
        } else {
            playChapter(next, audiobook: audiobook, vm: vm)
        }
    }

    func skipToPreviousChapter(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) {
        let chapters = vm.effectiveChapters
        guard let index = vm.currentChapterIndex(audioManager: audioManager, audiobook: audiobook),
              index > 0
        else { return }

        let prev = chapters[index - 1]
        vm.selectChapter(prev)

        if vm.hasEmbeddedChapters {
            playEmbeddedChapter(prev, audiobook: audiobook, vm: vm)
        } else {
            playChapter(prev, audiobook: audiobook, vm: vm)
        }
    }

    // MARK: - Embedded Chapter Playback (m4b)

    func isEmbeddedChapterPlaying(_ chapter: AudiobookChapter, audiobook: Audiobook) -> Bool {
        guard audioManager.activeContentId == audiobook.id, audioManager.isActive else {
            return false
        }
        guard let start = chapter.startTime, let end = chapter.endTime else { return false }
        let current = audioManager.currentTime
        return current >= start && current < end
    }

    func playEmbeddedChapter(_ chapter: AudiobookChapter, audiobook: Audiobook, vm: AudiobookDetailViewModel) {
        guard let start = chapter.startTime else { return }
        audioManager.setChapters(vm.effectiveChapters, audiobook: audiobook, isEmbedded: true)

        if audioManager.activeContentId == audiobook.id, audioManager.isActive {
            if isEmbeddedChapterPlaying(chapter, audiobook: audiobook),
               audioManager.isPlaying
            {
                audioManager.togglePlayPause()
                return
            }
            Task {
                await audioManager.mediaPlayer.seek(to: start)
                if !audioManager.isPlaying {
                    audioManager.mediaPlayer.play()
                }
                audioManager.updateNowPlayingPosition()
            }
            return
        }

        guard let urlStr = audiobook.streamUrl,
              let url = URL(string: urlStr) else { return }

        let coverURL = audiobook.thumbnail.flatMap { URL(string: $0) }
        audioManager.playDirectURL(
            url: url,
            title: chapter.title ?? audiobook.title ?? "",
            subtitle: audiobook.author,
            artworkURL: coverURL,
            contentId: audiobook.id,
            contentType: .audiobook
        )

        Task {
            try? await Task.sleep(for: .milliseconds(500))
            await audioManager.mediaPlayer.seek(to: start)
            audioManager.updateNowPlayingPosition()
        }
    }
}
