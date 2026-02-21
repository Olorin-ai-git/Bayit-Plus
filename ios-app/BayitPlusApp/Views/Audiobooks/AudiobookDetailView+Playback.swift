import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

// MARK: - Playback Controls & Chapters

extension AudiobookDetailView {
    func playbackControls(_ audiobook: Audiobook) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(
                isAudiobookPlaying(audiobook) ? "Pause" : "Play",
                variant: .primary,
                size: .large
            ) {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                playAudiobook(audiobook)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func chapterList(_ audiobook: Audiobook) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if let chapters = audiobook.chapters, !chapters.isEmpty {
                Text(localization.t("audiobooks.chapters"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .padding(.horizontal, DesignTokens.Spacing.lg)

                ForEach(chapters, id: \.stableId) { chapter in
                    chapterRow(chapter, audiobook: audiobook)
                }
            }
        }
    }

    func chapterRow(_ chapter: AudiobookChapter, audiobook: Audiobook) -> some View {
        let isActive = isChapterPlaying(chapter)

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

                if chapter.streamUrl != nil {
                    Button {
                        let generator = UIImpactFeedbackGenerator(style: .light)
                        generator.impactOccurred()
                        playChapter(chapter, audiobook: audiobook)
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

    func playAudiobook(_ audiobook: Audiobook) {
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
    }

    func playChapter(_ chapter: AudiobookChapter, audiobook: Audiobook) {
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
    }
}
