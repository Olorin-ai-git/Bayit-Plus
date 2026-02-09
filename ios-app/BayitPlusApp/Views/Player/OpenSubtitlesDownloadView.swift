import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// OpenSubtitles fetch UI - downloads additional subtitle tracks from OpenSubtitles.org.
/// Mirrors web's SubtitleDownloadSection.tsx component.
struct OpenSubtitlesDownloadView: View {
    let contentId: String
    let repository: any SubtitleRepository
    let onSuccess: () -> Void

    @State private var isLoading = false
    @State private var result: ExternalSubtitleImportResponse?
    @State private var error: String?

    @Environment(LocalizationManager.self) private var localization

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
            "Download More Subtitles",
            variant: .secondary,
            size: .medium,
            icon: Image(systemName: "arrow.down.circle")
        ) {
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            Task { await downloadSubtitles() }
        }
        .accessibilityLabel("Download more subtitles from OpenSubtitles")
    }

    // MARK: - Loading View

    private var loadingView: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            ProgressView()
                .tint(DesignTokens.Primary.p400)

            Text("Searching OpenSubtitles...")
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

                Text("Imported \(imported.count) subtitle track\(imported.count == 1 ? "" : "s")")
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

                Text("Failed: \(failed.count)")
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

                Text("Skipped: \(skipped.count) (already exists)")
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
        Text("From OpenSubtitles.com")
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundStyle(DesignTokens.Text.muted)
    }

    // MARK: - Actions

    private func downloadSubtitles() async {
        isLoading = true
        error = nil
        result = nil

        do {
            let response = try await repository.fetchExternalSubtitles(contentId: contentId)
            result = response
            if response.imported?.isEmpty == false {
                onSuccess()
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
