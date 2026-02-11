#if os(tvOS)
import BayitCore
import BayitDesignSystem
import SwiftUI

/// tvOS modal for adding a podcast via custom RSS URL.
struct TVAddPodcastView: View {

    @State private var rssUrl = ""
    @State private var isLoading = false
    @State private var error: String?
    @State private var success = false

    let repository: any PodcastRepository
    let onDismiss: () -> Void
    let onAdded: () -> Void

    private let logger = BayitLogger(category: "TVAddPodcast")

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()

            Text("Add Podcast")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("Enter the RSS feed URL for your podcast")
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)

            TextField("https://feeds.example.com/podcast.xml", text: $rssUrl)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .submitLabel(.done)
                .onSubmit { Task { await addPodcast() } }
                .frame(maxWidth: 600)

            if let error {
                Text(error)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
            }

            if success {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(DesignTokens.Success.default)
                    Text("Podcast added")
                        .foregroundStyle(DesignTokens.Success.default)
                }
            }

            HStack(spacing: TVDesignTokens.Spacing.lg) {
                GlassButton("Add", variant: .primary, size: .large) {
                    Task { await addPodcast() }
                }
                .tvFocusStyle()
                .disabled(rssUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)

                GlassButton("Cancel", variant: .secondary, size: .large) { onDismiss() }
                    .tvFocusStyle()
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
    }

    private func addPodcast() async {
        let url = rssUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !url.isEmpty else { return }
        guard url.hasPrefix("http://") || url.hasPrefix("https://") else {
            error = "Please enter a valid URL"
            return
        }

        isLoading = true
        error = nil
        success = false

        do {
            try await repository.addCustomPodcast(rssUrl: url)
            success = true
            logger.info("Custom podcast added via tvOS", context: ["url": url])
            try? await Task.sleep(for: .seconds(1))
            onAdded()
            onDismiss()
        } catch {
            self.error = "Failed to add podcast"
            logger.error("Failed to add custom podcast", error: error)
        }

        isLoading = false
    }
}
#endif
