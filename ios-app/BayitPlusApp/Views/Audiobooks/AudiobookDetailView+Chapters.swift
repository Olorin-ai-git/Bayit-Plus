import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

// MARK: - Chapter List

extension AudiobookDetailView {
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
            : isChapterPlaying(chapter, vm: vm)
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
                        Text(localization.t("audiobooks.durationMin", ["count": "\(durationMinutes)"]))
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
}
