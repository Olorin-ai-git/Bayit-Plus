import BayitDesignSystem
import SwiftUI

/// OpenSubtitles fetch UI for tvOS - downloads additional subtitle tracks from OpenSubtitles.org.
/// Optimized for 10-foot UI with proper focus targets and tvOS design tokens.
struct TVOpenSubtitlesDownloadView: View {
    let contentId: String
    let repository: any SubtitleRepository
    let onSuccess: () -> Void

    @State private var isLoading = false
    @State private var result: ExternalSubtitleImportResponse?
    @State private var error: String?

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
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
        Button {
            Task { await downloadSubtitles() }
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "arrow.down.circle")
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text("Download More Subtitles")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()
            }
            .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
        }
        .buttonStyle(.card)
        .accessibilityLabel("Download more subtitles from OpenSubtitles")
    }

    // MARK: - Loading View

    private var loadingView: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            ProgressView()
                .tint(DesignTokens.Primary.p400)
                .scaleEffect(1.2)

            Text("Searching OpenSubtitles...")
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
        .padding(TVDesignTokens.Spacing.lg)
    }

    // MARK: - Result View

    private func resultView(_ result: ExternalSubtitleImportResponse) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
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
        .padding(TVDesignTokens.Spacing.lg)
    }

    private func successSection(_ imported: [ImportedTrack]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(DesignTokens.Success.default)
                    .font(.system(size: 24))

                Text("Imported \(imported.count) subtitle track\(imported.count == 1 ? "" : "s")")
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
                        Text("(\(count) cues)")
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                .padding(.leading, TVDesignTokens.Spacing.lg)
            }
        }
    }

    private func failedSection(_ failed: [String]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(DesignTokens.Warning.default)
                    .font(.system(size: 24))

                Text("Failed: \(failed.count)")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            ForEach(failed, id: \.self) { language in
                Text("• \(language)")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .padding(.leading, TVDesignTokens.Spacing.lg)
            }
        }
    }

    private func skippedSection(_ skipped: [String]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "info.circle.fill")
                    .foregroundStyle(DesignTokens.Text.muted)
                    .font(.system(size: 24))

                Text("Skipped: \(skipped.count) (already exists)")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }

    // MARK: - Error View

    private func errorView(_ errorMessage: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .font(.system(size: 24))

            Text(errorMessage)
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(TVDesignTokens.Spacing.lg)
    }

    // MARK: - Attribution

    private var attributionText: some View {
        Text("From OpenSubtitles.com")
            .font(.system(size: TVDesignTokens.FontSize.sm))
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
            // Parse user-friendly error messages
            let errorDescription = error.localizedDescription
            if errorDescription.contains("quota") || errorDescription.contains("100 subtitles") {
                self.error = "OpenSubtitles daily quota reached (100/24h). Try again tomorrow."
            } else if errorDescription.contains("429") || errorDescription.contains("Too Many Requests") {
                self.error = "OpenSubtitles rate limit exceeded. Please wait and try again."
            } else if errorDescription.contains("decode") || errorDescription.contains("format") {
                self.error = "No additional subtitles found for this content."
            } else {
                self.error = errorDescription
            }
        }

        isLoading = false
    }
}
