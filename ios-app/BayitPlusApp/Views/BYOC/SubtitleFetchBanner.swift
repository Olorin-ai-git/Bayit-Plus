import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Brief glass-styled banner shown when subtitles are fetched
/// for a Plex movie during enrichment/onboarding.
struct SubtitleFetchBanner: View {
    let event: SubtitleFetchEvent
    let onDismiss: () -> Void

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "captions.bubble.fill")
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Primary.default)

            VStack(alignment: .leading, spacing: 2) {
                Text(event.itemTitle)
                    .font(.system(
                        size: DesignTokens.FontSize.sm,
                        weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                Text(languageBadges)
                    .font(.system(
                        size: DesignTokens.FontSize.xs,
                        weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }

            Spacer()

            Button {
                onDismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .frame(width: 20, height: 20)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .glassBackground()
        .clipShape(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        )
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .stroke(
                    DesignTokens.Primary.default.opacity(0.2),
                    lineWidth: 1
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .transition(
            .move(edge: .top).combined(with: .opacity)
        )
        .task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            withAnimation(.easeOut(duration: 0.3)) {
                onDismiss()
            }
        }
    }

    private var languageBadges: String {
        let badges = event.languages.compactMap {
            SubtitleLanguages.info(for: $0)
        }.map { $0.name }
        guard !badges.isEmpty else {
            return localization.t("byoc.subtitlesReady")
        }
        let joined = badges.joined(separator: ", ")
        return localization.t(
            "byoc.subtitlesAttached",
            ["languages": joined]
        )
    }
}
