#if os(iOS)
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Modal for adding a podcast via custom RSS URL.
struct AddPodcastView: View {
    @Environment(LocalizationManager.self) private var localization

    @State private var rssUrl = ""
    @State private var isLoading = false
    @State private var error: String?
    @State private var success = false

    let repository: any PodcastRepository
    let onDismiss: () -> Void
    let onAdded: () -> Void

    private let logger = BayitLogger(category: "AddPodcast")

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            header

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("podcasts.rssUrl"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)

                TextField("https://feeds.example.com/podcast.xml", text: $rssUrl)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .textContentType(.URL)
                    .keyboardType(.URL)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                    .padding(DesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                    .submitLabel(.done)
                    .onSubmit { Task { await addPodcast() } }
            }

            if let error {
                Text(error)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
            }

            if success {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(DesignTokens.Success.default)
                    Text(localization.t("podcasts.addedSuccess"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Success.default)
                }
            }

            GlassButton(localization.t("podcasts.addPodcast"), variant: .primary, size: .large) {
                Task { await addPodcast() }
            }
            .disabled(rssUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)

            Spacer()
        }
        .padding(DesignTokens.Spacing.xl)
        .background(DesignTokens.Background.primary)
    }

    private var header: some View {
        HStack {
            Text(localization.t("podcasts.addPodcast"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
            Button { onDismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
    }

    private func addPodcast() async {
        let url = rssUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !url.isEmpty else { return }
        guard url.hasPrefix("http://") || url.hasPrefix("https://") else {
            error = "Please enter a valid URL starting with https://"
            return
        }

        isLoading = true
        error = nil
        success = false

        do {
            try await repository.addCustomPodcast(rssUrl: url)
            success = true
            logger.info("Custom podcast added", context: ["url": url])
            try? await Task.sleep(for: .seconds(1))
            onAdded()
            onDismiss()
        } catch {
            self.error = "Failed to add podcast. Please check the URL."
            logger.error("Failed to add custom podcast", error: error)
        }

        isLoading = false
    }
}
#endif
