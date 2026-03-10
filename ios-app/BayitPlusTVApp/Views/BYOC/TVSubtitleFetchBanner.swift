#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Brief glass-styled banner shown on tvOS when subtitles
    /// are fetched for a Plex movie during enrichment/onboarding.
    struct TVSubtitleFetchBanner: View {
        let event: SubtitleFetchEvent
        let onDismiss: () -> Void

        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "captions.bubble.fill")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Primary.default)

                VStack(alignment: .leading, spacing: 4) {
                    Text(event.itemTitle)
                        .font(.system(
                            size: TVDesignTokens.FontSize.sm,
                            weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Text(languageBadges)
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .medium
                        ))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(
                RoundedRectangle(
                    cornerRadius: TVDesignTokens.Spacing.sm
                )
            )
            .overlay(
                RoundedRectangle(
                    cornerRadius: TVDesignTokens.Spacing.sm
                )
                .stroke(
                    DesignTokens.Primary.default.opacity(0.2),
                    lineWidth: 1
                )
            )
            .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
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

#endif
