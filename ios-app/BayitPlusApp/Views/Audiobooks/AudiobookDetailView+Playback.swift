import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

// MARK: - Playback Controls & Chapters

extension AudiobookDetailView {
    func playbackControls(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            transportBar(audiobook, vm: vm)
            speedPicker(vm: vm)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Transport Bar

    private func transportBar(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) -> some View {
        let playing = isAudiobookPlaying(audiobook)
        let canPrev = vm.canGoPreviousChapter(audioManager: audioManager, audiobook: audiobook)
        let canNext = vm.canGoNextChapter(audioManager: audioManager, audiobook: audiobook)

        return HStack(spacing: DesignTokens.Spacing.lg) {
            transportButton(
                icon: "backward.end.fill",
                size: 22,
                disabled: !canPrev
            ) {
                skipToPreviousChapter(audiobook, vm: vm)
            }

            transportButton(icon: "gobackward.15", size: 28) {
                skipBackward(audiobook)
            }

            transportButton(
                icon: playing ? "pause.circle.fill" : "play.circle.fill",
                size: 48
            ) {
                playAudiobook(audiobook, vm: vm)
            }

            transportButton(icon: "goforward.30", size: 28) {
                skipForward(audiobook)
            }

            transportButton(
                icon: "forward.end.fill",
                size: 22,
                disabled: !canNext
            ) {
                skipToNextChapter(audiobook, vm: vm)
            }
        }
    }

    private func transportButton(
        icon: String,
        size: CGFloat,
        disabled: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            action()
        } label: {
            Image(systemName: icon)
                .font(.system(size: size))
                .foregroundColor(
                    disabled ? DesignTokens.Text.muted : DesignTokens.Primary.default
                )
        }
        .disabled(disabled)
    }

    // MARK: - Speed Picker

    private func speedPicker(vm: AudiobookDetailViewModel) -> some View {
        PlaybackSpeedControlView(currentSpeed: vm.playbackSpeed) { speed in
            audioManager.mediaPlayer.setRate(speed)
            vm.setSpeed(speed)
        }
    }

    func chapterList(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) -> some View {
        let chapters = vm.effectiveChapters
        let isEmbedded = vm.hasEmbeddedChapters

        return VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if !chapters.isEmpty {
                Text(localization.t("audiobooks.chapters"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .padding(.horizontal, DesignTokens.Spacing.lg)

                ForEach(chapters, id: \.stableId) { chapter in
                    chapterRow(chapter, audiobook: audiobook, isEmbedded: isEmbedded, vm: vm)
                }
            }
        }
    }

    func chapterRow(
        _ chapter: AudiobookChapter,
        audiobook: Audiobook,
        isEmbedded: Bool = false,
        vm: AudiobookDetailViewModel
    ) -> some View {
        let isActive = isEmbedded
            ? isEmbeddedChapterPlaying(chapter, audiobook: audiobook)
            : isChapterPlaying(chapter)
        let canPlay = chapter.streamUrl != nil || isEmbedded

        return GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(chapter.title ?? "Chapter")
                        .font(.system(
                            size: DesignTokens.FontSize.md,
                            weight: isActive ? .semibold : .regular
                        ))
                        .foregroundColor(
                            isActive ? DesignTokens.Primary.default : DesignTokens.Text.primary
                        )

                    if let duration = chapter.duration {
                        Text(duration)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                    } else if let start = chapter.startTime, let end = chapter.endTime {
                        let durationMinutes = Int((end - start) / 60)
                        Text("\(durationMinutes) min")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                }

                Spacer()

                if canPlay {
                    Button {
                        let generator = UIImpactFeedbackGenerator(style: .light)
                        generator.impactOccurred()
                        if isEmbedded {
                            playEmbeddedChapter(chapter, audiobook: audiobook, vm: vm)
                        } else {
                            playChapter(chapter, audiobook: audiobook, vm: vm)
                        }
                    } label: {
                        Image(systemName: isActive && audioManager.isPlaying
                            ? "pause.circle.fill"
                            : "play.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(DesignTokens.Primary.default)
                    }
                } else if isActive {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.system(size: 14))
                        .foregroundColor(DesignTokens.Primary.default)
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Playback Helpers

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

        // Play first chapter if available, otherwise play the audiobook itself
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

    /// Check if an embedded chapter is currently playing by matching audiobook ID
    /// and comparing the current playback position against the chapter time range.
    func isEmbeddedChapterPlaying(_ chapter: AudiobookChapter, audiobook: Audiobook) -> Bool {
        guard audioManager.activeContentId == audiobook.id, audioManager.isActive else {
            return false
        }
        guard let start = chapter.startTime, let end = chapter.endTime else { return false }
        let current = audioManager.currentTime
        return current >= start && current < end
    }

    /// Play an embedded chapter by loading the parent audiobook's stream URL
    /// and seeking to the chapter's start time.
    func playEmbeddedChapter(_ chapter: AudiobookChapter, audiobook: Audiobook, vm: AudiobookDetailViewModel) {
        guard let start = chapter.startTime else { return }
        audioManager.setChapters(vm.effectiveChapters, audiobook: audiobook, isEmbedded: true)

        // If this audiobook is already loaded, just seek to the chapter
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

        // Load the parent audiobook's stream URL and seek after playback starts
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

        // Seek to chapter start once playback begins
        Task {
            // Wait for the player to be ready
            try? await Task.sleep(for: .milliseconds(500))
            await audioManager.mediaPlayer.seek(to: start)
            audioManager.updateNowPlayingPosition()
        }
    }
}
