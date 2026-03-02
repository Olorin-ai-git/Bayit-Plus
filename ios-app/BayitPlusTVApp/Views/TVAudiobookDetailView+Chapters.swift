import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVAudiobookDetailView + Chapters & Helpers

extension TVAudiobookDetailView {
    func chapterList(_ chapters: [AudiobookChapter], vm: AudiobookDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("chapters.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            VStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(chapters.indices, id: \.self) { index in
                    chapterRow(chapters[index], index: index, vm: vm)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }
    }

    func chapterRow(_ chapter: AudiobookChapter, index: Int, vm: AudiobookDetailViewModel) -> some View {
        GlassCard {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Text("\(index + 1)")
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .frame(width: 80)

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text(chapter.title ?? "Chapter \(index + 1)")
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if let duration = chapter.duration {
                        Text(duration)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    } else if let startTime = chapter.startTime,
                              let endTime = chapter.endTime
                    {
                        Text(formatTimeRange(start: startTime, end: endTime))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                GlassButton(
                    "Play",
                    variant: .secondary,
                    size: .medium,
                    action: {
                        vm.selectChapter(chapter)
                        logger.info("Playing chapter", context: [
                            "audiobookId": audiobookId,
                            "chapterIndex": String(index),
                        ])
                        coordinator.presentPlayer(
                            contentId: audiobookId,
                            contentType: .audiobook
                        )
                    }
                )
                .frame(width: 200)
            }
            .padding(TVDesignTokens.Spacing.lg)
        }
        .tvCardStyle()
    }

    var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    func formatTimeRange(start: Double, end: Double) -> String {
        let duration = end - start
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }
}
