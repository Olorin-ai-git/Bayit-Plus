import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Result Sections

extension TVOpenSubtitlesDownloadView {
    func successSection(_ imported: [ImportedTrack]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(DesignTokens.Success.default)
                    .font(.system(size: 24))

                Text(localization.t("subtitles.imported", ["count": "\(imported.count)"]))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            ForEach(imported, id: \.language) { track in
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Text(SubtitleLanguages.emojiFlag(for: track.language))
                        .font(.system(size: 20))

                    Text(track.languageName ?? track.language)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)

                    if let count = track.cueCount {
                        Text(localization.t("subtitles.cuesCount", ["count": "\(count)"]))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                .padding(.leading, TVDesignTokens.Spacing.lg)
            }
        }
    }

    func failedSection(_ failed: [FailedTrack]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(DesignTokens.Warning.default)
                    .font(.system(size: 24))

                Text(localization.t("subtitles.failed", ["count": "\(failed.count)"]))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            ForEach(failed, id: \.language) { track in
                Text(localization.t("subtitles.failedReason", ["language": track.language, "reason": track.reason ?? localization.t("common.unknown")]))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .padding(.leading, TVDesignTokens.Spacing.lg)
            }
        }
    }

    func skippedSection(_ skipped: [String]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "info.circle.fill")
                    .foregroundStyle(DesignTokens.Text.muted)
                    .font(.system(size: 24))

                Text(localization.t("subtitles.skipped", ["count": "\(skipped.count)"]))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }
}
