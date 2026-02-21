import BayitDesignSystem
import BayitLocalization
import SwiftUI
#if os(iOS)
    import UIKit
#endif

/// OpenSubtitles fetch UI - downloads additional subtitle tracks from OpenSubtitles.org.
/// Mirrors web's SubtitleDownloadSection.tsx component.
/// Cross-platform: works on both iOS and tvOS.
struct OpenSubtitlesDownloadView: View {
    let contentId: String
    let repository: any SubtitleRepository
    let onSuccess: () -> Void

    @State var isLoading = false
    @State var result: ExternalSubtitleImportResponse?
    @State var error: String?

    @Environment(LocalizationManager.self) var localization

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if result == nil && error == nil {
                downloadButton
            } else if isLoading {
                loadingView
            } else if let result = result {
                resultView(result)
            } else if let error = error {
                errorView(error)
            }

            attributionText
        }
    }

    // MARK: - Download Button

    private var downloadButton: some View {
        GlassButton(
            localization.t("subtitles.downloadMore"),
            variant: .secondary,
            size: .medium,
            icon: Image(systemName: "arrow.down.circle")
        ) {
            #if os(iOS)
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            #endif
            Task { await downloadSubtitles() }
        }
        .accessibilityLabel("Download more subtitles from OpenSubtitles")
    }

    // MARK: - Loading View

    private var loadingView: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            ProgressView()
                .tint(DesignTokens.Primary.p400)

            Text(localization.t("subtitles.searchingOpenSubs"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .padding(DesignTokens.Spacing.md)
    }

    // MARK: - Result View

    private func resultView(_ result: ExternalSubtitleImportResponse) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if let imported = result.imported, !imported.isEmpty {
                successSection(imported)
            }

            if let failed = result.failed, !failed.isEmpty {
                failedSection(failed)
            }

            if let skipped = result.skipped, !skipped.isEmpty {
                skippedSection(skipped)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bg)
        .cornerRadius(DesignTokens.Radius.md)
    }

    private func successSection(_ imported: [ImportedTrack]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(DesignTokens.Success.default)
                    .font(.system(size: 16))

                Text(localization.t("subtitles.imported", ["count": "\(imported.count)"]))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            ForEach(imported, id: \.language) { track in
                HStack {
                    Text(SubtitleLanguages.emojiFlag(for: track.language))
                    Text(track.languageName ?? track.language)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                    if let count = track.cueCount {
                        Text("(\(count) cues)")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                .padding(.leading, DesignTokens.Spacing.md)
            }
        }
    }

    private func failedSection(_ failed: [String]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(DesignTokens.Warning.default)
                    .font(.system(size: 16))

                Text(localization.t("subtitles.failed", ["count": "\(failed.count)"]))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            ForEach(failed, id: \.self) { language in
                Text("• \(language)")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .padding(.leading, DesignTokens.Spacing.md)
            }
        }
    }

    private func skippedSection(_ skipped: [String]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "info.circle.fill")
                    .foregroundStyle(DesignTokens.Text.muted)
                    .font(.system(size: 16))

                Text(localization.t("subtitles.skipped", ["count": "\(skipped.count)"]))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }

    // MARK: - Error View

    private func errorView(_ errorMessage: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .font(.system(size: 16))

            Text(errorMessage)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.ErrorColor.default.opacity(0.1))
        .cornerRadius(DesignTokens.Radius.md)
    }

    // MARK: - Attribution

    private var attributionText: some View {
        Text(localization.t("subtitles.fromOpenSubs"))
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundStyle(DesignTokens.Text.muted)
    }
}
